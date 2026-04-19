"""BPM and key detection for audio tracks.

Key: Deezer S-KEY (ICASSP 2025) — ChromaNet CNN
BPM: Essentia RhythmExtractor2013 (degara mode)
Segment: 60s at 25% of track (avoids drums-only intros)
"""

import sys
import os
import threading
import numpy as np
import librosa
import torch
import essentia.standard as es

# Add S-KEY to path (cloned to /opt/skey in Modal image)
sys.path.insert(0, "/opt/skey")
from skey.key_detection import load_checkpoint, load_model_components, infer_key

# Camelot wheel mapping
KEY_TO_CAMELOT = {
    "A Major": "11B", "Bb Major": "6B", "B Major": "1B", "C Major": "8B",
    "C# Major": "3B", "D Major": "10B", "D# Major": "5B", "E Major": "12B",
    "F Major": "7B", "F# Major": "2B", "G Major": "9B", "G# Major": "4B",
    "A minor": "8A", "Bb minor": "3A", "B minor": "10A", "C minor": "5A",
    "C# minor": "12A", "D minor": "7A", "D# minor": "2A", "E minor": "9A",
    "F minor": "4A", "F# minor": "11A", "G minor": "6A", "G# minor": "1A",
}

# S-KEY model (loaded once at module level)
_skey_ckpt = None
_skey_device = None
_skey_hcqt = None
_skey_chromanet = None
_skey_crop_fn = None
_skey_lock = threading.Lock()

# BPM extractor (cached to avoid re-initializing Essentia on every call)
_rhythm_extractor = None
_rhythm_lock = threading.Lock()


def _init_skey():
    """Initialize S-KEY model (lazy, once per container). Thread-safe via double-checked locking.

    Forced to CPU: ChromaNet is 250K params — no GPU needed. Runs during inference
    on the container's CPU cores (idle while H100 does stem separation).
    """
    global _skey_ckpt, _skey_device, _skey_hcqt, _skey_chromanet, _skey_crop_fn
    if _skey_ckpt is not None:
        return
    with _skey_lock:
        if _skey_ckpt is not None:  # double-checked
            return
        ckpt = load_checkpoint()
        device = torch.device("cpu")  # CPU-only: tiny model, runs in parallel with GPU inference
        hcqt, chromanet, crop_fn = load_model_components(ckpt, device)
        _skey_device = device
        _skey_hcqt = hcqt
        _skey_chromanet = chromanet
        _skey_crop_fn = crop_fn
        _skey_ckpt = ckpt  # written last — this is the guard
        print(f"S-KEY initialized on {_skey_device}")


def load_segment(path: str, sr: int = 22050, duration: int = 60, position_pct: float = 0.25):
    """Load a segment of audio at a given position."""
    try:
        total_dur = librosa.get_duration(filename=path)
    except Exception:
        total_dur = 300
    offset = max(0, total_dur * position_pct)
    if offset + duration > total_dur:
        offset = max(0, total_dur - duration)
    y, file_sr = librosa.load(path, sr=sr, mono=True, offset=offset, duration=duration)
    return y, file_sr


def detect_key(audio_path: str) -> tuple[str, str]:
    """Detect musical key using Deezer S-KEY.

    Returns: (camelot, key_raw) e.g. ("10A", "B minor")
    """
    _init_skey()
    sr_skey = _skey_ckpt["audio"]["sr"]  # 22050
    y, sr = load_segment(audio_path, sr=sr_skey, duration=60, position_pct=0.25)
    if sr != sr_skey:
        y = librosa.resample(y, orig_sr=sr, target_sr=sr_skey)

    waveform = torch.from_numpy(y).unsqueeze(0).float()
    max_val = torch.max(torch.abs(waveform))
    if max_val > 0:
        waveform = waveform / max_val
    waveform = waveform.to(_skey_device)

    key_str = infer_key(_skey_hcqt, _skey_chromanet, _skey_crop_fn, waveform, _skey_device)
    camelot = KEY_TO_CAMELOT.get(key_str, "?")
    return camelot, key_str


