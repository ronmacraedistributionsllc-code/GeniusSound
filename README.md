# Genius Sound — AI Music Video Studio

**Genius Sound** is a professional web application for music producers, record labels, and artists to create cinematic AI music videos from uploaded songs.

## Architecture Overview

Genius Sound uses a full-stack TypeScript/Python architecture:

- **Frontend**: Next.js 16 with App Router, React 19, Tailwind CSS
- **Backend**: Python FastAPI for AI and media processing
- **Database**: PostgreSQL with Prisma ORM
- **AI Processing**: ComfyUI, LTX-2.3 video model, CLIP embeddings
- **Background Jobs**: Custom job queue with Redis support
- **Storage**: S3-compatible object storage for assets

## Tech Stack

### Frontend (Next.js)
- TypeScript 5
- React 19 with App Router
- Tailwind CSS 4.3
- Prisma ORM
- Zod validation

### Backend (FastAPI)
- Python 3.12+
- FastAPI for REST API
- uvicorn for ASGI server
- Pydantic for data validation

### AI Services
- **ComfyUI** (self-hosted) — Video generation with LTX-2.3
- **OpenMontage** — CLIP-based semantic video search (MIT licensed)
- **Remotion** — React-based video composition (free tier for ≤3 employees)
- **PySceneDetect** — Scene boundary detection (BSD 3-Clause)

### Database
- PostgreSQL 16+
- Prisma ORM with migrations

## Project Structure

```
~/GeniusSound/
├── src/                     # Frontend (Next.js)
│   ├── app/                 # App Router pages
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard layout
│   │   └── projects/       # Project pages
│   ├── components/         # Reusable UI components
│   └── lib/               # Utilities and hooks
├── api/                    # FastAPI backend
│   ├── main.py            # Main application
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic
│   └── models.py          # Pydantic models
├── prisma/                # Database schema and migrations
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md
│   └── IMPLEMENTATION_PLAN.md
├── .env.example           # Environment variables template
├── package.json           # Frontend dependencies
└── requirements.txt       # Backend dependencies
```

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 16+
- ComfyUI with LTX-2.3 model

### Installation

```bash
# Clone and navigate to the project directory
cd ~/GeniusSound

# Install frontend dependencies
npm install

# Install backend dependencies
cd api && pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development servers
cd .. && npm run dev  # Frontend on port 3000

# Start FastAPI backend
cd api && uvicorn main:app --reload  # Backend on port 8000
```

### Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/geniussound"

# Auth
AUTH_SECRET="change-me-to-a-long-random-string"

# Storage (local or S3-compatible)
STORAGE_DRIVER="local"
STORAGE_LOCAL_ROOT="./.data/storage"

# ComfyUI (self-hosted)
COMFYUI_URL="http://localhost:8188"

# AI Providers (optional - leave empty for manual processing)
COMFYUI_WORKFLOW_ID=""
REPLICATE_API_TOKEN=""
FAL_KEY=""
OPENAI_API_KEY=""

# Transcription
TRANSCRIPTION_PROVIDER="openai"
```

## Development

### Frontend Development
```bash
npm run dev      # Start Next.js dev server
npm run build    # Build production bundle
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend Development
```bash
cd api
uvicorn main:app --reload  # Hot-reload dev server
python -m pytest          # Run tests
```

### Database Migration
```bash
npx prisma migrate dev      # Create and apply migrations
npx prisma studio          # Open Prisma Studio UI
```

## Deployment

### Docker (recommended)
```bash
docker-compose up -d
```

### Vercel (Frontend)
Deploy frontend to Vercel for serverless deployment.

### Backend
Deploy FastAPI to a Python-compatible platform (Railway, AWS ECS, etc.).

## Licensing

Genius Sound uses several third-party components with different licenses:

- **OpenMontage**: MIT License
- **PySceneDetect**: BSD 3-Clause
- **Remotion**: Custom 2-tier license (free for ≤3 employees)
- **VocaVid**: AGPL-3.0 (requires reimplementation, no direct code copy)
- **ComfyUI-OneShotMV**: MIT code, model-specific licenses

See `docs/LICENSING_AUDIT.md` for detailed licensing information.

## License

Proprietary — Genius Sound is a commercial product. Contact for licensing inquiries.
