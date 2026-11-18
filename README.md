# Genius Sound — AI Music Video Studio

Turn a song into a cinematic music video: upload → analyze → creative direction → storyboard → AI scene generation → assembly → export → promo clips.
**Status: Phases 1–3 are wired end to end. Later phases have tested backend engines but no screens yet** — see `docs/IMPLEMENTATION_STATUS.md` for the honest list.

## Start it

```bash
./scripts/start.sh
```
Then open http://localhost:3876, create an account (the first account becomes admin), create a project, upload an MP3/WAV.
The script: creates `.env` (with a generated `AUTH_SECRET`), starts Postgres via Docker if needed, runs migrations, starts the media API (:8000), the job worker, and the web app (:3876).
Needs Node 20+, Python 3.10+, ffmpeg (`brew install ffmpeg`), and Docker *or* your own Postgres 16 (set `DATABASE_URL`).

## What is in here

| Part | Where | Notes |
|---|---|---|
| Web app (Next.js 16, React 19, Tailwind 4) | `src/` | Auth, projects, upload, analysis view, queue, settings. 11-section nav; unbuilt sections say so |
| Database (PostgreSQL + Prisma) | `prisma/` | 25 models; migrations in `prisma/migrations` |
| Job worker | `worker/` | Polls the `Job` table; retries, cancel, crash recovery. `npm run worker` |
| Media/AI service (FastAPI) | `api/` | Audio analysis, storyboard rules, providers, FFmpeg assembly, lyrics/karaoke, creative director, promo clips. See `docs/API_CONTRACT.md` |
| Docs | `docs/` | Architecture, licensing audit, integration report, status, contract |

Research repos live outside this project in `~/GeniusSound-Research/` and are not copied in (see `docs/COMPONENT_INTEGRATION_REPORT.md`).

## Commands

```bash
npm test                     # web + worker tests (vitest)
npm run lint && npm run typecheck
cd api && PYTHONPATH=. pytest -q   # media service tests
npm run worker               # job worker alone
```

## Configuration (`.env`, see `.env.example`)
`DATABASE_URL`, `AUTH_SECRET` (long random; required), `STORAGE_LOCAL_ROOT`, `API_URL`, `API_INTERNAL_TOKEN` (set when the API is reachable by anything but this app).
Generation providers (`COMFYUI_URL`+`COMFYUI_WORKFLOW_ID`, `REPLICATE_API_TOKEN`+`REPLICATE_MODEL_VERSION`, `FAL_KEY`+`FAL_MODEL_ID`) and the creative-director LLM (`LLM_BASE_URL`+`LLM_MODEL`, e.g. Ollama `http://localhost:11434/v1`) are optional. When a provider isn't configured the app says so — it never fakes output.

## Licensing
Commercial product. Read `docs/LICENSING_AUDIT.md` before adding any dependency, model or font. VocaVid is AGPL (no code copied); several OneShot MV models are research-only (blocked).