def detect_bpm(audio_path: str) -> float:
    """Detect BPM using Essentia RhythmExtractor2013 (degara mode)."""
    global _rhythm_extractor
    if _rhythm_extractor is None:
        with _rhythm_lock:
            if _rhythm_extractor is None:
                _rhythm_extractor = es.RhythmExtractor2013(method="degara")
    y, sr = load_segment(audio_path, sr=22050, duration=60, position_pct=0.25)
    # Essentia needs 44100 Hz
    y_44 = librosa.resample(y, orig_sr=sr, target_sr=44100)
    bpm, beats, confidence, estimates, intervals = _rhythm_extractor(y_44.astype(np.float32))
    # Octave correction: normalize to 70-180 BPM range
    while bpm < 70:
        bpm *= 2
    while bpm > 180:
        bpm /= 2
    return round(float(bpm))


def analyze_track(audio_path: str) -> dict:
    """Full analysis: key + BPM + duration.

    Optimisations:
    - Segment audio chargé une seule fois (partagé entre key + BPM)
    - detect_key (CPU) et detect_bpm (CPU) lancés en parallèle
    - S-KEY forcé sur CPU → pas de contention GPU pendant l'inférence des séparateurs

    Returns: {"key": "10A", "key_raw": "B minor", "bpm": 126.0, "duration": 214.3}
    On failure: {"key": None, "key_raw": None, "bpm": None, "duration": None}
    """
    try:
        import concurrent.futures as _cf
        import time as _time

        _t0 = _time.time()
        duration_sec = librosa.get_duration(filename=audio_path)

        # Load audio segment once — shared between key + BPM (avoids double I/O)
        y_22k, _ = load_segment(audio_path, sr=22050, duration=60, position_pct=0.25)

        key_result: list = [None, None]
        bpm_result: list = [None]

        def _run_key():
            _init_skey()
            sr_skey = _skey_ckpt["audio"]["sr"]  # 22050
            y = y_22k
            if sr_skey != 22050:
                y = librosa.resample(y, orig_sr=22050, target_sr=sr_skey)
            waveform = torch.from_numpy(y).unsqueeze(0).float()
            max_val = torch.max(torch.abs(waveform))
            if max_val > 0:
                waveform = waveform / max_val
            waveform = waveform.to(_skey_device)
            key_str = infer_key(_skey_hcqt, _skey_chromanet, _skey_crop_fn, waveform, _skey_device)
            key_result[0] = KEY_TO_CAMELOT.get(key_str, "?")
            key_result[1] = key_str

        def _run_bpm():
            global _rhythm_extractor
            if _rhythm_extractor is None:
                with _rhythm_lock:
                    if _rhythm_extractor is None:
                        _rhythm_extractor = es.RhythmExtractor2013(method="degara")
            y_44 = librosa.resample(y_22k, orig_sr=22050, target_sr=44100)
            bpm, _, _, _, _ = _rhythm_extractor(y_44.astype(np.float32))
            while bpm < 70:
                bpm *= 2
            while bpm > 180:
                bpm /= 2
            bpm_result[0] = round(float(bpm))

        # Run key + BPM in parallel — both CPU-bound, fully independent
        with _cf.ThreadPoolExecutor(max_workers=2) as pool:
            f_key = pool.submit(_run_key)
            f_bpm = pool.submit(_run_bpm)
            f_key.result()
            f_bpm.result()

        camelot, key_raw = key_result[0], key_result[1]
        bpm = bpm_result[0]
        _elapsed = round(_time.time() - _t0, 2)
        print(f"Analysis: {bpm} BPM, {camelot} ({key_raw}), {duration_sec:.1f}s in {_elapsed}s")
        return {"key": camelot, "key_raw": key_raw, "bpm": bpm, "duration": round(duration_sec, 1), "_elapsed": _elapsed}
    except Exception as e:
        print(f"Analysis failed: {e}")
        return {"key": None, "key_raw": None, "bpm": None, "duration": None}
