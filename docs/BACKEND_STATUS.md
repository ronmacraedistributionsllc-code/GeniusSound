# Backend (api/) — status as of 2026-11-17

Built and tested (`cd api && PYTHONPATH=. pytest` → 36 passing):
- Phase 3 engine: `services/audio_analysis.py` (BPM, key, duration, sections, drops, energy) — tested on synthetic audio only.
- Phase 5 rules: `services/storyboard.py` (versions, lock, approve, no-overwrite of approved scenes, reorder, timeline validation).
- Phase 6 layer: `providers/` ComfyUI, Replicate, fal + retry + registry — tested against MOCKED HTTP only. Never run against a live provider.
- Phase 9 engine: `services/assembly.py` — real FFmpeg run in tests: 16:9, 9:16, 1:1, crossfades, audio mux.
- Phase 10 engine: `services/promo.py`.
- Phase 8 engine: `services/lyrics.py` (parse, ASR via faster-whisper, DP alignment w/ interpolation), `services/karaoke.py` (ASS/SRT, 3 templates), lyric-video render in `services/assembly.py` (real FFmpeg+libass run in tests). Transcription itself NOT run (model not downloaded); alignment tested with synthetic ASR words.
- Phase 4 engine: `services/creative_director.py` — OpenAI-compatible LLM client, JSON schema validation + repair loop, timeline normalisation. Tested with a MOCKED LLM only; prompt quality is untested on a real model.
- Ops: `docker-compose.yml`, `api/Dockerfile`, `scripts/start.sh` (syntax-checked only, not executed end-to-end), `.github/workflows/ci.yml` (not run).
- HTTP routes `routes/api.py` + `docs/API_CONTRACT.md`; token guard, upload limits, path-traversal guard.

NOT built (needs the Next.js side / other work):
- Job-table worker that calls these services; saving results to Prisma.
- All UI, auth, uploads to storage, downloading generated assets into storage.
- Phase 7 identity consistency, 4K/real-GPU performance tuning, Phase 11 security review/deployment, Remotion-based templates (licence undecided; ASS lyric videos work without it).
- Live verification of ComfyUI/Replicate/fal; a ComfyUI workflow JSON built from approved models.
