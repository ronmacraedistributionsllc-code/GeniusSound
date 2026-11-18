"""Phase 4: AI creative director.

Turns song analysis + lyrics + user instructions into music-video concepts and a scene-by-scene
storyboard. Uses ANY OpenAI-compatible chat endpoint, so it works with a local model
(Ollama / LM Studio: LLM_BASE_URL=http://localhost:11434/v1) or a cloud API.

Safety rails: the model's JSON is validated with pydantic; invalid output is sent back once for
repair; scene times are normalised onto the real song timeline. If no LLM is configured we raise
ProviderNotConfigured — we never fabricate concepts.
"""
from __future__ import annotations

import json
import os
import re
from typing import Any, Optional

import httpx
from pydantic import BaseModel, Field, ValidationError

from providers.base import ProviderError, ProviderNotConfigured, raise_for_http

SYSTEM = (
    "You are an award-winning music-video director with 20 years of experience in cinematic storytelling. "
    "You create visually stunning, emotionally resonant concepts that push creative boundaries. "
    "Think like a Spike Jonze, Hype Williams, or Anton Corbijn. Design ideas with specific visual references, "
    "color theory, cinematography techniques, and mood that perfectly match the song's energy and lyrics. "
    "Every concept should feel like a blockbuster music video. Respond with JSON only, no commentary."
)


class Concept(BaseModel):
    title: str
    logline: str
    mood: str
    visual_style: str
    color_palette: list[str] = Field(default_factory=list)
    locations: list[str] = Field(default_factory=list)
    treatment: str = ""


class ConceptList(BaseModel):
    concepts: list[Concept] = Field(min_length=1)


class SceneSpec(BaseModel):
    start: float = Field(ge=0)
    end: float = Field(gt=0)
    section: Optional[str] = None
    lyrics: Optional[str] = None
    description: str
    location: str
    characters: list[str] = Field(default_factory=list)
    wardrobe: Optional[str] = None
    vehicles: list[str] = Field(default_factory=list)
    props: list[str] = Field(default_factory=list)
    camera_angle: str
    camera_movement: str
    lighting: str
    transition: str = "cut"


class SceneList(BaseModel):
    scenes: list[SceneSpec] = Field(min_length=1)


class LLM:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None, model: Optional[str] = None,
                 client: Optional[httpx.Client] = None):
        self.base_url = (base_url if base_url is not None else os.getenv("LLM_BASE_URL", "")).rstrip("/")
        self.api_key = api_key if api_key is not None else os.getenv("LLM_API_KEY", "")
        self.model = model if model is not None else os.getenv("LLM_MODEL", "")
        if not self.base_url and os.getenv("OPENAI_API_KEY") and base_url is None:
            self.base_url, self.api_key = "https://api.openai.com/v1", os.environ["OPENAI_API_KEY"]
            self.model = self.model or "gpt-4o-mini"
        self.client = client or httpx.Client(timeout=300)

    def configured(self) -> bool:
        return bool(self.base_url and self.model)

    def chat(self, messages: list[dict]) -> str:
        if not self.configured():
            raise ProviderNotConfigured("No LLM configured (set LLM_BASE_URL + LLM_MODEL, or OPENAI_API_KEY)")
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            r = self.client.post(f"{self.base_url}/chat/completions", headers=headers,
                                 json={"model": self.model, "messages": messages, "temperature": 0.8})
        except httpx.HTTPError as e:
            raise ProviderError(f"LLM unreachable: {e}", retryable=True)
        raise_for_http(r)
        try:
            return r.json()["choices"][0]["message"]["content"]
        except (KeyError, IndexError, ValueError) as e:
            raise ProviderError(f"Unexpected LLM response shape: {e}")


def extract_json(text: str) -> Any:
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.MULTILINE).strip()
    try:
        return json.loads(text)
    except ValueError:
        s, e = text.find("{"), text.rfind("}")
        if s == -1 or e <= s:
            raise ValueError("No JSON object found in model output")
        return json.loads(text[s:e + 1])


def _ask(llm: LLM, user_prompt: str, model_cls, retries: int = 1):
    msgs = [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user_prompt}]
    last_err = ""
    for attempt in range(retries + 1):
        raw = llm.chat(msgs)
        try:
            return model_cls.model_validate(extract_json(raw))
        except (ValueError, ValidationError) as e:
            last_err = str(e)[:600]
            msgs += [{"role": "assistant", "content": raw},
                     {"role": "user", "content": f"That JSON was invalid: {last_err}\nReturn corrected JSON only."}]
    raise ProviderError(f"Model did not return valid JSON after {retries + 1} attempts: {last_err}")


def _song_brief(analysis: dict, lyrics: str) -> str:
    secs = "\n".join(f"- {s['label']} {s['start']:.1f}s-{s['end']:.1f}s (energy {s['energy']:.2f})" for s in analysis["sections"])
    drops = ", ".join(f"{d['t']:.1f}s" for d in analysis.get("drops", [])) or "none"
    return (f"SONG: {analysis['duration']:.1f}s, {analysis['bpm']:.0f} BPM, key {analysis['key']['key']}.\n"
            f"SECTIONS:\n{secs}\nBEAT DROPS at: {drops}\nLYRICS:\n{lyrics.strip() or '(instrumental / not provided)'}")


