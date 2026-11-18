# Genius Sound — Licensing Audit

Audited against the LICENSE files and READMEs in `~/GeniusSound-Research/` on 2026-11-17.
This is an engineering audit, not legal advice. Items marked **VERIFY** need a lawyer or the vendor before launch.
Genius Sound is a commercial product: nothing below is approved for shipping until its row says so.

## 1. Research repositories

| Repo | Licence (from LICENSE file) | Decision |
|---|---|---|
| PySceneDetect | BSD-3-Clause (Brandon Castellano). Bundled `_thirdparty/` has its own LICENSE-* files | **Approved as a pip dependency** (`scenedetect`). Keep copyright notice if any code is vendored. Optional TransNetV2 detector: model weights licence **VERIFY** before enabling |
| OpenMontage | MIT | **Approved** for adapting ideas/small modules with attribution. Its `lib/providers` and any bundled assets need separate review before reuse |
| ComfyUI-OneShotMV | Code: MIT. Vendored `fv/syncnet/` keeps its own licence (see its NOTICE). **Models are not covered by the code licence** | Code reuse OK with attribution. Models: see section 3 |
| VocaVid | **AGPL-3.0** | **Do not copy or link any code.** Read for ideas only; reimplement independently (clean-room: write from the feature description, not from the source). Running it as a separate unmodified service is a different question — **VERIFY** with counsel |
| Remotion | Custom "Remotion License": free for individuals, **for-profit organisations with up to 3 employees**, non-profits, and evaluation. Larger for-profit companies need a paid Company License. Forbidden: selling/sublicensing a derivative of Remotion itself. LICENSE.md also announces changes in Remotion 5.0 | **VERIFY**: Genius Sound Records LLC headcount (employees) and whether offering Remotion rendering to *paying third-party customers* is covered under the free tier. Read remotion.dev FAQ/pricing; if unclear, buy a Company License or use FFmpeg/own renderer for lyric videos |

## 2. FFmpeg

- FFmpeg is called as a **separate process** (subprocess); it is never linked into our code.
- Obligations depend on the exact build: LGPL-only builds are simplest; builds with `--enable-gpl` (e.g. libx264/libx265) put GPL obligations on that binary's distribution; `--enable-nonfree` builds **must not be redistributed**.
- `api/main.py` `/health` reports `gpl_build` / `nonfree_build` for the FFmpeg it finds. Dev check on the research VM found a GPL build (Ubuntu 4.4.2).
- Policy: for a hosted service we only run FFmpeg on our servers (no binary distribution). If we ever ship a desktop installer, bundle an LGPL build or ship GPL source offer. **VERIFY** the exact build used in production and record it here.

## 3. Models and checkpoints (from OneShotMV README "Models and licenses")

| Model | Stated licence | Status for Genius Sound |
|---|---|---|
| LTX-2.3 22B + LoRAs/upscaler (Lightricks) | LTX-2 Community License: free under US$10M annual revenue; label output machine-generated; no impersonation without consent | Allowed while under the revenue cap; add machine-generated labelling and consent checks for artist likeness |
| Krea 2 (Turbo/Raw) | Krea 2 Community: commercial use only under US$1M annual revenue | Allowed under cap only; **VERIFY** current terms; make it optional |
| Qwen3-VL 4B text encoder, Qwen-Image VAE | Apache-2.0 upstream | OK |
| Qwen-Image 2.1 + Qwen3-VL 8B | Reported as Qwen **Research** License | **Blocked** for commercial use until the model page confirms otherwise |
| SyncNet v2 + S3FD | Research use (CC-BY, Oxford VGG); S3FD no licence stated | **Blocked** commercially. Use another lip-sync scorer or get permission |
| LTX2.3 Crisp/Soft Enhance LoRAs (community) | No licence stated | **Blocked** (no rights granted). Remove from workflows |
| Hybrid Demucs (torchaudio) | Code MIT; no weights licence published | **VERIFY** before shipping stem separation |
| InsightFace (identity features) | Non-commercial for pretrained models (per upstream; not in OneShotMV's table) | **Blocked** commercially without a licence. Identity consistency must use permitted methods only |

Rule: no checkpoint, LoRA or custom node is loaded unless it has a row here marked approved.

## 4. Runtime dependencies (current)

| Package | Licence | Note |
|---|---|---|
| next, react, react-dom | MIT | OK |
| tailwindcss, @tailwindcss/* | MIT | OK |
| @prisma/client, prisma | Apache-2.0 | OK |
| zod, bcryptjs, vitest | MIT | OK |
| music-metadata | MIT | OK |
| FastAPI, Pydantic, uvicorn | MIT / MIT / BSD | OK |
| librosa (planned) | ISC | OK |
| faster-whisper (planned) | MIT; Whisper weights MIT | OK |
| rapidfuzz (planned) | MIT | OK |

Re-run a full `npm ls` / `pip-licenses` audit in Phase 11 and before each release. Fonts: none bundled yet; every font added must be OFL/Apache or licensed, recorded here.

## 5. External APIs

ComfyUI (self-hosted, GPL-3.0 server — we talk to it over HTTP, not link), Replicate, fal, OpenAI: usage governed by each provider's terms; keys only via environment variables. Confirm each provider's output-ownership and commercial-use terms before enabling it. **VERIFY**.

## 6. Corrections to the earlier draft

The previous version of this file named `scene_detect.py`, `keyframe_extractor.py` and `align_lyrics.py`, which do not exist in the repos, and described OpenMontage `scoring.py` as quality scoring (it scores provider/production paths). Those entries were removed.
