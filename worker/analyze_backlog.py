"""Analyze historical prod jobs from R2 to measure cold vs warm distribution.

Reads all ws-*/jobs/*.json files from R2 (read-only, no writes).
Extracts createdAt, completedAt, phase_timings, and computes:
  - % of jobs that are cold vs warm (inferred from sep_vocal_load_model duration)
  - Median/p95 total duration per preset
  - Phase breakdown across all completed jobs

Usage:
    python worker/analyze_backlog.py [--limit N] [--out report.json]
"""

import json
import os
import sys
import statistics
from pathlib import Path
from datetime import datetime


def _load_env_local():
    env_path = Path(__file__).parent.parent / ".env.local"
    if not env_path.exists():
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


_load_env_local()

import boto3

R2_BUCKET = os.environ.get("R2_BUCKET_NAME", "stem-splitter-storage")
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "")
R2_ACCESS_KEY = os.environ.get("R2_ACCESS_KEY_ID", "")
R2_SECRET_KEY = os.environ.get("R2_SECRET_ACCESS_KEY", "")


def _r2_client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
        aws_access_key_id=R2_ACCESS_KEY,
        aws_secret_access_key=R2_SECRET_KEY,
        region_name="auto",
    )


def list_all_job_keys(s3, prefix: str = "") -> list[str]:
    """List all job JSON keys in R2 under workspaces/ and legacy jobs/."""
    keys = []
    paginator = s3.get_paginator("list_objects_v2")

    for prefix in ["workspaces/", "jobs/"]:
        for page in paginator.paginate(Bucket=R2_BUCKET, Prefix=prefix):
            for obj in page.get("Contents", []):
                key = obj["Key"]
                if key.endswith(".json") and "/jobs/" in key:
                    keys.append(key)

    return keys


def read_job(s3, key: str) -> dict | None:
    try:
        resp = s3.get_object(Bucket=R2_BUCKET, Key=key)
        return json.loads(resp["Body"].read())
    except Exception:
        return None


def analyze(jobs: list[dict]) -> dict:
    """Compute aggregate metrics across all completed jobs."""
    completed = [j for j in jobs if j.get("status") == "completed" and j.get("createdAt") and j.get("completedAt")]
    all_jobs = [j for j in jobs if j.get("createdAt")]

    print(f"\nTotal jobs in R2:    {len(all_jobs)}")
    print(f"Completed jobs:      {len(completed)}")
    print(f"Failed/other:        {len(all_jobs) - len(completed)}")

    if not completed:
        return {}

    # Wall-clock durations (ms → s)
    durations = []
    for j in completed:
        dur_s = (j["completedAt"] - j["createdAt"]) / 1000
        if 5 < dur_s < 900:  # sanity filter
            durations.append(dur_s)

    print(f"\n=== Wall-clock duration (createdAt → completedAt) ===")
    if durations:
        print(f"  n={len(durations)}")
        print(f"  Median: {statistics.median(durations):.1f}s")
        print(f"  p95:    {sorted(durations)[int(len(durations) * 0.95)]:.1f}s")
        print(f"  Min:    {min(durations):.1f}s")
        print(f"  Max:    {max(durations):.1f}s")

    # Phase timings — jobs that have been instrumented
    instrumented = [j for j in completed if j.get("phase_timings")]
    print(f"\n=== Phase timings (instrumented jobs: {len(instrumented)}/{len(completed)}) ===")

    if instrumented:
        # Cold detection: if sep_vocal_load_model > 5s → cold start (model was not cached)
        # Warm: load_model is near-zero because it's already in VRAM
        cold_threshold_s = 5.0
        cold_jobs = [j for j in instrumented if j["phase_timings"].get("sep_vocal_load_model", 0) > cold_threshold_s]
        warm_jobs = [j for j in instrumented if j["phase_timings"].get("sep_vocal_load_model", 0) <= cold_threshold_s]

        pct_cold = 100 * len(cold_jobs) / len(instrumented) if instrumented else 0
        print(f"  Cold (load_model > {cold_threshold_s}s): {len(cold_jobs)} ({pct_cold:.0f}%)")
        print(f"  Warm (load_model ≤ {cold_threshold_s}s): {len(warm_jobs)} ({100-pct_cold:.0f}%)")

        # Phase medians across all instrumented jobs
        phase_keys = [
            "download_input", "wav24_transcode", "analyze_track",
            "sep_vocal_load_model", "sep_vocal_infer",
            "sep_instru_load_model", "sep_instru_infer",
            "merge_stems", "post_parallel",
            "upload_r2_total",
            "callback_nextjs", "total_wall_time",
        ]
        print("\n  Phase medians (all instrumented):")
        phase_medians = {}
        for k in phase_keys:
            vals = [j["phase_timings"][k] for j in instrumented if k in j["phase_timings"]]
            if vals:
                med = statistics.median(vals)
                phase_medians[k] = round(med, 2)
                print(f"    {k:30s} {med:6.1f}s  (n={len(vals)})")

        if warm_jobs:
            print("\n  Phase medians (warm only):")
            for k in phase_keys:
                vals = [j["phase_timings"][k] for j in warm_jobs if k in j["phase_timings"]]
                if vals:
                    print(f"    {k:30s} {statistics.median(vals):6.1f}s  (n={len(vals)})")

    # Breakdown by mode
    print("\n=== By mode ===")
    for mode in ["2stem", "4stem", "6stem"]:
        mode_jobs = [j for j in completed if j.get("mode") == mode]
        if mode_jobs:
            mode_durs = [(j["completedAt"] - j["createdAt"]) / 1000 for j in mode_jobs
                         if 5 < (j["completedAt"] - j["createdAt"]) / 1000 < 900]
            if mode_durs:
                print(f"  {mode}: n={len(mode_durs)} median={statistics.median(mode_durs):.1f}s")

    # Time distribution: jobs per day (last 30 days)
    print("\n=== Recent activity ===")
    now_ms = int(__import__("time").time() * 1000)
    recent = [j for j in all_jobs if now_ms - j["createdAt"] < 30 * 24 * 3600 * 1000]
    print(f"  Jobs in last 30 days: {len(recent)}")

    return {
        "total_jobs": len(all_jobs),
        "completed_jobs": len(completed),
        "median_duration_s": statistics.median(durations) if durations else None,
        "p95_duration_s": sorted(durations)[int(len(durations) * 0.95)] if durations else None,
        "instrumented_jobs": len(instrumented),
        "pct_cold": round(pct_cold, 1) if instrumented else None,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Analyze 44Stems R2 job backlog")
    parser.add_argument("--limit", type=int, default=0, help="Max jobs to read (0=all)")
    parser.add_argument("--out", default="", help="Write JSON report to this file")
    args = parser.parse_args()

    print("Connecting to R2...")
    s3 = _r2_client()

    print("Listing job keys...")
    keys = list_all_job_keys(s3)
    print(f"Found {len(keys)} job JSON files")

    if args.limit and args.limit < len(keys):
        print(f"Limiting to {args.limit} most recent keys")
        keys = keys[-args.limit:]

    jobs = []
    for i, key in enumerate(keys):
        if i % 50 == 0:
            print(f"  Reading {i}/{len(keys)}...", end="\r")
        job = read_job(s3, key)
        if job:
            jobs.append(job)

    print(f"\nLoaded {len(jobs)} job records")

    report = analyze(jobs)

    if args.out:
        with open(args.out, "w") as f:
            json.dump(report, f, indent=2)
        print(f"\nReport written to {args.out}")
