# Component Integration Report

Source: `~/GeniusSound-Research/` (read 2026-11-17). Repos stay separate; nothing is copied wholesale. Licence status: see `LICENSING_AUDIT.md`.

## PySceneDetect (BSD-3) — USE as dependency
- **Provides:** shot/scene boundary detection, video splitting.
- **Useful:** `scenedetect/detectors/` (`content_detector.py`, `adaptive_detector.py`, `threshold_detector.py`, `hash_detector.py`, `histogram_detector.py`, optional `transnet_v2.py`), `scene_manager.py`, `video_splitter.py`, `frame_timecode.py`.
- **Dependencies:** click, numpy, opencv-python, platformdirs, tqdm; optional av, moviepy.
- **Genius Sound use:** (a) cut generated clips / reference footage into shots, (b) detect cuts when scoring generated scenes, (c) promo-clip boundary snapping.
- **Adapt:** wrap in `api/services/scenes.py`; pin version; do not vendor.

## OpenMontage (MIT) — ADAPT ideas/modules with attribution
- **Provides:** agentic production pipeline helpers.
- **Useful files (`lib/`):** `scoring.py` (weighted, explainable provider/path scoring → our provider selection), `clip_embedder.py` + `corpus.py` (CLIP embeddings and media corpus for asset-library search), `shot_prompt_builder.py` (shot prompt structure for storyboard → generation prompts), `verify_scene_pacing.py` (pacing checks vs song sections), `checkpoint.py` (resumable pipeline state → our job recovery), `delivery_promise.py` / `variation_checker.py`.
- **Dependencies:** to verify per module (CLIP needs torch/open_clip or similar).
- **Adapt:** reimplement against our Prisma models; keep MIT notice in `third_party/openmontage/NOTICE` if code is copied.
- **Not reusing yet:** `lib/providers` (needs separate licence/terms review).

## ComfyUI-OneShotMV (MIT code, restricted models) — ADAPT workflow structure only
- **Provides:** ComfyUI nodes + SDK for lip-synced, multi-take music video generation (`nodes.py`, `sdk_run.py`, `studio_routes.py`, `fv/`, `example_workflows/`, `api/`).
- **Useful:** the take-generation → sync-score → pick-best workflow pattern; example workflow JSON as reference for our ComfyUI adapter.
- **Dependencies:** ComfyUI, torch, LTX-2.3, Krea 2, etc.
- **Cannot use commercially as shipped:** SyncNet/S3FD (research), Qwen-Image 2.1 (research licence), unlicensed enhance LoRAs, InsightFace weights. LTX-2.3 and Krea 2 only under their revenue caps.
- **Adapt:** our ComfyUI adapter submits workflows we author with approved models only.

## VocaVid (AGPL-3.0) — DO NOT COPY; reimplement
- **Provides:** lyric alignment (`alignment.py`, `timing.py`, `lyrics.py`), scene planning (`sceneplan.py`, `prompt_templates.py`, `promptgen.py`, `prompts/`), ComfyUI client (`comfy.py`), assembly (`assembly.py`), worker/pipeline (`worker.py`, `pipeline.py`), `workflows/*.json`.
- **Value as reference:** pipeline staging, lyric→scene planning approach, word alignment with faster-whisper + rapidfuzz (those two libraries are MIT and may be used directly).
- **Independent implementation:** forced alignment from faster-whisper word timestamps + rapidfuzz matching against user lyrics; our own scene-planning prompts; our own ComfyUI client.
- **Do not:** paste code, prompts, workflow JSON or UI from VocaVid into Genius Sound.

## Remotion — DEFER pending licence decision
- **Provides:** React-based programmatic video (animated typography, karaoke lyrics, templates).
- **Useful:** `@remotion/captions`, `@remotion/renderer`, composition API for lyric-video templates.
- **Blocked on:** company-size/commercial-use check (see audit). Fallback: FFmpeg `drawtext`/ASS subtitles rendered by our own service.

## Independently implemented regardless
Audio analysis (librosa: BPM, key, sections, drops, energy), storyboard/versioning, identity-reference tooling, job queue, FFmpeg assembly and promo-clip selection.

---
## Update 2026-11-18 — what is actually integrated

Earlier revisions of this report only *recommended* integrations. Now implemented (see `third_party/README.md`):

| Repo | In the app now | Endpoint | Tests |
|---|---|---|---|
| PySceneDetect | `services/scenes.py` (detect, merge short, snap-to-cuts) via pip dependency | `POST /scenes/detect` | real-cut test on synthetic clip |
| OpenMontage | `services/pacing.py` (gaps, overlaps, long/short scenes, section coverage, off-beat cuts, shot-variation), `services/shot_prompts.py` | `POST /pacing/check`, `POST /prompts/shot` | test_research.py |
| OneShotMV | `services/takes.py` multi-take scoring/selection (clean-room, no restricted models) | `POST /takes/pick` | test_research.py |
| VocaVid | Nothing (AGPL). Independent implementation only | — | — |
| Remotion | Nothing (license decision pending) | — | — |

Not yet wired into the UI/worker: scene detection on generated clips, pacing check on the storyboard screen, multi-take generation in the worker (each take costs ~15 min locally). OpenMontage `scoring.py`, `checkpoint.py`, `slideshow_risk.py` remain candidates.
