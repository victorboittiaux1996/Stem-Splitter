"""Benchmark script for 44Stems processing pipeline.

Usage:
    python worker/benchmark.py [--preset fast|balanced|high] [--runs N] [--cold]

Runs the full upload → confirm → poll → completion flow for each test track,
parses phase_timings from the R2 job JSON, and writes benchmark_results.csv.

Prerequisites:
    - .env.local with NEXT_PUBLIC_APP_URL (or set APP_URL env var)
    - Valid auth session cookie in .bench_cookie (or set BENCH_TOKEN env var)
    - AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / R2_ACCOUNT_ID / R2_BUCKET_NAME
      (reads from .env.local automatically)

Output: benchmark_results.csv
"""

import argparse
import csv
import json
import os
import random
import sys
import time
from pathlib import Path

# Load .env.local so we can read R2 credentials and APP_URL without installing dotenv
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

import base64
import boto3
import urllib.request
import urllib.parse

APP_URL = os.environ.get("APP_URL") or os.environ.get("NEXT_PUBLIC_APP_URL", "http://localhost:3000")
APP_URL = APP_URL.rstrip("/")

BENCH_TOKEN = os.environ.get("BENCH_TOKEN", "")

PRESET_OVERLAP = {"fast": 2, "balanced": 8, "high": 16}


def _build_supabase_cookie(session_file: str = "/tmp/supabase_session.json") -> str:
    """Reconstruct Supabase SSR cookie from a saved session JSON file.

    The session file stores the raw session object (as JSON). This function
    encodes it in the format @supabase/ssr expects: base64-{base64url(json)},
    split into chunks of 3180 URL-encoded bytes.
    """
    try:
        with open(session_file) as f:
            data = json.load(f)

        raw_chunks = data.get("chunks", [])
        if raw_chunks:
            # chunks[] holds raw base64 of the session JSON — reconstruct it
            full_b64 = "".join(raw_chunks)
            padding = (4 - len(full_b64) % 4) % 4
            full_b64 += "=" * padding
            session_obj = json.loads(base64.b64decode(full_b64).decode("utf-8"))
        else:
            session_obj = data  # already a session dict

        value_str = json.dumps(session_obj, separators=(",", ":"))
        b64url = base64.urlsafe_b64encode(value_str.encode()).rstrip(b"=").decode()
        cookie_value = "base64-" + b64url

        # Split using the same algorithm as @supabase/ssr
        MAX_CHUNK = 3180
        encoded_value = urllib.parse.quote(cookie_value, safe="")
        chunks = []
        while encoded_value:
            head = encoded_value[:MAX_CHUNK]
            last_pct = head.rfind("%")
            if last_pct > MAX_CHUNK - 3:
                head = head[:last_pct]
            while head:
                try:
                    decoded_head = urllib.parse.unquote(head)
                    break
                except Exception:
                    head = head[:-3]
            chunks.append(decoded_head)
            encoded_value = encoded_value[len(urllib.parse.quote(decoded_head, safe="")):]

        # Derive project ref from NEXT_PUBLIC_SUPABASE_URL
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
        project_ref = supabase_url.split("//")[-1].split(".")[0] if supabase_url else "zlsuybibxpnruiopjeny"
        name = f"sb-{project_ref}-auth-token"

        if len(chunks) == 1:
            return f"{name}={chunks[0]}"
        return "; ".join(f"{name}.{i}={c}" for i, c in enumerate(chunks))
    except Exception as e:
        return ""


_BENCH_COOKIE = _build_supabase_cookie() if not BENCH_TOKEN else ""

TEST_TRACKS = [
    {
        "path": "/Users/victorboittiaux/Downloads/Testing Tracks/021 Chic - Le Freak.mp3",
        "label": "chic_le_freak_mp3_8.9mb",
    },
    {
        "path": "/Users/victorboittiaux/Downloads/Testing Tracks/Madness - Our House.wav",
        "label": "madness_our_house_wav_34mb",
    },
    {
        "path": "/Users/victorboittiaux/Downloads/Testing Tracks/Cloonee, Young M.A, InntRaw - Stephanie (HNTR Remix) [Hellbent Records].aiff",
        "label": "cloonee_stephanie_aiff_40mb",
    },
    {
        "path": "/Users/victorboittiaux/Downloads/Testing Tracks/6A - 124 - Mochakk - The Line (Original Mix).aif",
        "label": "mochakk_the_line_aif_69mb",
    },
]

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


