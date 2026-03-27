"""Modal GPU worker for stem separation.

Pipeline: MelBand RoFormer (vocals) + BS-RoFormer SW (instruments)
GPU: H100 80GB
Both models process the original mix in parallel.

Deploy: modal deploy worker/app.py
"""

import modal
import os
import time
import glob

app = modal.App("stem-splitter")

VOCAL_MODEL = "vocals_mel_band_roformer.ckpt"
INSTRUMENT_MODEL = "BS-Roformer-SW.ckpt"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1", "git")
    .pip_install(
        "audio-separator[gpu]==0.42.1", "boto3", "fastapi[standard]",
        "soundfile", "numpy", "librosa", "essentia",
        "nnAudio==0.3.3", "einops", "tqdm", "yt-dlp", "torchaudio",
    )
    .run_commands(
        "git clone https://github.com/deezer/skey.git /opt/skey",
        "python -c \"from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/i', exist_ok=True); "
        "s = Separator(output_dir='/tmp/i'); "
        "s.load_model('" + VOCAL_MODEL + "'); "
        "s.load_model('" + INSTRUMENT_MODEL + "'); "
        "print('Models cached')\"",
    )
    .add_local_python_source("analyzer", "storage")
)


def download_from_url(url: str, output_dir: str) -> str:
    """Download audio from URL (YouTube/SoundCloud/Deezer) at best available quality."""
    import yt_dlp

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, 'audio.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'socket_timeout': 30,
    }
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.extract_info(url, download=True)
        for f in os.listdir(output_dir):
            if f.startswith('audio.') and not f.endswith('.part'):
                return os.path.join(output_dir, f)
    raise Exception(f"Failed to download audio from {url}")


def _make_tqdm_hook(start_pct, end_pct, job_id, stage):
    """Monkey-patch tqdm.update to write real progress directly to R2.

    Throttled to 1 write/s. Maps the model's 0→100% chunk progress onto [start_pct, end_pct].
    Writes directly to R2 so the frontend GET polling sees real values immediately.
    """
    import time as _t
    from tqdm import tqdm as _tqdm
    from storage import update_job_status

    _last_write = [0.0]
    _orig = _tqdm.update

    def patched(self, n=1):
        _orig(self, n)
        if self.total and self.total > 0:
            real_pct = int(start_pct + (self.n / self.total) * (end_pct - start_pct))
            now = _t.time()
            if now - _last_write[0] >= 1.0:
                _last_write[0] = now
                try:
                    update_job_status(job_id, "processing", progress=real_pct, stage=stage)
                except Exception:
                    pass  # never let a progress write failure kill the job

    return patched, _orig


