"""HTTP surface of the media/AI service. Called by the Next.js app / workers, not by browsers.
If API_INTERNAL_TOKEN is set, every request must send header `X-Internal-Token`."""
from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import Any, Literal, Optional

from fastapi import APIRouter, Depends, File, Header, HTTPException, UploadFile
from pydantic import BaseModel, Field

from providers.base import GenerationRequest, ProviderError, ProviderNotConfigured, with_retry
from providers.registry import get_provider, list_providers
from services import assembly, creative_director, karaoke, lyrics as lyr, promo, storyboard
from services.audio_analysis import ALLOWED_EXT, analyze_file

MAX_UPLOAD = 100 * 1024 * 1024


def require_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    expected = os.getenv("API_INTERNAL_TOKEN", "")
    if expected and x_internal_token != expected:
        raise HTTPException(401, "Invalid internal token")


router = APIRouter(dependencies=[Depends(require_token)])


def storage_root() -> Path:
    return Path(os.getenv("STORAGE_LOCAL_ROOT", "./.data/storage")).resolve()


def safe_path(p: str) -> str:
    """Only allow files inside the storage root (blocks path traversal)."""
    full = (storage_root() / p).resolve() if not os.path.isabs(p) else Path(p).resolve()
    if storage_root() not in full.parents and full != storage_root():
        raise HTTPException(400, "Path is outside storage root")
    return str(full)


@router.post("/analysis")
async def analysis(file: UploadFile = File(...)) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise HTTPException(400, "Only MP3 and WAV files are supported")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        size = 0
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD:
                os.unlink(tmp.name)
                raise HTTPException(413, "File too large (100 MB max)")
            tmp.write(chunk)
    try:
        return analyze_file(tmp.name)
    except ValueError as e:
        raise HTTPException(422, str(e))
    finally:
        os.unlink(tmp.name)


class PromoIn(BaseModel):
    analysis: dict[str, Any]
    duration: Literal[10, 15, 30, 45, 60] = 15
    count: int = Field(3, ge=1, le=10)
    platform: Literal["TIKTOK", "INSTAGRAM_REELS", "YOUTUBE_SHORTS"] = "TIKTOK"


@router.post("/promo/suggest")
def promo_suggest(body: PromoIn) -> dict:
    try:
        return {"clips": promo.suggest_clips(body.analysis, body.duration, body.count, body.platform)}
    except ValueError as e:
        raise HTTPException(422, str(e))


class StoryboardIn(BaseModel):
    scenes: list[dict[str, Any]]
    action: str
    scene_id: Optional[str] = None
    args: dict[str, Any] = {}
    song_duration: Optional[float] = None


@router.post("/storyboard/apply")
def storyboard_apply(body: StoryboardIn) -> dict:
    try:
        scenes = storyboard.apply_action(body.scenes, body.action, body.scene_id, **body.args)
    except (storyboard.StoryboardError, KeyError) as e:
        raise HTTPException(422, str(e))
    issues = storyboard.validate_timeline(scenes, body.song_duration) if body.song_duration else []
    return {"scenes": scenes, "timeline_issues": issues}


@router.get("/providers")
def providers() -> dict:
    return {"providers": list_providers()}


class GenIn(BaseModel):
    provider: str
    kind: Literal["text_to_video", "image_to_video", "image", "lip_sync"]
    prompt: str
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    duration_sec: Optional[float] = None
    params: dict[str, Any] = {}


def _prov(name: str):
    try:
        return get_provider(name)
    except ProviderNotConfigured as e:
        raise HTTPException(503, str(e))
    except KeyError as e:
        raise HTTPException(404, str(e))


@router.post("/generate")
def generate(body: GenIn) -> dict:
    p = _prov(body.provider)
    req = GenerationRequest(body.kind, body.prompt, body.image_url, body.audio_url, body.duration_sec, body.params)
    try:
        return {"provider": p.name, "job_id": with_retry(lambda: p.submit(req))}
    except ProviderError as e:
        raise HTTPException(502, str(e))


@router.get("/generate/{provider}/{job_id}")
def generate_status(provider: str, job_id: str) -> dict:
    p = _prov(provider)
    try:
        s = with_retry(lambda: p.status(job_id))
    except ProviderError as e:
        raise HTTPException(502, str(e))
    return {"state": s.state, "progress": s.progress, "output_urls": s.output_urls, "error": s.error}


@router.post("/generate/{provider}/{job_id}/cancel")
def generate_cancel(provider: str, job_id: str) -> dict:
    p = _prov(provider)
    try:
        p.cancel(job_id)
    except ProviderError as e:
        raise HTTPException(502, str(e))
    return {"cancelled": True}


class ClipIn(BaseModel):
    path: str
    duration: float = Field(gt=0)


class RenderIn(BaseModel):
    clips: list[ClipIn] = Field(min_length=1)
    audio: Optional[str] = None
    output: str
    aspect: Literal["16:9", "9:16", "1:1"] = "16:9"
    quality: Literal["1080p", "4k"] = "1080p"
    transition: str = "fade"
    transition_sec: float = Field(0.5, ge=0, le=3)
    preview: bool = False
    subtitles: Optional[str] = None


@router.post("/render")
def render(body: RenderIn) -> dict:
    clips = [assembly.Clip(safe_path(c.path), c.duration) for c in body.clips]
    try:
        return assembly.assemble(clips, safe_path(body.audio) if body.audio else None, safe_path(body.output),
                                 aspect=body.aspect, quality=body.quality, transition=body.transition,
                                 transition_sec=body.transition_sec, preview=body.preview,
                                 subtitles=safe_path(body.subtitles) if body.subtitles else None)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))


