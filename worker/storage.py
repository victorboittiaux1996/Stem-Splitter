"""R2 storage helpers for the Modal worker."""

import json
import os
import boto3


def get_s3_client():
    """Create an S3 client configured for Cloudflare R2."""
    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto",
    )


BUCKET = os.environ.get("R2_BUCKET_NAME", "stem-splitter-storage")


def download_from_r2(key: str, local_path: str):
    """Download a file from R2 to a local path."""
    s3 = get_s3_client()
    s3.download_file(BUCKET, key, local_path)


def upload_to_r2(local_path: str, key: str, content_type: str = "audio/wav", callback=None):
    """Upload a local file to R2."""
    s3 = get_s3_client()
    s3.upload_file(
        local_path,
        BUCKET,
        key,
        ExtraArgs={"ContentType": content_type},
        Callback=callback,
    )


def job_key(workspace_id: str | None, job_id: str) -> str:
    """Return the R2 key for a job JSON file."""
    if workspace_id:
        return f"workspaces/{workspace_id}/jobs/{job_id}.json"
    return f"jobs/{job_id}.json"


def stem_key(workspace_id: str | None, job_id: str, stem_name: str, ext: str) -> str:
    """Return the R2 key for a stem audio file."""
    if workspace_id:
        return f"workspaces/{workspace_id}/stems/{job_id}/{stem_name}{ext}"
    return f"stems/{job_id}/{stem_name}{ext}"


def write_phase_timings(job_id: str, timings: dict, workspace_id: str | None = None):
    """Append phase_timings to an existing job JSON without touching any other field.

    Safe to call after the job is already 'completed' — does not reset completedAt,
    status, or any other field set by the callback or fallback paths.
    """
    s3 = get_s3_client()
    r2_key = job_key(workspace_id, job_id)

    # Read existing job
    job = None
    try:
        response = s3.get_object(Bucket=BUCKET, Key=r2_key)
        job = json.loads(response["Body"].read().decode("utf-8"))
    except Exception:
        pass
    if job is None:
        return  # job not found — skip, non-fatal

    # Only add phase_timings, touch nothing else
    job["phase_timings"] = timings

    s3.put_object(
        Bucket=BUCKET,
        Key=r2_key,
        Body=json.dumps(job),
        ContentType="application/json",
    )


def update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    stage: str = "",
    stems: list[str] | None = None,
    error: str | None = None,
    error_code: str | None = None,
    bpm: float | None = None,
    key: str | None = None,
    key_raw: str | None = None,
    duration: float | None = None,
    peaks: dict | None = None,
    workspace_id: str | None = None,
    user_id: str | None = None,
    phase_timings: dict | None = None,
):
    """Update the job status JSON in R2."""
    s3 = get_s3_client()
    r2_key = job_key(workspace_id, job_id)

    # Read existing job (try workspace path first, fall back to legacy)
    job = None
    try:
        response = s3.get_object(Bucket=BUCKET, Key=r2_key)
        job = json.loads(response["Body"].read().decode("utf-8"))
    except Exception:
        pass
    if job is None and workspace_id:
        try:
            response = s3.get_object(Bucket=BUCKET, Key=f"jobs/{job_id}.json")
            job = json.loads(response["Body"].read().decode("utf-8"))
        except Exception:
            pass
    if job is None:
        job = {"id": job_id}

    # Update fields
    job["status"] = status
    job["progress"] = progress
    if stage:
        job["stage"] = stage
    if stems is not None:
        job["stems"] = stems
    if error is not None:
        job["error"] = error
    if error_code is not None:
        job["error_code"] = error_code
    if bpm is not None:
        job["bpm"] = bpm
    if key is not None:
        job["key"] = key
    if key_raw is not None:
        job["key_raw"] = key_raw
    if duration is not None:
        job["duration"] = duration
    if peaks is not None:
        job["peaks"] = peaks
    if workspace_id is not None:
        job["workspaceId"] = workspace_id
    if user_id is not None:
        job["userId"] = user_id
    if phase_timings is not None:
        job["phase_timings"] = phase_timings
    if status == "completed":
        import time
        job["completedAt"] = int(time.time() * 1000)

    # Write back
    s3.put_object(
        Bucket=BUCKET,
        Key=r2_key,
        Body=json.dumps(job),
        ContentType="application/json",
    )
