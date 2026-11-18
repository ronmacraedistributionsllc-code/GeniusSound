from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_ok():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "ffmpeg" in body


def test_api_routes_and_guards(tmp_path, monkeypatch):
    import soundfile as sf, numpy as np
    monkeypatch.setenv("STORAGE_LOCAL_ROOT", str(tmp_path))
    assert client.get("/providers").json()["providers"]
    # bad extension rejected
    r = client.post("/analysis", files={"file": ("x.ogg", b"abc")})
    assert r.status_code == 400
    # unconfigured provider => honest 503, no fake output
    monkeypatch.delenv("FAL_KEY", raising=False)
    r = client.post("/generate", json={"provider": "fal", "kind": "text_to_video", "prompt": "x"})
    assert r.status_code == 503
    # path traversal blocked
    r = client.post("/render", json={"clips": [{"path": "../../etc/passwd", "duration": 3}], "output": "o.mp4"})
    assert r.status_code == 400
    # token guard
    monkeypatch.setenv("API_INTERNAL_TOKEN", "secret")
    assert client.get("/providers").status_code == 401
    assert client.get("/providers", headers={"X-Internal-Token": "secret"}).status_code == 200
    # storyboard lock rule over HTTP
    monkeypatch.delenv("API_INTERNAL_TOKEN")
    from services.storyboard import new_scene
    sc = [new_scene(0, description="a")]
    locked = client.post("/storyboard/apply", json={"scenes": sc, "action": "lock", "scene_id": sc[0]["id"]}).json()["scenes"]
    assert client.post("/storyboard/apply", json={"scenes": locked, "action": "edit", "scene_id": sc[0]["id"], "args": {"fields": {"description": "b"}}}).status_code == 422
    # real analysis through HTTP
    t = np.arange(22050 * 12) / 22050
    sf.write(tmp_path / "t.wav", (0.3 * np.sin(2 * np.pi * 220 * t)).astype("float32"), 22050)
    r = client.post("/analysis", files={"file": ("t.wav", (tmp_path / "t.wav").read_bytes())})
    assert r.status_code == 200 and abs(r.json()["duration"] - 12) < 0.1


def test_lyrics_and_director_routes(monkeypatch):
    for v in ("LLM_BASE_URL", "LLM_MODEL", "OPENAI_API_KEY", "API_INTERNAL_TOKEN"):
        monkeypatch.delenv(v, raising=False)
    r = client.post("/lyrics/align", json={"lyrics": "[Verse]\nhello world there", "song_duration": 9})
    assert r.status_code == 200 and r.json()["lines"][0]["words"][0]["source"] == "estimated"
    assert client.post("/lyrics/align", json={"lyrics": "hello"}).status_code == 422
    ass = client.post("/lyrics/ass", json={"lines": r.json()["lines"], "template": "bold_center"}).json()
    assert "Dialogue:" in ass["ass"]
    assert client.post("/lyrics/ass", json={"lines": [], "template": "zzz"}).status_code == 422
    an = {"duration": 30.0, "bpm": 90, "key": {"key": "C major"}, "sections": [], "drops": []}
    assert client.post("/director/concepts", json={"analysis": an}).status_code == 503  # no LLM => honest error
