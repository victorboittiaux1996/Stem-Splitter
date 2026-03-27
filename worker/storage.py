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


def update_job_status(
    job_id: str,
    status: str,
    progress: int = 0,
    stage: str = "",
    stems: list[str] | None = None,
    error: str | None = None,
    bpm: float | None = None,
    key: str | None = None,
    key_raw: str | None = None,
    duration: float | None = None,
    peaks: dict | None = None,
):
    """Update the job status JSON in R2."""
    s3 = get_s3_client()

    # Read existing job
    try:
        response = s3.get_object(Bucket=BUCKET, Key=f"jobs/{job_id}.json")
        job = json.loads(response["Body"].read().decode("utf-8"))
    except Exception:
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
    if status == "completed":
        import time
        job["completedAt"] = int(time.time() * 1000)

    # Write back
    s3.put_object(
        Bucket=BUCKET,
        Key=f"jobs/{job_id}.json",
        Body=json.dumps(job),
        ContentType="application/json",
    )
