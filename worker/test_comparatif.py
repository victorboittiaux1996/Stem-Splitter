"""Test comparatif final — noms de fichiers clairs pour écoute facile.

Teste 2 pipelines sur le même track :

Pipeline 1 (actuel) : MelBand RoFormer (vocals) + HTDemucs-ft (instruments)
Pipeline 2 (nouveau) : MelBand RoFormer (vocals) + BS-RoFormer SW (instruments)

Les vocals sont identiques dans les 2 pipelines.
La différence c'est UNIQUEMENT les instruments.

Fichiers de sortie :
  PIPELINE1_drums.wav / PIPELINE1_bass.wav / PIPELINE1_other.wav     (HTDemucs-ft)
  PIPELINE2_drums.wav / PIPELINE2_bass.wav / PIPELINE2_other.wav     (BS-RoFormer SW)
  PIPELINE2_guitar.wav / PIPELINE2_piano.wav                         (bonus BS-RoFormer SW)
  VOCALS.wav                                                          (MelBand RoFormer, identique)
"""

import modal
import os
import time
import glob

app = modal.App("stem-splitter-comparatif")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install("ffmpeg", "libsndfile1")
    .pip_install("audio-separator[gpu]==0.42.1")
    .run_commands(
        "python -c \"from audio_separator.separator import Separator; "
        "import os; os.makedirs('/tmp/i', exist_ok=True); "
        "s = Separator(output_dir='/tmp/i'); "
        "s.load_model('vocals_mel_band_roformer.ckpt'); "
        "s.load_model('htdemucs_ft.yaml'); "
        "s.load_model('BS-Roformer-SW.ckpt'); "
        "print('3 models cached')\""
    )
)


@app.function(image=image, gpu="A10G", timeout=600)
def run_comparatif(audio_bytes: bytes, filename: str) -> dict[str, bytes]:
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

        # =============================================
        # VOCALS — MelBand RoFormer (une seule fois)
        # =============================================
        vocal_dir = os.path.join(tmpdir, "vocals")
        os.makedirs(vocal_dir)

        print("=== VOCALS (MelBand RoFormer) ===")
        sep = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9)
        sep.load_model(model_filename="vocals_mel_band_roformer.ckpt")
        start = time.time()
        sep.separate(input_path)
        print(f"    Done in {time.time() - start:.1f}s")

        for f in os.listdir(vocal_dir):
            if "(vocals)" in f.lower() and f.endswith(".wav"):
                with open(os.path.join(vocal_dir, f), "rb") as fh:
                    results["VOCALS.wav"] = fh.read()
                break

        # =============================================
        # PIPELINE 1 — HTDemucs-ft (instruments)
        # =============================================
        p1_dir = os.path.join(tmpdir, "pipeline1")
        os.makedirs(p1_dir)

        print("\n=== PIPELINE 1 : HTDemucs-ft (instruments) ===")
        sep1 = Separator(output_dir=p1_dir, output_format="WAV", normalization_threshold=0.9)
        sep1.load_model(model_filename="htdemucs_ft.yaml")
        start = time.time()
        sep1.separate(input_path)
        p1_time = time.time() - start
        print(f"    Done in {p1_time:.1f}s")

        stem_map = {"drums": "drums", "bass": "bass", "other": "other"}
        for f in glob.glob(os.path.join(p1_dir, "**", "*.wav"), recursive=True):
            fl = os.path.basename(f).lower()
            for key, name in stem_map.items():
                if f"({key})" in fl:
                    with open(f, "rb") as fh:
                        results[f"PIPELINE1_{name}.wav"] = fh.read()

        # =============================================
        # PIPELINE 2 — BS-RoFormer SW (instruments)
        # =============================================
        p2_dir = os.path.join(tmpdir, "pipeline2")
        os.makedirs(p2_dir)

        print("\n=== PIPELINE 2 : BS-RoFormer SW (instruments) ===")
        sep2 = Separator(output_dir=p2_dir, output_format="WAV", normalization_threshold=0.9)
        sep2.load_model(model_filename="BS-Roformer-SW.ckpt")
        start = time.time()
        sep2.separate(input_path)
        p2_time = time.time() - start
        print(f"    Done in {p2_time:.1f}s")
        print(f"    Outputs: {os.listdir(p2_dir)}")

        stem_map_sw = {"drums": "drums", "bass": "bass", "other": "other", "guitar": "guitar", "piano": "piano"}
        for f in glob.glob(os.path.join(p2_dir, "**", "*.wav"), recursive=True):
            fl = os.path.basename(f).lower()
            for key, name in stem_map_sw.items():
                if f"({key})" in fl:
                    with open(f, "rb") as fh:
                        results[f"PIPELINE2_{name}.wav"] = fh.read()

        print(f"\n=== RÉSUMÉ ===")
        print(f"  Pipeline 1 (HTDemucs-ft): {p1_time:.1f}s")
        print(f"  Pipeline 2 (BS-RoFormer SW): {p2_time:.1f}s")
        print(f"  Fichiers: {sorted(results.keys())}")

        return results


@app.local_entrypoint()
def main(input_file: str):
    if not os.path.exists(input_file):
        print(f"File not found: {input_file}")
        return

    with open(input_file, "rb") as f:
        audio_bytes = f.read()

    print(f"File: {len(audio_bytes) / 1024 / 1024:.1f} MB")
    print("Comparatif Pipeline 1 vs Pipeline 2...\n")

    start = time.time()
    results = run_comparatif.remote(audio_bytes, os.path.basename(input_file))
    total = time.time() - start

    out_dir = "/Users/victorboittiaux/Downloads/stems_comparatif"
    os.makedirs(out_dir, exist_ok=True)
    for name, data in sorted(results.items()):
        path = os.path.join(out_dir, name)
        with open(path, "wb") as f:
            f.write(data)
        print(f"  {name} ({len(data) / 1024 / 1024:.1f} MB)")

    print(f"\nTotal: {total:.1f}s")
    print(f"\n{'='*50}")
    print("COMMENT COMPARER :")
    print("  Les vocals sont identiques (VOCALS.wav)")
    print()
    print("  Compare les DRUMS :")
    print("    PIPELINE1_drums.wav (HTDemucs-ft)")
    print("    PIPELINE2_drums.wav (BS-RoFormer SW)")
    print()
    print("  Compare la BASS :")
    print("    PIPELINE1_bass.wav (HTDemucs-ft)")
    print("    PIPELINE2_bass.wav (BS-RoFormer SW)")
    print()
    print("  Compare OTHER :")
    print("    PIPELINE1_other.wav (HTDemucs-ft)")
    print("    PIPELINE2_other.wav (BS-RoFormer SW)")
    print()
    print("  BONUS Pipeline 2 :")
    print("    PIPELINE2_guitar.wav (seulement BS-RoFormer SW)")
    print("    PIPELINE2_piano.wav (seulement BS-RoFormer SW)")
    print(f"{'='*50}")