# ---------------- Phase 8: lyrics ----------------
class AlignIn(BaseModel):
    lyrics: str
    asr_words: list[dict[str, Any]] = []
    song_duration: Optional[float] = None
    estimate_start: float = 0.0


@router.post("/lyrics/align")
def lyrics_align(body: AlignIn) -> dict:
    lines = lyr.parse_lyrics(body.lyrics)
    if not lines:
        raise HTTPException(422, "No lyric lines found")
    if body.asr_words:
        return lyr.align(lines, body.asr_words, song_duration=body.song_duration)
    if not body.song_duration:
        raise HTTPException(422, "Provide asr_words, or song_duration for estimated timing")
    return lyr.estimate_timing(lines, body.estimate_start, body.song_duration)


@router.post("/lyrics/transcribe")
async def lyrics_transcribe(file: UploadFile = File(...), language: Optional[str] = None) -> dict:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in ALLOWED_EXT:
        raise HTTPException(400, "Only MP3 and WAV files are supported")
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        size = 0
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_UPLOAD:
                os.unlink(tmp.name)
                raise HTTPException(413, "File too large (100 MB max)")
            tmp.write(chunk)
    try:
        return {"words": lyr.transcribe(tmp.name, language)}
    except lyr.TranscriptionUnavailable as e:
        raise HTTPException(503, str(e))
    finally:
        os.unlink(tmp.name)


class AssIn(BaseModel):
    lines: list[dict[str, Any]]
    template: str = "classic_karaoke"
    aspect: Literal["16:9", "9:16", "1:1"] = "16:9"
    overrides: dict[str, Any] = {}


@router.post("/lyrics/ass")
def lyrics_ass(body: AssIn) -> dict:
    try:
        return {"ass": karaoke.generate_ass(body.lines, body.template, body.aspect, body.overrides),
                "srt": karaoke.generate_srt(body.lines), "templates": list(karaoke.TEMPLATES)}
    except ValueError as e:
        raise HTTPException(422, str(e))


class LyricVideoIn(BaseModel):
    lines: list[dict[str, Any]]
    audio: str
    output: str
    duration: float = Field(gt=0)
    background: Optional[str] = None
    template: str = "classic_karaoke"
    aspect: Literal["16:9", "9:16", "1:1"] = "16:9"
    quality: Literal["1080p", "4k"] = "1080p"
    preview: bool = False
    overrides: dict[str, Any] = {}
    start: float = Field(0.0, ge=0)  # promo clips: render only [start, start+duration) of the song


def shift_lines(lines: list[dict[str, Any]], start: float, end: float) -> list[dict[str, Any]]:
    """Keep lines that overlap [start, end), re-based to 0. Words fully outside the window are dropped."""
    out = []
    for ln in lines:
        ws = [{**w, "start": max(0.0, w["start"] - start), "end": min(end - start, w["end"] - start)}
              for w in ln.get("words", []) if w["end"] > start and w["start"] < end]
        if ws:
            out.append({**ln, "words": ws, "start": ws[0]["start"], "end": ws[-1]["end"]})
    return out


@router.post("/render/lyric-video")
def render_lyric_video(body: LyricVideoIn) -> dict:
    out = safe_path(body.output)
    try:
        lines = shift_lines(body.lines, body.start, body.start + body.duration) if body.start > 0 else body.lines
        ass_text = karaoke.generate_ass(lines, body.template, body.aspect, body.overrides)
        Path(out).parent.mkdir(parents=True, exist_ok=True)
        ass_path = out + ".ass"
        Path(ass_path).write_text(ass_text, encoding="utf-8")
        return assembly.render_lyric_video(safe_path(body.background) if body.background else None, safe_path(body.audio),
                                           ass_path, out, body.duration, aspect=body.aspect, quality=body.quality,
                                           preview=body.preview, audio_start=body.start)
    except ValueError as e:
        raise HTTPException(422, str(e))
    except RuntimeError as e:
        raise HTTPException(500, str(e))


# ---------------- Phase 4: creative director ----------------
class ConceptsIn(BaseModel):
    analysis: dict[str, Any]
    lyrics: str = ""
    instructions: str = ""
    count: int = Field(3, ge=1, le=6)


class StoryboardGenIn(BaseModel):
    analysis: dict[str, Any]
    concept: dict[str, Any]
    lyrics: str = ""
    instructions: str = ""
    artist_notes: str = ""


def _llm_call(fn):
    try:
        return fn()
    except ProviderNotConfigured as e:
        raise HTTPException(503, str(e))
    except ProviderError as e:
        raise HTTPException(502, str(e))


@router.post("/director/concepts")
def director_concepts(body: ConceptsIn) -> dict:
    llm = creative_director.LLM()
    return {"concepts": _llm_call(lambda: creative_director.generate_concepts(llm, body.analysis, body.lyrics, body.instructions, body.count))}


@router.post("/director/storyboard")
def director_storyboard(body: StoryboardGenIn) -> dict:
    llm = creative_director.LLM()
    scenes = _llm_call(lambda: creative_director.generate_storyboard(llm, body.analysis, body.concept, body.lyrics,
                                                                     body.instructions, body.artist_notes))
    return {"scenes": scenes}
