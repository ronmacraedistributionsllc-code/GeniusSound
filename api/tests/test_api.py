

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