def _http(method: str, url: str, data: bytes | None = None, headers: dict | None = None) -> dict:
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if BENCH_TOKEN:
        req.add_header("Authorization", f"Bearer {BENCH_TOKEN}")
    elif _BENCH_COOKIE:
        req.add_header("Cookie", _BENCH_COOKIE)
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def upload_file(track_path: str, preset: str, mode: str = "4stem") -> dict:
    """POST /api/upload → get jobId + uploadUrl, PUT file to R2, confirm."""
    track_path = Path(track_path)
    file_size = track_path.stat().st_size
    overlap = PRESET_OVERLAP[preset]

    # Step 1 — POST /api/upload
    payload = json.dumps({
        "filename": track_path.name,
        "size": file_size,
        "contentType": "audio/mpeg",
        "mode": mode,
        "overlap": overlap,
    }).encode()
    t0 = time.time()
    init_resp = _http("POST", f"{APP_URL}/api/upload", data=payload)
    t_post = time.time() - t0

    job_id = init_resp["jobId"]
    upload_url = init_resp["uploadUrl"]

    # Step 2 — PUT file directly to R2 via presigned URL
    t0 = time.time()
    with open(track_path, "rb") as f:
        file_data = f.read()
    put_req = urllib.request.Request(upload_url, data=file_data, method="PUT")
    put_req.add_header("Content-Type", "audio/mpeg")
    with urllib.request.urlopen(put_req, timeout=300) as resp:
        pass
    t_upload = time.time() - t0

    # Step 3 — PUT /api/upload to confirm and trigger Modal
    t0 = time.time()
    confirm_payload = json.dumps({"jobId": job_id}).encode()
    _http("PUT", f"{APP_URL}/api/upload", data=confirm_payload)
    t_confirm = time.time() - t0

    return {
        "job_id": job_id,
        "file_size_mb": file_size / 1024 / 1024,
        "t_post_s": t_post,
        "t_upload_s": t_upload,
        "t_confirm_s": t_confirm,
    }


