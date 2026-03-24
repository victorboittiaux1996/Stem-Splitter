"""Stem separation A/B test on Modal GPU.

Tests 2 vocal models on the same track:
- Model A: MelBand RoFormer Vocals (Kimberley Jensen) — SDR 12.6
- Model B: Kim Vocal 2 (MDX-Net) — community workhorse

Pipeline: PARALLEL (both models on the original mix, not chained)
Post-processing: de-echo on vocals

Usage: modal run worker/test_local.py --input-file song.mp3
"""

import modal
import os
import time
import glob

app = modal.App("stem-splitter-ab-test")

VOCAL_MODEL_A = "vocals_mel_band_roformer.ckpt"
VOCAL_MODEL_B = "Kim_Vocal_2.onnx"
DEMUCS_MODEL = "htdemucs_ft.yaml"
DEECHO_MODEL = "UVR-De-Echo-Normal.pth"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("audio-separator[gpu]==0.42.1")
    .run_commands(
        "python -c \""
        "from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/init', exist_ok=True); "
        "s = Separator(output_dir='/tmp/init'); "
        "s.load_model('" + VOCAL_MODEL_A + "'); "
        "s.load_model('" + VOCAL_MODEL_B + "'); "
        "s.load_model('" + DEMUCS_MODEL + "'); "
        "s.load_model('" + DEECHO_MODEL + "'); "
        "print('All models cached')\""
    )
)


