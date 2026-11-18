<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## HANDOFF — read this first (updated 2026-11-18)

All 11 phases now have working code, screens and tests, but **nothing has run against a real PostgreSQL, a real LLM, a real ComfyUI or a real browser.** You are resuming to verify and fix. Do not start over.

**Rules (unchanged):** no fake data or fake generation results; every visible control must work or be clearly marked "not built"; no hardcoded keys; never claim something works unless tested; commercial licensing is audited — read `docs/LICENSING_AUDIT.md` before adding any dependency, model or font; never copy VocaVid (AGPL) code. Do not recreate the deleted fake `backend/`.

**Map:** web app `src/` (API routes `src/app/api/`, libs `src/lib/`, screens `src/app/dashboard/` + `src/components/`), job worker `worker/` (handlers: song analysis, lyric/promo/final render, Whisper sync, scene generation — each with tests), media/AI engines `api/` (FastAPI; wire to them, don't reimplement). Status table: `docs/IMPLEMENTATION_STATUS.md`. Local GPU setup: `docs/LOCAL_COMFYUI.md`.

**First task, in order:**
1. `./scripts/start.sh`; register; create a project; upload a song; confirm analysis completes against real Postgres. Fix what breaks and add tests.
2. Lyrics screen: save lyrics, render a lyric video, download it. Then promo clip.
3. Configure an LLM (`LLM_BASE_URL`/`LLM_MODEL`), generate concepts and a storyboard.
4. Download the Wan 2.2 files (docs/LOCAL_COMFYUI.md), start ComfyUI, generate one scene. The workflow JSONs in `api/workflows/` have never been executed; the `SaveVideo` format/codec inputs are the likely failure point (re-export in API format if rejected).
5. Export the final video.

**Known gaps:** S3 storage driver (`STORAGE_DRIVER=s3` throws; the media service shares a local storage root); lyric videos use a plain background (scene clips are not yet used as backgrounds); load testing, deployment and a full security review; browser UI never visually checked.