def poll_until_done(job_id: str, timeout: int = 600) -> dict:
    """Poll /api/jobs/{jobId} until completed or failed."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            job = _http("GET", f"{APP_URL}/api/jobs/{job_id}")
            status = job.get("status")
            if status == "completed":
                return job
            if status == "failed":
                raise RuntimeError(f"Job {job_id} failed: {job.get('error')}")
        except urllib.error.HTTPError:
            pass
        time.sleep(2)
    raise TimeoutError(f"Job {job_id} did not complete within {timeout}s")


def fetch_phase_timings(job_id: str, workspace_id: str | None) -> dict:
    """Read phase_timings directly from R2 job JSON."""
    s3 = _r2_client()
    if workspace_id:
        key = f"workspaces/{workspace_id}/jobs/{job_id}.json"
    else:
        key = f"jobs/{job_id}.json"
    try:
        resp = s3.get_object(Bucket=R2_BUCKET, Key=key)
        job_data = json.loads(resp["Body"].read())
        return job_data.get("phase_timings", {})
    except Exception as e:
        print(f"  [warn] Could not read phase_timings from R2: {e}")
        return {}


def run_benchmark(
    tracks: list[dict],
    presets: list[str],
    n_warm_runs: int,
    n_cold_runs: int,
    mode: str,
    out_csv: str,
):
    rows = []
    fieldnames = [
        "run_idx", "track", "file_size_mb", "preset", "cold",
        "t_post_s", "t_upload_s", "t_confirm_s",
        "total_wall_s",
        "phase_download_input", "phase_wav24_transcode", "phase_analyze_track",
        "phase_sep_vocal_load_model", "phase_sep_vocal_infer",
        "phase_sep_instru_load_model", "phase_sep_instru_infer",
        "phase_merge_stems", "phase_post_parallel",
        "phase_upload_mp3",
        "phase_callback_nextjs", "phase_total_wall_time",
        "job_id", "workspace_id",
    ]

    # Build run list: randomize preset order per track, 5 warm runs each
    run_plan = []
    for track in tracks:
        for _ in range(n_warm_runs):
            preset_order = list(presets)
            random.shuffle(preset_order)
            for preset in preset_order:
                run_plan.append({"track": track, "preset": preset, "cold": False})

    # Cold runs: one per track, spaced out manually by the user
    cold_plan = []
    for _ in range(n_cold_runs):
        for track in tracks:
            cold_plan.append({"track": track, "preset": "balanced", "cold": True})

    all_runs = run_plan + cold_plan
    print(f"\nTotal runs: {len(all_runs)} ({len(run_plan)} warm + {len(cold_plan)} cold)")
    print(f"Cold runs are appended at the end — wait >10 min between cold batches.\n")

    for run_idx, run in enumerate(all_runs):
        track = run["track"]
        preset = run["preset"]
        is_cold = run["cold"]
        track_path = track["path"]
        track_label = track["label"]

        if not Path(track_path).exists():
            print(f"  [skip] File not found: {track_path}")
            continue

        print(f"[{run_idx+1}/{len(all_runs)}] {track_label} | preset={preset} | cold={is_cold}")

        try:
            t_wall_start = time.time()

            upload_result = upload_file(track_path, preset, mode)
            job_id = upload_result["job_id"]
            print(f"  job={job_id} upload_s={upload_result['t_upload_s']:.1f}")

            job = poll_until_done(job_id)
            t_wall = time.time() - t_wall_start

            workspace_id = job.get("workspaceId")
            phase_timings = fetch_phase_timings(job_id, workspace_id)

            print(f"  done in {t_wall:.1f}s | phases: {json.dumps({k: round(v, 1) for k, v in phase_timings.items()})}")

            rows.append({
                "run_idx": run_idx,
                "track": track_label,
                "file_size_mb": round(upload_result["file_size_mb"], 1),
                "preset": preset,
                "cold": int(is_cold),
                "t_post_s": round(upload_result["t_post_s"], 3),
                "t_upload_s": round(upload_result["t_upload_s"], 2),
                "t_confirm_s": round(upload_result["t_confirm_s"], 3),
                "total_wall_s": round(t_wall, 2),
                "phase_download_input": round(phase_timings.get("download_input", 0), 2),
                "phase_wav24_transcode": round(phase_timings.get("wav24_transcode", 0), 2),
                "phase_analyze_track": round(phase_timings.get("analyze_track", 0), 2),
                "phase_sep_vocal_load_model": round(phase_timings.get("sep_vocal_load_model", 0), 2),
                "phase_sep_vocal_infer": round(phase_timings.get("sep_vocal_infer", 0), 2),
                "phase_sep_instru_load_model": round(phase_timings.get("sep_instru_load_model", 0), 2),
                "phase_sep_instru_infer": round(phase_timings.get("sep_instru_infer", 0), 2),
                "phase_merge_stems": round(phase_timings.get("merge_stems", 0), 2),
                "phase_post_parallel": round(phase_timings.get("post_parallel", 0), 2),
                "phase_upload_mp3": round(phase_timings.get("upload_mp3", 0), 2),
                "phase_callback_nextjs": round(phase_timings.get("callback_nextjs", 0), 2),
                "phase_total_wall_time": round(phase_timings.get("total_wall_time", 0), 2),
                "job_id": job_id,
                "workspace_id": workspace_id or "",
            })

        except Exception as e:
            print(f"  [error] {e}")
            rows.append({
                "run_idx": run_idx,
                "track": track_label,
                "preset": preset,
                "cold": int(is_cold),
                "total_wall_s": -1,
                "job_id": "ERROR",
                **{k: 0 for k in fieldnames if k not in ("run_idx", "track", "preset", "cold", "total_wall_s", "job_id")},
            })

        # Write CSV after each run (safe against interruptions)
        with open(out_csv, "w", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)

    print(f"\nResults written to {out_csv}")
    _print_summary(rows)


def _print_summary(rows: list[dict]):
    import statistics

    warm_rows = [r for r in rows if r.get("cold") == 0 and r.get("total_wall_s", -1) > 0]
    cold_rows = [r for r in rows if r.get("cold") == 1 and r.get("total_wall_s", -1) > 0]

    if warm_rows:
        warm_times = [r["total_wall_s"] for r in warm_rows]
        print(f"\n=== WARM runs: n={len(warm_times)} ===")
        print(f"  Median: {statistics.median(warm_times):.1f}s")
        print(f"  p95:    {sorted(warm_times)[int(len(warm_times) * 0.95)]:.1f}s")
        print(f"  Min:    {min(warm_times):.1f}s")
        print(f"  Max:    {max(warm_times):.1f}s")

        # Phase breakdown (warm only)
        phase_keys = [k for k in warm_rows[0] if k.startswith("phase_") and k != "phase_total_wall_time"]
        print("\n  Phase medians (warm):")
        for k in phase_keys:
            vals = [r[k] for r in warm_rows if r.get(k, 0) > 0]
            if vals:
                print(f"    {k[6:]:30s} {statistics.median(vals):6.1f}s")

    if cold_rows:
        cold_times = [r["total_wall_s"] for r in cold_rows]
        print(f"\n=== COLD runs: n={len(cold_times)} ===")
        print(f"  Median: {statistics.median(cold_times):.1f}s")
        print(f"  Min:    {min(cold_times):.1f}s")
        print(f"  Max:    {max(cold_times):.1f}s")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="44Stems benchmark runner")
    parser.add_argument("--preset", choices=["fast", "balanced", "high", "all"], default="balanced")
    parser.add_argument("--runs", type=int, default=5, help="Warm runs per (track, preset) combo")
    parser.add_argument("--cold", type=int, default=1, help="Cold runs per track (run after >10 min idle)")
    parser.add_argument("--mode", default="4stem", choices=["2stem", "4stem", "6stem"])
    parser.add_argument("--out", default="benchmark_results.csv")
    args = parser.parse_args()

    presets = ["fast", "balanced", "high"] if args.preset == "all" else [args.preset]

    if not APP_URL or APP_URL == "http://localhost:3000":
        print("Warning: APP_URL not set — using localhost:3000. Set APP_URL= for prod bench.")

    if not BENCH_TOKEN:
        print("Warning: BENCH_TOKEN not set. Set BENCH_TOKEN=<your bearer token> for auth.")

    run_benchmark(
        tracks=TEST_TRACKS,
        presets=presets,
        n_warm_runs=args.runs,
        n_cold_runs=args.cold,
        mode=args.mode,
        out_csv=args.out,
    )