@app.function(image=image, gpu="A10G", timeout=600)
def run_ab_test(audio_bytes: bytes, filename: str) -> dict[str, bytes]:
    """Run parallel pipeline with 2 vocal models + demucs + post-processing."""
    from audio_separator.separator import Separator
    import tempfile
    import shutil
    import logging
    logging.getLogger("audio_separator").setLevel(logging.WARNING)

    with tempfile.TemporaryDirectory() as tmpdir:
        # Write input
        ext = os.path.splitext(filename)[1] or ".mp3"
        input_path = os.path.join(tmpdir, f"input{ext}")
        with open(input_path, "wb") as f:
            f.write(audio_bytes)

        results = {}

        # ============================================================
        # 1. DEMUCS on original mix → drums, bass, other
        # ============================================================
        demucs_dir = os.path.join(tmpdir, "demucs")
        os.makedirs(demucs_dir, exist_ok=True)

        print(">>> Demucs: Separating drums/bass/other from ORIGINAL mix (shifts=2 par défaut)...")
        sep_demucs = Separator(output_dir=demucs_dir, output_format="WAV", normalization_threshold=0.9)
        sep_demucs.load_model(model_filename=DEMUCS_MODEL)

        start = time.time()
        sep_demucs.separate(input_path)
        demucs_time = time.time() - start
        print(f"    Demucs done in {demucs_time:.1f}s")

        # Collect demucs stems
        for f in glob.glob(os.path.join(demucs_dir, "**", "*.wav"), recursive=True):
            fl = os.path.basename(f).lower()
            if "(bass)" in fl:
                with open(f, "rb") as fh:
                    results["bass.wav"] = fh.read()
            elif "(drums)" in fl:
                with open(f, "rb") as fh:
                    results["drums.wav"] = fh.read()
            elif "(other)" in fl:
                with open(f, "rb") as fh:
                    results["other.wav"] = fh.read()

        # ============================================================
        # 2. VOCAL MODEL A: MelBand RoFormer on original mix
        # ============================================================
        vocal_a_dir = os.path.join(tmpdir, "vocal_a")
        os.makedirs(vocal_a_dir, exist_ok=True)

        print(f">>> Model A ({VOCAL_MODEL_A}): Extracting vocals...")
        sep_a = Separator(output_dir=vocal_a_dir, output_format="WAV", normalization_threshold=0.9)
        sep_a.load_model(model_filename=VOCAL_MODEL_A)

        start = time.time()
        sep_a.separate(input_path)
        model_a_time = time.time() - start
        print(f"    Model A done in {model_a_time:.1f}s")

        # Find vocals from model A
        vocal_a_path = None
        for f in os.listdir(vocal_a_dir):
            if "(vocals)" in f.lower() and f.endswith(".wav"):
                vocal_a_path = os.path.join(vocal_a_dir, f)
                break
        if not vocal_a_path:
            wavs = sorted(glob.glob(os.path.join(vocal_a_dir, "*.wav")))
            vocal_a_path = wavs[0] if wavs else None

        # ============================================================
        # 3. VOCAL MODEL B: Kim Vocal 2 on original mix
        # ============================================================
        vocal_b_dir = os.path.join(tmpdir, "vocal_b")
        os.makedirs(vocal_b_dir, exist_ok=True)

        print(f">>> Model B ({VOCAL_MODEL_B}): Extracting vocals...")
        sep_b = Separator(output_dir=vocal_b_dir, output_format="WAV", normalization_threshold=0.9)
        sep_b.load_model(model_filename=VOCAL_MODEL_B)

        start = time.time()
        sep_b.separate(input_path)
        model_b_time = time.time() - start
        print(f"    Model B done in {model_b_time:.1f}s")

        # Save ALL model B outputs so we can pick the right one
        # Kim Vocal 2 outputs: one is vocals, one is instrumental
        print(f"    Model B outputs: {os.listdir(vocal_b_dir)}")
        for f in os.listdir(vocal_b_dir):
            if f.endswith(".wav"):
                fpath = os.path.join(vocal_b_dir, f)
                with open(fpath, "rb") as fh:
                    # Save both outputs with descriptive names
                    results[f"vocals_B_{f}"] = fh.read()

        # ============================================================
        # 4. POST-PROCESSING: De-echo on Model A vocals
        # ============================================================
        if vocal_a_path:
            deecho_dir = os.path.join(tmpdir, "deecho")
            os.makedirs(deecho_dir, exist_ok=True)

            print(">>> Post-processing: De-echo on Model A vocals...")
            sep_deecho = Separator(output_dir=deecho_dir, output_format="WAV", normalization_threshold=0.9)
            sep_deecho.load_model(model_filename=DEECHO_MODEL)

            start = time.time()
            sep_deecho.separate(vocal_a_path)
            deecho_time = time.time() - start
            print(f"    De-echo done in {deecho_time:.1f}s")

            # Find the de-echoed vocal (the "dry" output)
            for f in os.listdir(deecho_dir):
                fl = f.lower()
                if f.endswith(".wav") and ("no_echo" in fl or "dry" in fl or "no echo" in fl or "(vocals)" in fl):
                    with open(os.path.join(deecho_dir, f), "rb") as fh:
                        results["vocals_A_cleaned.wav"] = fh.read()
                    break

            # Also save raw model A vocals for comparison
            with open(vocal_a_path, "rb") as fh:
                results["vocals_A_raw.wav"] = fh.read()

        # Model B vocals already saved above with all outputs

        # Summary
        total = demucs_time + model_a_time + model_b_time
        print(f"\n=== SUMMARY ===")
        print(f"  Demucs (drums/bass/other): {demucs_time:.1f}s")
        print(f"  Model A (MelBand RoFormer): {model_a_time:.1f}s")
        print(f"  Model B (Kim Vocal 2): {model_b_time:.1f}s")
        print(f"  Total processing: {total:.1f}s")
        print(f"  Stems produced: {list(results.keys())}")

        return results


@app.local_entrypoint()
def main(input_file: str):
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    print(f"Reading {input_file}...")
    with open(input_file, "rb") as f:
        audio_bytes = f.read()

    print(f"File size: {len(audio_bytes) / 1024 / 1024:.1f} MB")
    print(f"Running A/B test on Modal GPU (A10G)...\n")

    start = time.time()
    results = run_ab_test.remote(audio_bytes, os.path.basename(input_file))
    total = time.time() - start

    # Save stems
    output_dir = os.path.join(os.path.dirname(input_file) or ".", "stems_ab_test")
    os.makedirs(output_dir, exist_ok=True)

    for name, data in results.items():
        out_path = os.path.join(output_dir, name)
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"Saved: {out_path} ({len(data) / 1024 / 1024:.1f} MB)")

    print(f"\nTotal time (including upload/download): {total:.1f}s")
    print(f"\nÉcoute et compare :")
    print(f"  vocals_A_raw.wav       = MelBand RoFormer (brut)")
    print(f"  vocals_A_cleaned.wav   = MelBand RoFormer + de-echo")
    print(f"  vocals_B_KimVocal2.wav = Kim Vocal 2 (brut)")
    print(f"  drums.wav / bass.wav / other.wav = Demucs sur le mix original")