@app.function(image=image, gpu="H100", timeout=600, secrets=[modal.Secret.from_name("r2-credentials")])
@modal.web_endpoint(method="POST")
def separate(request: dict):
    """Process a stem separation job.

    Accepts: { "jobId": "...", "mode": "4stem"|"2stem", "inputKey": "..." }
    Or direct audio: { "audio_base64": "...", "filename": "...", "mode": "..." }
    Or URL: { "downloadUrl": "...", "mode": "..." }
    """
    from audio_separator.separator import Separator
    import tempfile
    import base64
    import json
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    job_id = request.get("jobId", "test")
    mode = request.get("mode", "4stem")
    audio_b64 = request.get("audio_base64")
    input_key = request.get("inputKey")
    download_url = request.get("downloadUrl")
    callback_url = request.get("callbackUrl")  # PATCH /api/jobs/{jobId} on Next.js

    with tempfile.TemporaryDirectory() as tmpdir:
        # Get input file
        if download_url:
            print(f"Downloading audio from URL: {download_url}")
            input_path = download_from_url(download_url, tmpdir)
            print(f"Downloaded: {input_path}")
        elif audio_b64:
            filename = request.get("filename", "input.mp3")
            ext = os.path.splitext(filename)[1] or ".mp3"
            input_path = os.path.join(tmpdir, f"input{ext}")
            with open(input_path, "wb") as f:
                f.write(base64.b64decode(audio_b64))
        elif input_key:
            # Download from R2
            from storage import download_from_r2, update_job_status
            ext = os.path.splitext(input_key)[1] or ".mp3"
            input_path = os.path.join(tmpdir, f"input{ext}")
            update_job_status(job_id, "processing", progress=5, stage="Downloading audio")
            download_from_r2(input_key, input_path)
        else:
            return {"error": "No audio provided"}


        # Analyze BPM + key before separation (~3-4s)
        from analyzer import analyze_track
        analysis = analyze_track(input_path)

        results = {}
        stem_names = []

        # === VOCALS: MelBand RoFormer ===
        vocal_dir = os.path.join(tmpdir, "vocals")
        os.makedirs(vocal_dir)

        print("Extracting vocals (MelBand RoFormer)...")
        sep_v = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9)
        sep_v.load_model(model_filename=VOCAL_MODEL)
        start = time.time()
        if input_key:
            from tqdm import tqdm as _tqdm
            _end_pct = 85 if mode == "2stem" else 50
            _patched, _orig = _make_tqdm_hook(10, _end_pct, job_id, "Extracting vocals")
            _tqdm.update = _patched
            try:
                sep_v.separate(input_path)
            finally:
                _tqdm.update = _orig
        else:
            sep_v.separate(input_path)
        vocal_time = time.time() - start
        print(f"Vocals done in {vocal_time:.1f}s")

        for f in os.listdir(vocal_dir):
            if "(vocals)" in f.lower() and f.endswith(".wav"):
                results["vocals"] = os.path.join(vocal_dir, f)
                stem_names.append("vocals")
                break

        if mode == "2stem":
            # Also grab instrumental
            for f in os.listdir(vocal_dir):
                if "(other)" in f.lower() and f.endswith(".wav"):
                    results["instrumental"] = os.path.join(vocal_dir, f)
                    stem_names.append("instrumental")
                    break
        else:
            # === INSTRUMENTS: BS-RoFormer SW ===
            inst_dir = os.path.join(tmpdir, "instruments")
            os.makedirs(inst_dir)

            print("Extracting instruments (BS-RoFormer SW)...")
            sep_i = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9)
            sep_i.load_model(model_filename=INSTRUMENT_MODEL)
            start = time.time()
            if input_key:
                from tqdm import tqdm as _tqdm
                _patched, _orig = _make_tqdm_hook(50, 85, job_id, "Extracting instruments")
                _tqdm.update = _patched
                try:
                    sep_i.separate(input_path)
                finally:
                    _tqdm.update = _orig
            else:
                sep_i.separate(input_path)
            inst_time = time.time() - start
            print(f"Instruments done in {inst_time:.1f}s")

            # Collect individual instrument stems
            inst_stems = {}
            for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
                fl = os.path.basename(f).lower()
                for key in ["drums", "bass", "other", "guitar", "piano"]:
                    if f"({key})" in fl:
                        inst_stems[key] = f

            # Drums and Bass stay separate
            if "drums" in inst_stems:
                results["drums"] = inst_stems["drums"]
                stem_names.append("drums")
            if "bass" in inst_stems:
                results["bass"] = inst_stems["bass"]
                stem_names.append("bass")

            if mode == "6stem":
                # Keep guitar, piano, other separate
                for key in ["guitar", "piano", "other"]:
                    if key in inst_stems:
                        results[key] = inst_stems[key]
                        stem_names.append(key)
                print(f"6-stem mode: kept guitar/piano/other separate")
            else:
                # 4-stem: merge guitar + piano + other → single "other" stem
                merge_files = [inst_stems[k] for k in ["other", "guitar", "piano"] if k in inst_stems]
                if merge_files:
                    import numpy as np
                    import soundfile as sf

                    merged = None
                    sr = None
                    for mf in merge_files:
                        data, sample_rate = sf.read(mf)
                        sr = sample_rate
                        if merged is None:
                            merged = data.astype(np.float64)
                        else:
                            if len(data) > len(merged):
                                merged = np.pad(merged, ((0, len(data) - len(merged)), (0, 0)))
                            elif len(merged) > len(data):
                                data = np.pad(data, ((0, len(merged) - len(data)), (0, 0)))
                            merged += data.astype(np.float64)

                    peak = np.max(np.abs(merged))
                    if peak > 0.95:
                        merged = merged * (0.95 / peak)

                    other_path = os.path.join(inst_dir, "merged_other.wav")
                    sf.write(other_path, merged.astype(np.float32), sr)
                    results["other"] = other_path
                    stem_names.append("other")
                    print(f"4-stem mode: merged {len(merge_files)} stems into 'other'")

        # Upload to R2 if job has inputKey
        if input_key:
            from storage import upload_to_r2, update_job_status
            import os as _os

            # Compute total bytes across all stems for smooth 85→99% progress
            total_bytes = sum(_os.path.getsize(fp) for fp in results.values())
            uploaded_bytes = [0]
            last_pct = [85]

            def _upload_callback(bytes_transferred):
                uploaded_bytes[0] += bytes_transferred
                pct = 85 + int((uploaded_bytes[0] / total_bytes) * 14)  # 85→99
                pct = min(pct, 99)
                if pct > last_pct[0]:
                    last_pct[0] = pct
                    update_job_status(job_id, "processing", progress=pct, stage="Uploading stems")

            update_job_status(job_id, "processing", progress=85, stage="Uploading stems")
            for stem_name, filepath in results.items():
                r2_key = f"stems/{job_id}/{stem_name}.wav"
                upload_to_r2(filepath, r2_key, callback=_upload_callback)

            update_job_status(job_id, "completed", progress=100, stage="Done",
                              stems=stem_names, bpm=analysis["bpm"],
                              key=analysis["key"], key_raw=analysis["key_raw"],
                              duration=analysis["duration"])
            return {"status": "completed", "stems": stem_names}

        # Direct mode: return base64 encoded stems
        import base64 as b64
        encoded = {}
        for stem_name, filepath in results.items():
            with open(filepath, "rb") as f:
                encoded[stem_name] = b64.b64encode(f.read()).decode("utf-8")

        return {
            "status": "completed", "stems": stem_names, "data": encoded,
            "bpm": analysis["bpm"], "key": analysis["key"], "key_raw": analysis["key_raw"],
        }