def generate_concepts(llm: LLM, analysis: dict, lyrics: str = "", instructions: str = "", count: int = 3) -> list[dict]:
    prompt = (f"{_song_brief(analysis, lyrics)}\n\nDIRECTOR NOTES FROM CLIENT: {instructions or 'none'}\n\n"
              f"Propose {count} wildly different, visually stunning music-video concepts that feel cinematic and original:\n\n"
              "For EACH concept include:\n"
              "- title: Catchy, memorable concept name\n"
              "- logline: 1-line pitch (like a movie trailer)\n"
              "- mood: Emotional atmosphere (e.g., 'dark & introspective', 'euphoric & surreal', 'gritty & raw')\n"
              "- visual_style: Specific cinematographic style (mention lighting, color grading, texture, reference filmmakers like Spike Jonze, David Fincher, Hype Williams, etc.)\n"
              "- color_palette: 3-5 dominant colors with emotional weight\n"
              "- locations: Specific, visually interesting places (not generic)\n"
              "- treatment: 2-3 paragraphs of CINEMATIC detail—describe camera work, composition, visual metaphors, production design. Make it feel like a world-class music video.\n\n"
              "JSON schema:\n"
              '{"concepts":[{"title":str,"logline":str,"mood":str,"visual_style":str,"color_palette":[str],'
              '"locations":[str],"treatment":str}]}')
    return [c.model_dump() for c in _ask(llm, prompt, ConceptList).concepts]


def normalize_scenes(scenes: list[dict], duration: float, min_len: float = 1.0) -> list[dict]:
    """Snap model scene times onto a gapless, in-bounds timeline that covers the whole song."""
    sc = sorted(scenes, key=lambda s: s["start"])
    sc = [s for s in sc if s["start"] < duration]
    if not sc:
        raise ProviderError("Model returned no scenes inside the song duration")
    sc[0]["start"] = 0.0
    for i, s in enumerate(sc):
        s["end"] = min(s["end"], duration)
        nxt = sc[i + 1]["start"] if i + 1 < len(sc) else duration
        s["end"] = nxt if i + 1 < len(sc) else duration  # gapless: each scene ends where the next begins
        if s["end"] - s["start"] < min_len and i + 1 < len(sc):
            sc[i + 1]["start"] = min(duration, s["start"] + min_len)
            s["end"] = sc[i + 1]["start"]
    sc = [s for s in sc if s["end"] - s["start"] > 0.05]
    for i, s in enumerate(sc):
        s["number"] = i + 1
        s["start"], s["end"] = round(s["start"], 3), round(s["end"], 3)
    return sc


def generate_storyboard(llm: LLM, analysis: dict, concept: dict, lyrics: str = "", instructions: str = "",
                        artist_notes: str = "") -> list[dict]:
    prompt = (f"{_song_brief(analysis, lyrics)}\n\nCHOSEN CONCEPT: {json.dumps(concept)}\n"
              f"CLIENT NOTES: {instructions or 'none'}\nARTIST / CHARACTER NOTES: {artist_notes or 'none'}\n\n"
              "Write a CINEMATIC scene-by-scene storyboard covering the whole song. Cut on section boundaries and beat drops. "
              "Each scene = 3-12 seconds for AI video generation.\n\n"
              "For EACH scene:\n"
              "- description: VIVID, CINEMATIC detail. Describe movement, composition, action, mood, visual effects. "
              "Be specific: 'wide shot of silhouettes walking through neon rain, shallow depth of field, lens flare' not just 'people walking'\n"
              "- camera_angle: Specific angle (e.g., 'extreme wide shot from above', 'tight close-up', 'Dutch angle', '45-degree bird\'s eye')\n"
              "- camera_movement: Specific movement (e.g., 'slow dolly forward', 'quick whip pan', 'tracking shot left', 'static')\n"
              "- lighting: Mood & technique (e.g., 'hard rim lighting, blue gels, volumetric haze', 'natural golden hour with long shadows')\n"
              "- location: Specific, evocative place\n"
              "- transition: How it cuts (cut, fade, dissolve, match cut)\n\n"
              "Make each description FILMIC and SPECIFIC. Think shot lists from actual music videos.\n\n"
              "JSON schema:\n"
              '{"scenes":[{"start":sec,"end":sec,"section":str,"lyrics":str,"description":str,"location":str,'
              '"characters":[str],"wardrobe":str,"vehicles":[str],"props":[str],"camera_angle":str,'
              '"camera_movement":str,"lighting":str,"transition":str}]}')
    parsed = _ask(llm, prompt, SceneList)
    return normalize_scenes([s.model_dump() for s in parsed.scenes], analysis["duration"])
