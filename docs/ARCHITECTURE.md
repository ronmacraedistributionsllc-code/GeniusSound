# Genius Sound — Architecture

Status: Phase 1 design. Describes what exists and what is planned; see `IMPLEMENTATION_STATUS.md` for what is built.

## 1. System overview

```
Browser ──► Next.js (src/)  ──► PostgreSQL (Prisma)
              │  ▲                 ▲
              │  │ status/results  │
              ▼  │                 │
         Job table (DB queue) ◄── Worker(s) ──► FastAPI media/AI service (api/)
                                       │                 │
                                       │                 ├─► FFmpeg (subprocess)
                                       │                 ├─► Audio analysis (librosa)
                                       │                 ├─► Transcription provider
                                       │                 └─► Generation providers (ComfyUI / cloud GPU / APIs)
                                       ▼
                               Object storage (local dir or S3-compatible)
```

## 2. Components

| Component | Tech | Responsibility |
|---|---|---|
| Web app | Next.js 16, React 19, Tailwind 4, TypeScript | UI, auth, project CRUD, REST/route handlers, job submission |
| DB | PostgreSQL + Prisma | All persistent state (25 models, see `prisma/schema.prisma`) |
| Media/AI service | Python FastAPI (`api/`) | Audio analysis, scene detection, FFmpeg work, provider calls |
| Worker | Polls `Job` table (Redis optional later) | Runs long tasks; never inside a web request |
| Storage | Local dir (`STORAGE_DRIVER=local`) or S3-compatible | Audio, images, generated clips, renders |
| Providers | Adapter layer, one adapter per provider | ComfyUI, Replicate, fal, transcription; returns real results or an explicit error |

## 3. Job model

Long-running work (analysis, generation, render) is a row in `Job` (types/status enums in the schema).
Lifecycle: `QUEUED → RUNNING → SUCCEEDED | FAILED | CANCELLED`, with attempt count + retry, progress %, error text.
The web app only inserts jobs and reads status. Workers claim jobs (`WORKER_CONCURRENCY`, `WORKER_POLL_MS`).
A failed or interrupted job is recoverable: state is in the DB, not in memory.

## 4. Provider rule (no fake output)

Every generation provider adapter must either return a real asset from a real provider or raise a typed error
("provider not configured", "provider failed"). No placeholder videos, no simulated success.

## 5. Data model highlights

Users/Sessions → Projects → AudioUpload, ArtistReference/CharacterReference (+ReferenceImage), SongAnalysis → SongSection,
CreativeTreatment, Storyboard → StoryboardScene → SceneVersion/SceneGeneration, Lyrics → LyricLine → WordTimestamp,
RenderJob → RenderOutput, PromoClip, AiProvider, UsageRecord (cost tracking), Job.
Approved/locked scenes are protected: regeneration writes a new `SceneVersion`, never overwrites an approved one.

## 6. Security

Auth via sessions (bcrypt password hashes, `AUTH_SECRET`); every query scoped by `userId`; zod validation on all inputs;
uploads restricted to MP3/WAV (+ image types for references) with size limits; secrets only via env vars.

## 7. Third-party code

Research repos in `../GeniusSound-Research/` are kept separate and are never copied wholesale.
Licence decisions: `LICENSING_AUDIT.md`. Per-repo reuse plan: `COMPONENT_INTEGRATION_REPORT.md`.
Any adapted code goes under `third_party/<repo>/` with its LICENSE and a NOTICE of origin.

## 8. Stack deviations

None so far. Redis is deferred: the Postgres-backed `Job` table is the queue until load requires Redis.
