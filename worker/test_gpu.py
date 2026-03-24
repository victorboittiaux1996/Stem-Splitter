"""Test GPU speed comparison — A10G vs A100 vs H100.

Pipeline: MelBand RoFormer (vocals) + BS-RoFormer SW (instruments)
Both on original mix, parallel.

Usage: modal run worker/test_gpu.py --input-file song.mp3
"""

import modal
import os
import time
import glob

app = modal.App("stem-splitter-gpu-test")

VOCAL_MODEL = "vocals_mel_band_roformer.ckpt"
INSTRUMENT_MODEL = "BS-Roformer-SW.ckpt"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("audio-separator[gpu]==0.42.1")
    .run_commands(
        "python -c \"from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/i', exist_ok=True); "
        "s = Separator(output_dir='/tmp/i'); "
        "s.load_model('" + VOCAL_MODEL + "'); "
        "s.load_model('" + INSTRUMENT_MODEL + "'); "
        "print('Models cached')\""
    )
)


def run_pipeline(audio_bytes: bytes, filename: str, gpu_name: str) -> dict:
    """Shared pipeline logic for all GPUs."""
    from audio_separator.separator import Separator
    import tempfile
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    with tempfile.TemporaryDirectory() as tmpdir:
        ext = os.path.splitext(filename)[1] or ".mp3"
        input_path = os.path.join(tmpdir, f"input{ext}")
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        stems = {}
        timings = {}

        # 1. MelBand RoFormer → vocals
        vocal_dir = os.path.join(tmpdir, "vocals")
        os.makedirs(vocal_dir)
        sep_v = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9)
        sep_v.load_model(model_filename=VOCAL_MODEL)

        print(f"  [{gpu_name}] Extracting vocals (MelBand RoFormer)...")
        start = time.time()
        sep_v.separate(input_path)
        timings["vocals"] = time.time() - start
        print(f"  [{gpu_name}] Vocals done in {timings['vocals']:.1f}s")

        for f in os.listdir(vocal_dir):
            if "(vocals)" in f.lower() and f.endswith(".wav"):
                with open(os.path.join(vocal_dir, f), "rb") as fh:
                    stems[f"{gpu_name}_vocals.wav"] = fh.read()
                break

        # 2. BS-RoFormer SW → instruments
        inst_dir = os.path.join(tmpdir, "instruments")
        os.makedirs(inst_dir)
        sep_i = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9)
        sep_i.load_model(model_filename=INSTRUMENT_MODEL)

        print(f"  [{gpu_name}] Extracting instruments (BS-RoFormer SW)...")
        start = time.time()
        sep_i.separate(input_path)
        timings["instruments"] = time.time() - start
        print(f"  [{gpu_name}] Instruments done in {timings['instruments']:.1f}s")

        print(f"  [{gpu_name}] Outputs: {os.listdir(inst_dir)}")

        stem_names = {"drums": "drums", "bass": "bass", "other": "other", "guitar": "guitar", "piano": "piano"}
        for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
            fl = os.path.basename(f).lower()
            for key, name in stem_names.items():
                if f"({key})" in fl:
                    with open(f, "rb") as fh:
                        stems[f"{gpu_name}_{name}.wav"] = fh.read()

        timings["total"] = timings["vocals"] + timings["instruments"]
        print(f"  [{gpu_name}] TOTAL: {timings['total']:.1f}s")

        return {"stems": stems, "timings": timings}


@app.function(image=image, gpu="A10G", timeout=600)
def run_a10g(audio_bytes: bytes, filename: str) -> dict:
    return run_pipeline(audio_bytes, filename, "A10G")


@app.function(image=image, gpu="A100", timeout=600)
def run_a100(audio_bytes: bytes, filename: str) -> dict:
    return run_pipeline(audio_bytes, filename, "A100")


@app.function(image=image, gpu="H100", timeout=600)
def run_h100(audio_bytes: bytes, filename: str) -> dict:
    return run_pipeline(audio_bytes, filename, "H100")


@app.local_entrypoint()
def main(input_file: str):
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    with open(input_file, "rb") as f:
        audio_bytes = f.read()

    print(f"File: {len(audio_bytes) / 1024 / 1024:.1f} MB")
    print(f"Pipeline: MelBand RoFormer (vocals) + BS-RoFormer SW (instruments)")
    print(f"Testing 3 GPUs in parallel...\n")

    out_dir = "/Users/victorboittiaux/Downloads/stems_gpu_test"
    os.makedirs(out_dir, exist_ok=True)

    # Launch all 3 GPUs in parallel
    fname = os.path.basename(input_file)
    a10g_handle = run_a10g.spawn(audio_bytes, fname)
    a100_handle = run_a100.spawn(audio_bytes, fname)
    h100_handle = run_h100.spawn(audio_bytes, fname)

    # Collect results
    all_timings = {}
    for name, handle in [("A10G", a10g_handle), ("A100", a100_handle), ("H100", h100_handle)]:
        print(f"\nWaiting for {name}...")
        result = handle.get()
        all_timings[name] = result["timings"]
        for stem_name, data in result["stems"].items():
            path = os.path.join(out_dir, stem_name)
            with open(path, "wb") as f:
                f.write(data)
            print(f"  Saved: {stem_name} ({len(data) / 1024 / 1024:.1f} MB)")

    # Print comparison table
    print(f"\n{'='*60}")
    print(f"{'GPU':<10} {'Vocals':<12} {'Instruments':<15} {'TOTAL':<10} {'Coût'}")
    print(f"{'-'*60}")
    prices = {"A10G": 0.000306, "A100": 0.000583, "H100": 0.001097}
    for gpu in ["A10G", "A100", "H100"]:
        t = all_timings[gpu]
        cost = prices[gpu] * t["total"]
        print(f"{gpu:<10} {t['vocals']:.1f}s{'':<7} {t['instruments']:.1f}s{'':<10} {t['total']:.1f}s{'':<5} ${cost:.3f}")
    print(f"{'='*60}")
