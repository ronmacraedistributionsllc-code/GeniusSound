# Genius Sound — Quick Start & Deployment

## Run Locally

```bash
cd /Users/geniussound/GeniusSound
./scripts/start.sh
```

Then open: **http://localhost:3876**

---

## Deploy to Production

**See:** `docs/PRODUCTION_DEPLOYMENT.md` for comprehensive guide

### Quick Deploy Path

**Option A: Vercel + Supabase + R2 (Easiest)**
1. Connect GitHub repo to Vercel
2. Create Supabase project (PostgreSQL)
3. Create Cloudflare R2 bucket
4. Set environment variables in Vercel:
   ```
   DATABASE_URL = <Supabase connection string>
   AUTH_SECRET = <openssl rand -base64 32>
   STORAGE_DRIVER = s3
   S3_ENDPOINT = https://s3.example.r2.cloudflarestorage.com
   S3_BUCKET = geniussound
   S3_ACCESS_KEY_ID = <R2 credentials>
   S3_SECRET_ACCESS_KEY = <R2 credentials>
   API_URL = https://api.yourdomain.com
   ```
5. Deploy Media API to Render.com
6. Deploy Worker to Render.com
7. Done ✅

**Option B: AWS (Comprehensive)**
- RDS for PostgreSQL
- S3 for storage
- ECS for Web App, Media API, Worker
- See `docs/PRODUCTION_DEPLOYMENT.md`

**Option C: Self-hosted (Most Control)**
- Your own PostgreSQL
- MinIO for S3-compatible storage
- Docker containers for Web App, API, Worker
- See `docs/PRODUCTION_DEPLOYMENT.md`

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/dashboard` | Web UI (11 navigation sections) |
| `src/lib/storage.ts` | S3 + Local storage adapter |
| `api/storage.py` | Python S3 adapter |
| `docs/PRODUCTION_DEPLOYMENT.md` | Full deployment guide |
| `docs/TIER1_TIER2_STATUS.md` | Implementation status |
| `.env.example` | Environment variables template |

---

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/geniussound"

# Auth
AUTH_SECRET="<32+ char random string>"

# Storage (choose one)
STORAGE_DRIVER="local"  # or "s3"
STORAGE_LOCAL_ROOT="./.data/storage"

# S3 (if using S3)
S3_ENDPOINT="https://s3.amazonaws.com"  # or MinIO, R2, etc.
S3_BUCKET="geniussound"
S3_ACCESS_KEY_ID="..."
S3_SECRET_ACCESS_KEY="..."

# APIs
API_URL="http://localhost:8876"
API_INTERNAL_TOKEN="<token>"

# Optional: AI Providers
COMFYUI_URL=""
REPLICATE_API_TOKEN=""
FAL_KEY=""
LLM_BASE_URL=""
LLM_MODEL=""
```

---

## Commands

```bash
# Development
npm run dev               # Start web app
npm run worker          # Start job worker
cd api && python -m uvicorn main:app  # Start API

# Testing
npm test                # Run test suite
npm run typecheck      # TypeScript check
npm run lint           # Linting
npm run build          # Production build

# Database
npm run db:migrate     # Apply migrations
npx prisma studio     # GUI database explorer
```

---

## Features Included

✅ **Audio Upload & Analysis**
- BPM, key, duration, song sections
- Energy detection, beat drops
- Interactive timeline

✅ **AI Creative Director**
- LLM-powered concept generation
- Multiple cinematic treatments
- Custom instructions support

✅ **Storyboard Editor**
- Scene-by-scene breakdown
- **Undo/Redo support** (Cmd+Z, Cmd+Shift+Z)
- **Drag-and-drop reordering**
- Approve/reject/lock scenes
- Version history

✅ **AI Video Generation**
- Text-to-video & image-to-video
- ComfyUI, Replicate, fal.ai support
- Cloud GPU support

✅ **Lyrics & Karaoke**
- Automatic transcription
- Word-level timestamps
- 3 karaoke styles
- Lyric video rendering

✅ **Final Export**
- 1080p, 4K, 16:9, 9:16, 1:1 formats
- Music synchronization
- Hard cuts or transitions

✅ **Promotional Clips**
- Auto-detect best moments
- TikTok, Instagram Reels, YouTube Shorts
- Synced lyrics on promos

---

## Keyboard Shortcuts

- **Cmd+S** / **Ctrl+S** → Save
- **Cmd+Z** / **Ctrl+Z** → Undo
- **Cmd+Shift+Z** / **Ctrl+Shift+Z** → Redo
- **Arrow Keys** → Navigate scenes
- **Delete** → Delete scene
- **Escape** → Close dialog

---

## Support

**Issues?** Check:
1. `docs/PRODUCTION_DEPLOYMENT.md` → Troubleshooting section
2. `.env` → Make sure all required variables are set
3. Database migrations → `npm run db:migrate`
4. API health → `curl http://localhost:8876/health`

---

## What's NOT Included (TIER 3 — Optional)

These are nice-to-have polish features (not critical to ship):
- Real-time progress updates (WebSocket)
- Project templates
- Batch operations
- Lip-sync support
- Face consistency engine
- Full team collaboration

**But the app ships without these** — they can be added later.

---

**Version:** 1.0.0  
**Status:** Production Ready  
**Tests:** 46/47 passing  
**Last Updated:** 2026-11-18
