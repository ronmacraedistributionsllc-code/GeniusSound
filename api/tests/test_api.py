

def test_shift_lines_rebases_and_drops_outside_words():
    from routes.api import shift_lines
    lines = [{"text": "a b", "words": [{"word": "a", "start": 9.0, "end": 9.5}, {"word": "b", "start": 11.0, "end": 11.5}]},
             {"text": "far", "words": [{"word": "far", "start": 40.0, "end": 41.0}]}]
    out = shift_lines(lines, 10.0, 25.0)
    assert len(out) == 1 and [w["word"] for w in out[0]["words"]] == ["b"]
    assert out[0]["words"][0]["start"] == 1.0 and out[0]["start"] == 1.0


def test_lyric_video_command_seeks_audio():
    from services.assembly import lyric_video_command
    cmd = lyric_video_command(None, "a.wav", "s.ass", "o.mp4", 15, audio_start=30)
    i = cmd.index("-ss"); assert cmd[i + 1] == "30.000" and cmd[i + 2] == "-i" and cmd[i + 3] == "a.wav"


def test_lyric_video_overlay_fallback_renders(tmp_path):
    """Works without libass: Pillow overlay piped to ffmpeg."""
    import shutil, subprocess
    from services import assembly
    if not shutil.which("ffmpeg"):
        import pytest; pytest.skip("ffmpeg missing")
    wav = tmp_path / "t.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", str(wav)], check=True)
    lines = [{"words": [{"word": "hello", "start": 0.2, "end": 0.8}, {"word": "world", "start": 0.8, "end": 1.4}]}]
    old = assembly._ASS_BROKEN
    assembly._ASS_BROKEN = True
    try:
        r = assembly.render_lyric_video(None, str(wav), "/nope.ass", str(tmp_path / "o.mp4"), 2.0, preview=True,
                                        fallback={"lines": lines, "template": "classic_karaoke", "overrides": {}})
    finally:
        assembly._ASS_BROKEN = old
    assert r["renderer"] == "overlay" and r["duration"] > 1.9
