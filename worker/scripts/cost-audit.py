#!/usr/bin/env python3
"""
cost-audit.py — Modal cost baseline (facts only, no attribution).

Two measured sources:
  1. Modal billing — docs/modal-billing/*.json (per-app × day)
  2. Supabase jobs table — sum(phase_timings.modal_cost) for completed jobs per day

Reports the gap between the two. Does NOT attribute the gap to any cause
(crons, CPU functions, retries, image pull) without direct measurement.
Those require Modal tag instrumentation or dashboard lookup.

Usage:
  python worker/scripts/cost-audit.py

Requires .env.local with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ENV_FILE = REPO_ROOT / ".env.local"
BILLING_DIR = REPO_ROOT / "docs" / "modal-billing"
DOCS_OUT = REPO_ROOT / "docs" / "cost-baseline.md"

PROD_APP_ID = "ap-tWF8hmB2tAxyNlT6yzU9SD"  # stem-splitter (prod)


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, _, v = line.partition("=")
        env[k.strip()] = v.strip().strip('"').strip("'")
    return env


def supabase_get(url: str, service_key: str, path: str, params: dict[str, str]) -> list[dict]:
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(
        f"{url}/rest/v1/{path}?{qs}",
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Accept": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def load_modal_billing() -> list[dict]:
    """Load all Modal billing entries from JSON files in docs/modal-billing/."""
    entries: list[dict] = []
    for f in sorted(BILLING_DIR.glob("*.json")):
        entries.extend(json.loads(f.read_text()))
    return entries


def modal_by_app_day(entries: list[dict]) -> dict[str, dict[str, float]]:
    """{app_id: {date: cost}}"""
    out: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for e in entries:
        app_id = e["Object ID"]
        date = e["Interval Start"][:10]
        out[app_id][date] += float(e["Cost"])
    return out


def modal_prod_by_day(entries: list[dict]) -> dict[str, float]:
    out: dict[str, float] = defaultdict(float)
    for e in entries:
        if e["Object ID"] != PROD_APP_ID:
            continue
        date = e["Interval Start"][:10]
        out[date] += float(e["Cost"])
    return dict(out)


def modal_non_prod_by_day(entries: list[dict]) -> dict[str, float]:
    out: dict[str, float] = defaultdict(float)
    for e in entries:
        if e["Object ID"] == PROD_APP_ID:
            continue
        date = e["Interval Start"][:10]
        out[date] += float(e["Cost"])
    return dict(out)


def fetch_jobs_for_dates(url: str, key: str, dates: list[str]) -> list[dict]:
    """Fetch completed jobs whose completed_at falls in [min(dates), max(dates)+1day) UTC."""
    if not dates:
        return []
    start = sorted(dates)[0] + "T00:00:00Z"
    end_date = datetime.strptime(sorted(dates)[-1], "%Y-%m-%d")
    end = end_date.replace(tzinfo=timezone.utc).strftime("%Y-%m-%dT23:59:59Z")
    cols = "id,user_id,status,completed_at,created_at,duration_seconds,phase_timings,cold_start,error_code,file_name,batch_id"
    rows: list[dict] = []
    offset = 0
    page = 1000
    while True:
        chunk = supabase_get(
            url, key, "jobs",
            {
                "select": cols,
                "created_at": f"gte.{start}",
                "created_at": f"lte.{end}",
                "order": "created_at.asc",
                "limit": str(page),
                "offset": str(offset),
            },
        )
        # Note: urlencode dedups keys; for a proper range we do two filters:
        # do it manually
        break
    # Redo with proper range filter
    rows = []
    offset = 0
    while True:
        qs = urllib.parse.urlencode({
            "select": cols,
            "order": "created_at.asc",
            "limit": str(page),
            "offset": str(offset),
        })
        url_full = f"{url}/rest/v1/jobs?{qs}&created_at=gte.{start}&created_at=lte.{end}"
        req = urllib.request.Request(
            url_full,
            headers={
                "apikey": key,
                "Authorization": f"Bearer {key}",
                "Accept": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            chunk = json.loads(resp.read())
        if not chunk:
            break
        rows.extend(chunk)
        if len(chunk) < page:
            break
        offset += page
    return rows


def supabase_by_day(jobs: list[dict]) -> dict[str, dict]:
    """Group jobs by UTC day of `created_at`. Returns per-day stats.

    Tracks separately:
    - tracked_cost_usd: total modal_cost (gpu + idle combined) per day
    - tracked_gpu_cost_usd: modal_cost_gpu only (wall × rate, productive GPU time)
    - tracked_idle_cost_usd: modal_cost_idle only (scaledown 30s × rate, non-productive)
    - cold / warm split of jobs (via phase_timings.cold field from worker)
    """
    out: dict[str, dict] = defaultdict(lambda: {
        "jobs_total": 0,
        "jobs_completed": 0,
        "jobs_failed": 0,
        "tracked_cost_usd": 0.0,
        "tracked_gpu_cost_usd": 0.0,
        "tracked_idle_cost_usd": 0.0,
        "jobs_with_cost": 0,
        "jobs_missing_cost": 0,
        "jobs_cold": 0,
        "jobs_warm": 0,
    })
    for j in jobs:
        ts = j.get("created_at", "")
        date = ts[:10]
        s = out[date]
        s["jobs_total"] += 1
        status = j.get("status")
        if status == "completed":
            s["jobs_completed"] += 1
            pt = j.get("phase_timings") or {}
            if not isinstance(pt, dict):
                pt = {}
            cost = pt.get("modal_cost")
            gpu_cost = pt.get("modal_cost_gpu")
            idle_cost = pt.get("modal_cost_idle")
            if isinstance(cost, (int, float)):
                s["tracked_cost_usd"] += float(cost)
                s["jobs_with_cost"] += 1
                if isinstance(gpu_cost, (int, float)):
                    s["tracked_gpu_cost_usd"] += float(gpu_cost)
                if isinstance(idle_cost, (int, float)):
                    s["tracked_idle_cost_usd"] += float(idle_cost)
            else:
                s["jobs_missing_cost"] += 1
            # Cold/warm split: worker writes phase_timings.cold = 1 (cold) or 0 (warm)
            # Older jobs may use top-level cold_start boolean (pre-instrumentation).
            cold_flag = pt.get("cold")
            if cold_flag is None:
                cold_flag = 1 if j.get("cold_start") is True else 0
            if cold_flag:
                s["jobs_cold"] += 1
            else:
                s["jobs_warm"] += 1
        elif status == "failed":
            s["jobs_failed"] += 1
    return dict(out)


def fmt_usd(v: float) -> str:
    return f"${v:.4f}" if abs(v) < 10 else f"${v:.2f}"


def main() -> int:
    if not BILLING_DIR.exists():
        print(f"Missing {BILLING_DIR} — run `modal billing report --for 'this month' --json > ...`", file=sys.stderr)
        return 1

    env = load_env()
    sb_url = env.get("NEXT_PUBLIC_SUPABASE_URL") or env.get("SUPABASE_URL")
    sb_key = env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not sb_url or not sb_key:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local", file=sys.stderr)
        return 1

    # ── 1. Modal billing (measured) ──────────────────────────────────────────
    billing = load_modal_billing()
    prod_by_day = modal_prod_by_day(billing)
    nonprod_by_day = modal_non_prod_by_day(billing)
    by_app_day = modal_by_app_day(billing)

    all_dates = sorted(set(prod_by_day.keys()) | set(nonprod_by_day.keys()))
    prod_total = sum(prod_by_day.values())
    nonprod_total = sum(nonprod_by_day.values())
    grand_total = prod_total + nonprod_total

    # ── 2. Supabase jobs (measured) ──────────────────────────────────────────
    if not all_dates:
        print("No billing data loaded.", file=sys.stderr)
        return 1
    jobs = fetch_jobs_for_dates(sb_url, sb_key, all_dates)
    sb_by_day = supabase_by_day(jobs)

    # ── 3. Gap computation (arithmetic only, no attribution) ─────────────────
    R = "\033[0m"; BOLD = "\033[1m"; DIM = "\033[2m"
    GREEN = "\033[92m"; YELLOW = "\033[93m"; RED = "\033[91m"; CYAN = "\033[96m"

    print()
    print(f"{BOLD}Modal cost baseline (facts only){R}")
    print(f"{DIM}Billing source: docs/modal-billing/*.json — Supabase source: jobs table{R}")
    print("─" * 100)
    print()

    # App summary
    print(f"{BOLD}Per-app totals (billing period: {all_dates[0]} → {all_dates[-1]}){R}")
    apps_sorted = sorted(by_app_day.items(), key=lambda kv: sum(kv[1].values()), reverse=True)
    print(f"  {'app_id':<32}  {'description':<30}  {'total':>10}  days")
    for app_id, days in apps_sorted:
        total = sum(days.values())
        desc = next((e["Description"] for e in billing if e["Object ID"] == app_id), "?")
        days_count = len(days)
        marker = GREEN if app_id == PROD_APP_ID else DIM
        print(f"  {marker}{app_id:<32}{R}  {desc:<30}  {fmt_usd(total):>10}  {days_count}")
    print()
    print(f"  {BOLD}Prod app total: {GREEN}{fmt_usd(prod_total)}{R}")
    print(f"  Non-prod total (dev/bench/test): {YELLOW}{fmt_usd(nonprod_total)}{R}")
    print(f"  Grand total: {fmt_usd(grand_total)}")
    print()

    # Per-day prod comparison (with GPU/idle split and cold/warm breakdown)
    print(f"{BOLD}Prod app {PROD_APP_ID} — daily Modal vs Supabase-tracked{R}")
    print(f"  {'date':<12}  {'Modal $':>8}  {'Total':>8}  {'GPU':>8}  {'idle':>8}  {'gap':>8}  {'track%':>7}  {'C/W/F':>10}")
    prod_sorted_dates = sorted(prod_by_day.keys())
    total_modal = 0.0
    total_tracked = 0.0
    total_gpu = 0.0
    total_idle = 0.0
    total_completed = 0
    total_cold = 0
    total_warm = 0
    for date in prod_sorted_dates:
        m = prod_by_day[date]
        s = sb_by_day.get(date, {
            "jobs_completed": 0, "jobs_failed": 0, "tracked_cost_usd": 0.0,
            "tracked_gpu_cost_usd": 0.0, "tracked_idle_cost_usd": 0.0,
            "jobs_with_cost": 0, "jobs_missing_cost": 0,
            "jobs_cold": 0, "jobs_warm": 0,
        })
        tracked = s["tracked_cost_usd"]
        gpu = s["tracked_gpu_cost_usd"]
        idle = s["tracked_idle_cost_usd"]
        gap = m - tracked
        pct = (tracked / m * 100) if m > 0 else 0.0
        pct_color = GREEN if pct >= 70 else (YELLOW if pct >= 30 else RED)
        total_modal += m
        total_tracked += tracked
        total_gpu += gpu
        total_idle += idle
        total_completed += s["jobs_completed"]
        total_cold += s["jobs_cold"]
        total_warm += s["jobs_warm"]
        print(f"  {date:<12}  {fmt_usd(m):>8}  {fmt_usd(tracked):>8}  "
              f"{fmt_usd(gpu):>8}  {fmt_usd(idle):>8}  "
              f"{YELLOW}{fmt_usd(gap):>8}{R}  {pct_color}{pct:>5.1f}%{R}  "
              f"{s['jobs_cold']}/{s['jobs_warm']}/{s['jobs_failed']:<4}")
    overall_pct = (total_tracked / total_modal * 100) if total_modal > 0 else 0.0
    overall_gap = total_modal - total_tracked
    print(f"  {'─' * 94}")
    print(f"  {BOLD}{'TOTAL':<12}  {fmt_usd(total_modal):>8}  {fmt_usd(total_tracked):>8}  "
          f"{fmt_usd(total_gpu):>8}  {fmt_usd(total_idle):>8}  "
          f"{YELLOW}{fmt_usd(overall_gap):>8}{R}  {overall_pct:>5.1f}%{R}  "
          f"{total_cold}c/{total_warm}w/?f {R}({total_completed} total)")
    print()
    if total_tracked > 0:
        idle_share = (total_idle / total_tracked * 100)
        print(f"  {DIM}Idle cost share (scaledown 30s): {idle_share:.1f}% of tracked — i.e. {fmt_usd(total_idle)} paid for containers sitting warm after job end{R}")
        print(f"  {DIM}Cold/warm ratio: {total_cold} cold ({total_cold/max(total_cold+total_warm,1)*100:.0f}%) vs {total_warm} warm ({total_warm/max(total_cold+total_warm,1)*100:.0f}%){R}")
    print()

    # Jobs-level facts for the prod window
    with_cost = [j for j in jobs if j.get("status") == "completed"
                 and isinstance((j.get("phase_timings") or {}).get("modal_cost"), (int, float))]
    if with_cost:
        costs = sorted(float((j["phase_timings"] or {}).get("modal_cost", 0)) for j in with_cost)
        walls = sorted(float((j["phase_timings"] or {}).get("total_wall_time", 0)) for j in with_cost
                       if isinstance((j["phase_timings"] or {}).get("total_wall_time"), (int, float)))
        durations = sorted(float(j.get("duration_seconds") or 0) for j in with_cost if j.get("duration_seconds"))

        def p(arr: list[float], q: float) -> float:
            if not arr:
                return 0.0
            idx = int(round((len(arr) - 1) * q / 100))
            return arr[idx]

        print(f"{BOLD}Per-job distribution (Supabase, completed jobs only){R}")
        print(f"  tracked_cost_usd per job:  median={fmt_usd(p(costs, 50))}  p95={fmt_usd(p(costs, 95))}  max={fmt_usd(max(costs))}")
        if walls:
            print(f"  total_wall_time s per job: median={p(walls, 50):.1f}  p95={p(walls, 95):.1f}  max={max(walls):.1f}")
        cold = sum(1 for j in with_cost if j.get("cold_start") is True)
        print(f"  cold_start=true: {cold}/{len(with_cost)} ({cold/len(with_cost)*100:.1f}%)")
        if durations:
            print(f"  duration_seconds (audio): median={p(durations, 50):.0f}s  p95={p(durations, 95):.0f}s  max={max(durations):.0f}s")
        print()

    # Facts-only conclusion
    print(f"{BOLD}{CYAN}Facts established{R}")
    print(f"  • Modal prod spend over {len(prod_sorted_dates)} days: {GREEN}{fmt_usd(prod_total)}{R}")
    print(f"  • Supabase-tracked spend over same days: {fmt_usd(total_tracked)}")
    print(f"  • Gap (Modal − tracked): {YELLOW}{fmt_usd(overall_gap)}{R} = {overall_pct:.1f}% tracked, {100-overall_pct:.1f}% untracked")
    print()
    print(f"{BOLD}{CYAN}NOT established (would require instrumentation):{R}")
    print(f"  • What fraction of the gap comes from CPU functions (download_audio, url_info)")
    print(f"  • What fraction comes from cron jobs (yt_synthetic_probe, sweep_stale_jobs)")
    print(f"  • What fraction comes from container boot / image pull before _CONTAINER_BOOT_T")
    print(f"  • What fraction comes from failed/retried jobs not in Supabase")
    print(f"  → To attribute: add function tags + rerun `modal billing report --tag-names`")
    print()

    # ── 4. Markdown export ───────────────────────────────────────────────────
    md = []
    md.append(f"# Modal cost baseline — facts only")
    md.append("")
    md.append(f"Generated: {datetime.now(timezone.utc).isoformat()}")
    md.append(f"Billing window: **{all_dates[0]} → {all_dates[-1]}** ({len(all_dates)} days covered)")
    md.append("")
    md.append("## Sources")
    md.append("")
    md.append("1. **Modal billing** (`docs/modal-billing/*.json`, from `modal billing report --json`). Measured. Authoritative.")
    md.append("2. **Supabase `jobs.phase_timings.modal_cost`**. Estimated by the worker (wall+boot × H100 rate). Subset of completed jobs only.")
    md.append("")
    md.append("## Per-app totals")
    md.append("")
    md.append("| App ID | Description | Total |")
    md.append("|---|---|---|")
    for app_id, days in apps_sorted:
        total = sum(days.values())
        desc = next((e["Description"] for e in billing if e["Object ID"] == app_id), "?")
        md.append(f"| `{app_id}` | {desc} | {fmt_usd(total)} |")
    md.append("")
    md.append(f"- **Prod app total**: {fmt_usd(prod_total)}")
    md.append(f"- **Non-prod total** (dev/bench/test): {fmt_usd(nonprod_total)}")
    md.append(f"- **Grand total**: {fmt_usd(grand_total)}")
    md.append("")
    md.append(f"## Prod app `{PROD_APP_ID}` — daily Modal vs Supabase-tracked (with GPU/idle split)")
    md.append("")
    md.append("`GPU` = productive GPU time (wall × rate). `idle` = scaledown 30s per job × rate (container stays warm post-job, billed). `Total` = GPU + idle (the `modal_cost` self-report).")
    md.append("")
    md.append("| Date | Modal billing | Tracked total | GPU only | Idle (30s) | Gap | Tracked % | Cold/Warm/Failed |")
    md.append("|---|---:|---:|---:|---:|---:|---:|---:|")
    for date in prod_sorted_dates:
        m = prod_by_day[date]
        s = sb_by_day.get(date, {
            "jobs_completed": 0, "jobs_failed": 0, "tracked_cost_usd": 0.0,
            "tracked_gpu_cost_usd": 0.0, "tracked_idle_cost_usd": 0.0,
            "jobs_with_cost": 0, "jobs_missing_cost": 0,
            "jobs_cold": 0, "jobs_warm": 0,
        })
        tracked = s["tracked_cost_usd"]
        gpu = s["tracked_gpu_cost_usd"]
        idle = s["tracked_idle_cost_usd"]
        gap = m - tracked
        pct = (tracked / m * 100) if m > 0 else 0.0
        md.append(f"| {date} | {fmt_usd(m)} | {fmt_usd(tracked)} | {fmt_usd(gpu)} | {fmt_usd(idle)} | {fmt_usd(gap)} | {pct:.1f}% | {s['jobs_cold']}/{s['jobs_warm']}/{s['jobs_failed']} |")
    md.append(f"| **TOTAL** | **{fmt_usd(total_modal)}** | **{fmt_usd(total_tracked)}** | **{fmt_usd(total_gpu)}** | **{fmt_usd(total_idle)}** | **{fmt_usd(overall_gap)}** | **{overall_pct:.1f}%** | **{total_cold}/{total_warm}/?** ({total_completed}) |")
    md.append("")
    if total_tracked > 0:
        idle_share = (total_idle / total_tracked * 100)
        cold_share = total_cold / max(total_cold + total_warm, 1) * 100
        md.append(f"**Idle cost share**: {idle_share:.1f}% of tracked ({fmt_usd(total_idle)} paid for scaledown 30s after each job).")
        md.append(f"**Cold/warm ratio**: {total_cold} cold ({cold_share:.0f}%) vs {total_warm} warm ({100-cold_share:.0f}%). High cold % = user jobs arrive in isolation (container scales to 0 between users).")
        md.append("")
    md.append("## Facts established")
    md.append("")
    md.append(f"- Modal prod spend over {len(prod_sorted_dates)} days: **{fmt_usd(prod_total)}**")
    md.append(f"- Supabase-tracked spend over same days: **{fmt_usd(total_tracked)}**")
    md.append(f"- Gap: **{fmt_usd(overall_gap)}** = {overall_pct:.1f}% tracked, **{100-overall_pct:.1f}% untracked**")
    md.append("")
    md.append("## Open gaps (will close after 48h of post-deploy traffic)")
    md.append("")
    md.append("- Per-function attribution: Modal SDK v1.3.5 only supports tags at app-level. `env` and `version` tags are live (deploy `3b35c06-dirty`). Per-function cost breakdown available via Modal dashboard (Functions view) or indirectly via Supabase `phase_timings` (GPU jobs only).")
    md.append("- CPU function share (`download_audio`, `url_info`): not attributed per-job. Can estimate = Modal prod total − (GPU jobs Supabase-tracked × factor).")
    md.append("- Cron `yt_synthetic_probe` annualized cost: 24 runs/day × CPU rate ≈ $0.8/month. Visible in Modal dashboard under Functions tab.")
    md.append("- Failed / retried jobs not in Supabase `jobs` table: contribute to the gap.")
    md.append("- Container boot / image pull before `_CONTAINER_BOOT_T` (included in billing but not self-report for pre-2026-04-20 jobs — fixed in commit `7f6365f`).")
    md.append("")
    md.append("**Next recompute**: wait 48h of traffic with `env=prod version=<sha>` tags active, then rerun this script. The gap % should drop significantly as more jobs ship with `modal_cost_gpu + modal_cost_idle` populated.")
    md.append("")

    DOCS_OUT.parent.mkdir(parents=True, exist_ok=True)
    DOCS_OUT.write_text("\n".join(md))
    print(f"{BOLD}→ markdown written to {DOCS_OUT.relative_to(REPO_ROOT)}{R}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
