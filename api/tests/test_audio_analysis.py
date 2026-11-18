import numpy as np
import pytest
import soundfile as sf

from services.audio_analysis import analyze_file, detect_drops

SR = 22050


def _song(path, bpm=120.0):
    """40s synthetic track: quiet A-minor intro, loud section, quiet, loud. Click on every beat."""
    t = np.arange(int(SR * 40)) / SR
    y = np.zeros_like(t)
    tones = [220.0, 261.63, 329.63]  # A minor triad
    for f in tones:
        y += np.sin(2 * np.pi * f * t) / 3
    amp = np.where(((t // 10) % 2) == 0, 0.15, 0.7)
    y *= amp
    step = 60.0 / bpm
    for b in np.arange(0, 40, step):
        i = int(b * SR)
        y[i:i + 400] += 0.8 * np.hanning(400) * np.sin(2 * np.pi * 1000 * t[:400])
    sf.write(path, (y / np.abs(y).max() * 0.9).astype("float32"), SR)


def test_analysis_basic(tmp_path):
    p = tmp_path / "a.wav"
    _song(p)
    r = analyze_file(p)
    assert abs(r["duration"] - 40.0) < 0.1
    # tempo detection may report half/double time
    assert any(abs(r["bpm"] - x) < 4 for x in (120, 60, 240)), r["bpm"]
    assert r["key"]["tonic"] in ("A", "C", "E")  # A minor / relative C major triad content
    assert r["sections"][0]["start"] == 0.0
    assert r["sections"][-1]["end"] == pytest.approx(r["duration"], abs=0.01)
    assert len(r["sections"]) >= 2
    assert len(r["energy"]) >= 39


def test_drops_found():
    curve = [{"t": float(i), "energy": 0.1 if i < 10 else 0.9} for i in range(20)]
    assert detect_drops(curve)[0]["t"] == 10.0


def test_rejects_bad_ext(tmp_path):
    f = tmp_path / "x.ogg"
    f.write_bytes(b"x")
    with pytest.raises(ValueError):
        analyze_file(f)
