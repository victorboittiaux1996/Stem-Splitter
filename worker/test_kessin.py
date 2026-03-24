"""Test with __kessin's exact UVR settings.
MDX-Net, UVR-MDX-NET Inst HQ 3, Segment Size 320, Vocals Only.
"""

import modal
import os
import time
import glob

app = modal.App("kessin-test")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("audio-separator[gpu]==0.42.1")
    .run_commands(
        "python -c \"from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/i', exist_ok=True); "
        "s = Separator(output_dir='/tmp/i'); "
        "s.load_model('UVR-MDX-NET-Inst_HQ_3.onnx'); "
        "print('Model cached')\""
    )
)


@app.function(image=image, gpu="A10G", timeout=300)
def kessin_vocal(audio_bytes: bytes, filename: str) -> dict[str, bytes]:
    from audio_separator.separator import Separator
    import tempfile
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    with tempfile.TemporaryDirectory() as tmpdir:
        ext = os.path.splitext(filename)[1] or ".mp3"
        input_path = os.path.join(tmpdir, f"input{ext}")
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        out_dir = os.path.join(tmpdir, "out")
        os.makedirs(out_dir)

        # __kessin exact settings
        sep = Separator(
            output_dir=out_dir,
            output_format="WAV",
            normalization_threshold=0.9,
            mdx_params={
                "hop_length": 1024,
                "segment_size": 320,
                "overlap": 0.25,
                "batch_size": 1,
                "enable_denoise": False,
            },
        )
        sep.load_model(model_filename="UVR-MDX-NET-Inst_HQ_3.onnx")

        print("Separating with __kessin settings (MDX Inst HQ 3, segment=320)...")
        start = time.time()
        sep.separate(input_path)
        elapsed = time.time() - start
        print(f"Done in {elapsed:.1f}s")

        results = {}
        for f in os.listdir(out_dir):
            if f.endswith(".wav"):
                with open(os.path.join(out_dir, f), "rb") as fh:
                    results[f] = fh.read()
                print(f"  Output: {f}")
        return results


@app.local_entrypoint()
def main(input_file: str):
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    with open(input_file, "rb") as f:
        audio_bytes = f.read()

    print(f"File: {len(audio_bytes) / 1024 / 1024:.1f} MB")

    start = time.time()
    results = kessin_vocal.remote(audio_bytes, os.path.basename(input_file))
    total = time.time() - start

    out_dir = "/Users/victorboittiaux/Downloads/stems_kessin"
    os.makedirs(out_dir, exist_ok=True)
    for name, data in results.items():
        path = os.path.join(out_dir, name)
        with open(path, "wb") as f:
            f.write(data)
        print(f"Saved: {path} ({len(data) / 1024 / 1024:.1f} MB)")
    print(f"Total: {total:.1f}s")
