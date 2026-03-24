"""Audio separation logic using audio-separator package.

Implements the validated pipeline:
- MelBand RoFormer for vocals (SDR ~12.6)
- BS-RoFormer SW for instruments: drums, bass, guitar, piano, other (drums SDR ~14.1, bass SDR ~14.6)
Both models process the original mix independently.
Guitar + piano + other are merged into a single "other" stem for 4-stem output.

Model choices validated by cross-referencing UVR community consensus across
Reddit, AudioSEX, KVR Audio, GitHub UVR, and MVSEP leaderboards (2026-03-21).
"""

import os
import glob
import numpy as np
import soundfile as sf
from audio_separator.separator import Separator


# Model filenames — validated by UVR community consensus
VOCAL_MODEL = "vocals_mel_band_roformer.ckpt"
INSTRUMENT_MODEL = "BS-Roformer-SW.ckpt"


def separate_2stem(input_path: str, output_dir: str) -> dict[str, str]:
    """Separate into vocals + instrumental using MelBand RoFormer.

    Returns dict mapping stem name to file path.
    """
    separator = Separator(
        output_dir=output_dir,
        output_format="WAV",
        normalization_threshold=0.9,
    )
    separator.load_model(model_filename=VOCAL_MODEL)
    output_files = separator.separate(input_path)

    stems = {}
    for path in output_files:
        basename = os.path.basename(path).lower()
        if "vocal" in basename:
            stems["vocals"] = path
        elif "other" in basename or "instrument" in basename or "no_vocal" in basename:
            stems["instrumental"] = path
        else:
            if "vocals" not in stems:
                stems["vocals"] = path
            else:
                stems["instrumental"] = path

    return stems


def separate_4stem(input_path: str, output_dir: str) -> dict[str, str]:
    """Parallel 2-model separation for maximum quality.

    MelBand RoFormer on original mix → vocals
    BS-RoFormer SW on original mix → drums, bass, guitar, piano, other
    Guitar + piano + other merged into single "other" stem.

    Returns dict mapping stem name to file path.
    """
    vocal_dir = os.path.join(output_dir, "vocals")
    inst_dir = os.path.join(output_dir, "instruments")
    os.makedirs(vocal_dir, exist_ok=True)
    os.makedirs(inst_dir, exist_ok=True)

    # MelBand RoFormer → vocals
    sep_v = Separator(output_dir=vocal_dir, output_format="WAV", normalization_threshold=0.9)
    sep_v.load_model(model_filename=VOCAL_MODEL)
    sep_v.separate(input_path)

    vocals_path = None
    for f in os.listdir(vocal_dir):
        if "(vocals)" in f.lower() and f.endswith(".wav"):
            vocals_path = os.path.join(vocal_dir, f)
            break

    if not vocals_path:
        raise RuntimeError("MelBand RoFormer did not produce vocals output")

    # BS-RoFormer SW → instruments (on original mix, not instrumental)
    sep_i = Separator(output_dir=inst_dir, output_format="WAV", normalization_threshold=0.9)
    sep_i.load_model(model_filename=INSTRUMENT_MODEL)
    sep_i.separate(input_path)

    # Collect instrument stems
    inst_stems = {}
    for f in glob.glob(os.path.join(inst_dir, "**", "*.wav"), recursive=True):
        fl = os.path.basename(f).lower()
        for key in ["drums", "bass", "other", "guitar", "piano"]:
            if f"({key})" in fl:
                inst_stems[key] = f

    stems = {"vocals": vocals_path}

    if "drums" in inst_stems:
        stems["drums"] = inst_stems["drums"]
    if "bass" in inst_stems:
        stems["bass"] = inst_stems["bass"]

    # Merge guitar + piano + other → single "other" stem
    merge_keys = [k for k in ["other", "guitar", "piano"] if k in inst_stems]
    if merge_keys:
        merged = None
        sr = None
        for k in merge_keys:
            data, sample_rate = sf.read(inst_stems[k])
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
        stems["other"] = other_path

    return stems
