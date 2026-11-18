# Media/AI Service — API Contract

Base URL: `API_URL` (default `http://localhost:8876`). Internal service: called by Next.js server code and workers, never by browsers.
Header `X-Internal-Token: $API_INTERNAL_TOKEN` is required when that env var is set (set it in any shared/hosted environment).
File paths in `/render` are relative to `STORAGE_LOCAL_ROOT` and must stay inside it (otherwise 400).

| Method & path | Purpose | Body → Response |
|---|---|---|
| `GET /health` | Liveness + FFmpeg build info | → `{status, ffmpeg:{available,version,gpl_build,nonfree_build}}` |
| `POST /analysis` | Phase 3 analysis (MP3/WAV, ≤100 MB) | multipart `file` → `{duration,bpm,beats[],key{key,tonic,mode,confidence},sections[{index,label,start,end,energy,confidence}],drops[{t,intensity}],energy[{t,energy}],method}`. Map to `SongAnalysis` / `SongSection`. Section labels are heuristic — UI must let users edit. |
| `POST /promo/suggest` | Phase 10 clip picks | `{analysis, duration:10\|15\|30\|45\|60, count, platform}` → `{clips[{start,end,duration,score,reasons[],platform,aspect}]}` → `PromoClip` |
| `POST /storyboard/apply` | Phase 5 rules (stateless) | `{scenes[], action, scene_id?, args{}, song_duration?}` → `{scenes[], timeline_issues[]}`. Next.js loads scenes from DB, calls this, persists result. 422 = rule violation (show message). Actions: `add, edit, approve, reject, lock, unlock, request_regenerate, generation_result, generation_failed, promote_candidate, restore_version, replace_asset, reorder, delete` |
| `GET /providers` | Which providers are configured | → `{providers[{name,kind,configured}]}` |
| `POST /generate` | Submit generation | `{provider, kind, prompt, image_url?, audio_url?, duration_sec?, params}` → `{provider, job_id}`. 503 = provider not configured (show it; do NOT fake a result) |
| `GET /generate/{provider}/{job_id}` | Poll | → `{state: QUEUED\|RUNNING\|SUCCEEDED\|FAILED\|CANCELLED, progress, output_urls[], error}`. Only a `SUCCEEDED` state with `output_urls` is a real result. |
| `POST /generate/{provider}/{job_id}/cancel` | Cancel | → `{cancelled:true}` |
| `POST /render` | Phase 9 assemble (synchronous; run from a worker, not a web request) | `{clips[{path,duration}], audio?, output, aspect:16:9\|9:16\|1:1, quality:1080p\|4k, transition, transition_sec, preview, subtitles?}` → `{output, duration}` → `RenderOutput` |

## How the worker should use it
1. Job `SONG_ANALYSIS` → `POST /analysis` → write `SongAnalysis` + `SongSection` rows.
2. Job `SCENE_GENERATION` → `POST /generate`, poll status, on `SUCCEEDED` download `output_urls[0]` into storage, then call `/storyboard/apply` with `generation_result` + the stored `asset_url`; on `FAILED` call `generation_failed`.
3. Job `RENDER_ASSEMBLY` / `PROMO_CLIP` → `POST /render` (use `preview:true` for previews).
4. Retries/backoff for provider HTTP calls already happen inside the service for retryable errors.

## Provider configuration (env)
ComfyUI: `COMFYUI_URL` + `COMFYUI_WORKFLOW_ID` (path to an API-format workflow JSON using placeholders `{{prompt}} {{image}} {{audio}} {{duration}}`; use approved models only).
Replicate: `REPLICATE_API_TOKEN` + `REPLICATE_MODEL_VERSION`. fal: `FAL_KEY` + `FAL_MODEL_ID`.

## Added: Phase 8 (lyrics) and Phase 4 (creative director)
| Method & path | Purpose | Body → Response |
|---|---|---|
| `POST /lyrics/transcribe` | ASR word timestamps (needs `faster-whisper`; 503 if unavailable) | multipart `file`, `language?` → `{words[{word,start,end,probability}]}` |
| `POST /lyrics/align` | Parse pasted lyrics and time them | `{lyrics, asr_words?, song_duration?}` → `{lines[{index,text,section,start,end,words[{word,start,end,source:asr\|interpolated\|estimated}]}],matched,total_words,coverage}`. Without `asr_words` timing is only *estimated* — UI must say so. → `Lyrics`/`LyricLine`/`WordTimestamp` |
| `POST /lyrics/ass` | Karaoke subtitles | `{lines, template: classic_karaoke\|bold_center\|minimal_top, aspect, overrides{font,size,primary,highlight,outline,position}}` → `{ass, srt, templates[]}` |
| `POST /render/lyric-video` | Background + song + burned-in karaoke | `{lines, audio, output, duration, background?, template, aspect, quality, preview}` → `{output,duration}` |
| `POST /director/concepts` | Music-video concepts | `{analysis, lyrics?, instructions?, count}` → `{concepts[{title,logline,mood,visual_style,color_palette,locations,treatment}]}`. 503 if no LLM configured, 502 if model output stays invalid. → `CreativeTreatment` |
| `POST /director/storyboard` | Scene list covering the whole song | `{analysis, concept, lyrics?, instructions?, artist_notes?}` → `{scenes[{number,start,end,section,lyrics,description,location,characters,wardrobe,vehicles,props,camera_angle,camera_movement,lighting,transition}]}` → `StoryboardScene` |

LLM config: `LLM_BASE_URL` + `LLM_MODEL` (+ `LLM_API_KEY`), e.g. Ollama `http://localhost:11434/v1`; or `OPENAI_API_KEY`.
