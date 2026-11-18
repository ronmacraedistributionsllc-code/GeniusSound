import json
import shutil
import subprocess

import pytest

from services.assembly import Clip, assemble, build_command

pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")


def _make(path, color, dur=3):
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", f"color=c={color}:s=640x360:d={dur}:r=30",
                    "-pix_fmt", "yuv420p", str(path)], check=True)


def _probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height", "-show_entries",
                          "format=duration", "-of", "json", str(path)], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


@pytest.mark.parametrize("aspect,size", [("16:9", (1920, 1080)), ("9:16", (1080, 1920)), ("1:1", (1080, 1080))])
def test_assemble_formats(tmp_path, aspect, size):
    a, b = tmp_path / "a.mp4", tmp_path / "b.mp4"
    _make(a, "red"), _make(b, "blue")
    wav = tmp_path / "s.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "sine=f=440:d=10", str(wav)], check=True)
    out = tmp_path / "o.mp4"
    r = assemble([Clip(str(a), 3), Clip(str(b), 3)], str(wav), str(out), aspect=aspect, preview=False)
    info = _probe(out)
    v = next(s for s in info["streams"] if s["codec_type"] == "video")
    assert (v["width"], v["height"]) == size
    assert any(s["codec_type"] == "audio" for s in info["streams"])
    assert abs(r["duration"] - 5.5) < 0.3  # 3 + 3 - 0.5s crossfade


def test_validation():
    with pytest.raises(ValueError):
        build_command([], None, "o.mp4")
    with pytest.raises(ValueError):
        build_command([Clip("a", 3)], None, "o.mp4", aspect="4:3")
    with pytest.raises(ValueError):
        build_command([Clip("a", 3)], None, "o.mp4", transition="bogus")
