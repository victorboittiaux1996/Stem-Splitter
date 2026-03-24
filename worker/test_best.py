"""Best of the best pipeline test.

MelBand RoFormer (vocals SDR 12.60) + BS-RoFormer SW (6 stems, drums SDR 14.11, bass SDR 14.62)
Both on original mix. Take vocals from MelBand, instruments from BS-RoFormer SW.
GPU: H100 80GB
"""

import modal
import os
import time
import glob

app = modal.App("stem-splitter-best")

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


@app.function(image=image, gpu="H100", timeout=600)
def separate_best(audio_bytes: bytes, filename: str) -> dict[str, bytes]:
    from audio_separator.separator import Separator
    import tempfile
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    with tempfile.TemporaryDirectory() as tmpdir:
        ext = os.path.splitext(filename)[1] or ".mp3"
        input_path = os.path.join(tmpdir, f"input{ext}")
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        results = {}

        # 1. MelBand RoFormer → vocals
        vocal_dir = os.path.join(tmpdir, "vocals")
        os.makedirs(vocal_dir)

        print(">>> MelBand RoFormer: Extracting vocals...")
        sep_vocal = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9)
        sep_vocal.load_model(model_filename=VOCAL_MODEL)
        start = time.time()
        sep_vocal.separate(input_path)
        vocal_time = time.time() - start
        print(f"    Done in {vocal_time:.1f}s")

        for f in os.listdir(vocal_dir):
            if "(vocals)" in f.lower() and f.endswith(".wav"):
                with open(os.path.join(vocal_dir, f), "rb") as fh:
                    results["vocals.wav"] = fh.read()
                break

        # 2. BS-RoFormer SW → drums, bass, guitar, piano, other
        inst_dir = os.path.join(tmpdir, "instruments")
        os.makedirs(inst_dir)

        print(">>> BS-RoFormer SW: Extracting 6 stems...")
        sep_inst = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9)
        sep_inst.load_model(model_filename=INSTRUMENT_MODEL)
        start = time.time()
        sep_inst.separate(input_path)
        inst_time = time.time() - start
        print(f"    Done in {inst_time:.1f}s")

        # Collect all instrument stems
        print(f"    BS-RoFormer SW outputs: {os.listdir(inst_dir)}")
        for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
            fl = os.path.basename(f).lower()
            for stem in ["drums", "bass", "guitar", "piano", "other"]:
                if f"({stem})" in fl:
                    with open(f, "rb") as fh:
                        results[f"{stem}.wav"] = fh.read()
                    break

        total = vocal_time + inst_time
        print(f"\n=== SUMMARY ===")
        print(f"  MelBand RoFormer (vocals): {vocal_time:.1f}s")
        print(f"  BS-RoFormer SW (instruments): {inst_time:.1f}s")
        print(f"  Total: {total:.1f}s")
        print(f"  Stems: {list(results.keys())}")

        return results


@app.local_entrypoint()
def main(input_file: str, output_dir: str = "/Users/victorboittiaux/Downloads/stems_best"):
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    with open(input_file, "rb") as f:
        audio_bytes = f.read()

    print(f"File: {len(audio_bytes) / 1024 / 1024:.1f} MB")
    print("Running BEST pipeline on Modal GPU (A100)...\n")

    start = time.time()
    results = separate_best.remote(audio_bytes, os.path.basename(input_file))
    total = time.time() - start

    out_dir = output_dir
    os.makedirs(out_dir, exist_ok=True)
    for name, data in results.items():
        path = os.path.join(out_dir, name)
        with open(path, "wb") as f:
            f.write(data)
        print(f"Saved: {path} ({len(data) / 1024 / 1024:.1f} MB)")
    print(f"\nTotal: {total:.1f}s")
