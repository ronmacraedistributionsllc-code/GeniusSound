"""Phase 3: audio analysis (BPM, key, duration, sections, drops, energy).

Heuristic analysis built on librosa (ISC licence). Section labels are best-effort
guesses from energy and self-similarity; every result carries `confidence`
and users must be able to edit sections in the UI.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

import librosa
import numpy as np

# Krumhansl-Schmuckler key profiles
_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
ALLOWED_EXT = {".mp3", ".wav"}
SR = 22050


def detect_key(y: np.ndarray, sr: int) -> dict[str, Any]:
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
    best = (-2.0, 0, "major")
    for i in range(12):
        for mode, prof in (("major", _MAJOR), ("minor", _MINOR)):
            c = float(np.corrcoef(chroma, np.roll(prof, i))[0, 1])
            if c > best[0]:
                best = (c, i, mode)
    corr, tonic, mode = best
    return {"key": f"{_NOTES[tonic]} {mode}", "tonic": _NOTES[tonic], "mode": mode,
            "confidence": round(max(0.0, min(1.0, corr)), 3)}


def energy_curve(y: np.ndarray, sr: int, hop_sec: float = 1.0) -> list[dict[str, float]]:
    hop = int(sr * hop_sec)
    rms = np.array([float(np.sqrt(np.mean(y[i:i + hop] ** 2))) for i in range(0, max(len(y) - hop // 2, 1), hop)])
    if rms.size == 0:
        return []
    peak = rms.max() or 1.0
    return [{"t": round(i * hop_sec, 3), "energy": round(float(v / peak), 4)} for i, v in enumerate(rms)]


def detect_drops(curve: list[dict[str, float]], min_rise: float = 0.35, window: int = 2) -> list[dict[str, float]]:
    """A drop = energy jumps by >= min_rise within `window` seconds after a quieter stretch."""
    e = np.array([p["energy"] for p in curve])
    drops: list[dict[str, float]] = []
    last = -999.0
    for i in range(window, len(e) - 1):
        before = e[max(0, i - window):i].mean()
        after = e[i:i + window].min()  # sustained rise, not a single spike
        if after - before >= min_rise and curve[i]["t"] - last > 8:
            drops.append({"t": curve[i]["t"], "intensity": round(float(after - before), 3)})
            last = curve[i]["t"]
    return drops


def _label_sections(bounds: list[float], feats: np.ndarray, energies: list[float], duration: float) -> list[dict[str, Any]]:
    n = len(energies)
    norm = feats / (np.linalg.norm(feats, axis=1, keepdims=True) + 1e-9)
    group = list(range(n))
    for i in range(n):
        for j in range(i):
            if float(norm[i] @ norm[j]) > 0.93:
                group[i] = group[j]
                break
    members: dict[int, list[int]] = {}
    for i, g in enumerate(group):
        members.setdefault(g, []).append(i)
    repeated = [g for g, m in members.items() if len(m) >= 2]
    chorus_g = max(repeated, key=lambda g: np.mean([energies[i] for i in members[g]])) if repeated else None
    labels = []
    for i in range(n):
        g = group[i]
        if i == 0 and (len(members[g]) == 1 or energies[i] < 0.6):
            lab = "intro"
        elif g == chorus_g:
            lab = "chorus"
        elif g in repeated:
            lab = "verse"
        elif i == n - 1 and energies[i] < 0.5:
            lab = "outro"
        elif energies[i] < 0.35:
            lab = "instrumental"
        else:
            lab = "bridge"
        labels.append(lab)
    out = []
    for i in range(n):
        end = bounds[i + 1] if i + 1 < len(bounds) else duration
        out.append({"index": i, "label": labels[i], "start": round(bounds[i], 3), "end": round(end, 3),
                    "energy": round(energies[i], 3), "confidence": 0.5 if len(repeated) else 0.3})
    return out


def detect_sections(y: np.ndarray, sr: int, duration: float) -> list[dict[str, Any]]:
    hop = 512
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop)
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop, n_mfcc=13)
    feat = np.vstack([librosa.util.normalize(chroma, axis=1), librosa.util.normalize(mfcc, axis=1)])
    k = int(np.clip(round(duration / 20), 2, 12))
    if duration < 15:
        k = 1
    idx = librosa.segment.agglomerative(feat, k) if k > 1 else np.array([0])
    bounds = sorted(set(float(t) for t in librosa.frames_to_time(idx, sr=sr, hop_length=hop)))
    bounds[0] = 0.0
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    ftimes = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    peak = rms.max() or 1.0
    energies, vecs = [], []
    for i, s in enumerate(bounds):
        e = bounds[i + 1] if i + 1 < len(bounds) else duration
        m = (ftimes >= s) & (ftimes < e)
        energies.append(float(rms[m].mean() / peak) if m.any() else 0.0)
        fm = (librosa.frames_to_time(np.arange(feat.shape[1]), sr=sr, hop_length=hop) >= s) & \
             (librosa.frames_to_time(np.arange(feat.shape[1]), sr=sr, hop_length=hop) < e)
        vecs.append(feat[:, fm].mean(axis=1) if fm.any() else np.zeros(feat.shape[0]))
    return _label_sections(bounds, np.array(vecs), energies, duration)


def analyze_file(path: str | Path) -> dict[str, Any]:
    p = Path(path)
    if p.suffix.lower() not in ALLOWED_EXT:
        raise ValueError("Only MP3 and WAV files are supported")
    if not p.is_file():
        raise FileNotFoundError(str(p))
    y, sr = librosa.load(str(p), sr=SR, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))
    if duration < 1.0:
        raise ValueError("Audio is too short to analyze")
    tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(np.atleast_1d(tempo)[0])
    curve = energy_curve(y, sr)
    return {
        "duration": round(duration, 3),
        "bpm": round(bpm, 2),
        "beats": [round(float(t), 3) for t in librosa.frames_to_time(beats, sr=sr)],
        "key": detect_key(y, sr),
        "sections": detect_sections(y, sr, duration),
        "drops": detect_drops(curve),
        "energy": curve,
        "method": "librosa-heuristic",
    }
