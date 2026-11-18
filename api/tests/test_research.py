import shutil, subprocess
import pytest
from fastapi.testclient import TestClient
from main import app
from services import pacing, takes, shot_prompts, scenes

c = TestClient(app)


def test_pacing_flags_problems():
    sc = [{"start": 0, "end": 20}, {"start": 22, "end": 22.3}]
    r = pacing.check_pacing(sc, [{"start": 40, "label": "chorus"}])
    kinds = {i["type"] for i in r["issues"]}
    assert {"too_long", "too_short", "gap", "section_unmatched"} <= kinds and not r["ok"]


def test_pacing_ok():
    sc = [{"start": 0, "end": 5}, {"start": 5, "end": 10}]
    assert pacing.check_pacing(sc, [{"start": 5, "label": "verse"}])["ok"]


def test_takes_pick_and_ignore_missing():
    r = takes.pick_best([{"id": "a", "scores": {"prompt_match": .9}}, {"id": "b", "scores": {"prompt_match": .5, "motion": .9}},
                         {"id": "c", "error": "boom"}])
    assert r["best"] == "a" and r["ranking"][-1]["score"] == 0
    assert takes.pick_best([{"id": "x"}])["best"] is None


def test_shot_prompt_layers():
    p = shot_prompts.build_shot_prompt({"description": "dancer on rooftop", "shot_language": {"shot_size": "wide", "camera_movement": "dolly_in", "lighting_key": "neon", "lens_mm": 35}}, {"mood": "gritty"})
    assert "35mm" in p and "wide shot" in p and "dolly in" in p and "neon" in p and "Style: gritty" in p


def test_endpoints():
    assert c.post("/pacing/check", json={"scenes": [{"start": 0, "end": 3}]}).json()["ok"] is True
    assert "prompt" in c.post("/prompts/shot", json={"scene": {"description": "x"}}).json()
    assert c.post("/takes/pick", json={"takes": []}).json()["best"] is None
    assert c.post("/scenes/detect", json={"storage_key": "../../etc/passwd"}).status_code in (400, 404)


@pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg missing")
def test_detect_real_cut(tmp_path):
    f = tmp_path / "cut.mp4"
    subprocess.run(["ffmpeg", "-y", "-f", "lavfi", "-i", "color=c=black:s=160x90:d=2:r=24", "-f", "lavfi", "-i", "color=c=white:s=160x90:d=2:r=24",
                    "-filter_complex", "[0][1]concat=n=2:v=1:a=0", "-pix_fmt", "yuv420p", str(f)], check=True, capture_output=True)
    out = scenes.detect_scenes(f, detector="content")
    assert len(out) == 2 and abs(out[0]["end"] - 2.0) < 0.2
    assert scenes.snap_to_cuts([1.9, 5.0], [2.0]) == [2.0, 5.0]
