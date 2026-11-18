# Local ComfyUI (Apple Silicon) — setup for Genius Sound

ComfyUI stays **self-hosted**. Genius Sound only talks to it over HTTP (`api/providers/comfyui.py`), so ComfyUI's GPL-3.0 licence does not extend to this codebase.

## Approved models (commercial use)

| Model | Use | Licence (verified by web search 2026-11-18) |
|---|---|---|
| Wan 2.2 TI2V-5B | scene video, text/image → video | Apache-2.0 |
| Qwen-Image-Edit-2511 (already installed) | keyframe / reference-image editing | Apache-2.0 |

Do not add models without checking `docs/LICENSING_AUDIT.md`.

## Files to download (into `ComfyUI-Shared/models/`)

| File | Folder | Source (Hugging Face) |
|---|---|---|
| `wan2.2_ti2v_5B_fp16.safetensors` | `diffusion_models/` | `Comfy-Org/Wan_2.2_ComfyUI_Repackaged` → `split_files/diffusion_models/` |
| `wan2.2_vae.safetensors` | `vae/` | same repo → `split_files/vae/` |
| `umt5_xxl_fp8_e4m3fn_scaled.safetensors` | `text_encoders/` | `Comfy-Org/Wan_2.1_ComfyUI_repackaged` → `split_files/text_encoders/` |

## Run

1. Start ComfyUI (listens on `127.0.0.1:8188`).
2. In `.env` set:
   ```
   COMFYUI_URL=http://127.0.0.1:8188
   COMFYUI_WORKFLOW_ID=/absolute/path/to/GeniusSound/api/workflows/wan22_ti2v_5b_i2v.json
   ```
   Also set `COMFYUI_WORKFLOW_ID_T2V` to the `wan22_ti2v_5b_t2v.json` path: text-only scenes use it, scenes with an artist reference use the image workflow.
3. `GET /providers` on the media API should report `comfyui` as configured.

## Workflow placeholders

Substituted by the adapter: `{{prompt}}`, `{{image}}` (uploaded to ComfyUI's input folder automatically), `{{frames}}` (4k+1, from `duration_sec` × fps), `{{fps}}` (24), `{{width}}`/`{{height}}` (default 1280×704, the 720p size the 5B model is trained for), `{{seed}}`.

## Not yet verified (needs a live run on your Mac)

- The workflows were derived from ComfyUI's bundled `video_wan2_2_5B_ti2v` template and checked against node source, but have **never been executed**. `SaveVideo`'s `format`/`codec` inputs are dynamic; if ComfyUI rejects them, re-export the graph from the UI with "Save (API Format)" and keep the placeholders.
- Speed/memory on MPS. A community run on a 64 GB Apple-Silicon Mac reported ~15 min for 720p × 41 frames × 20 steps (MLX build, not ComfyUI). Expect minutes per short clip; use lower `width`/`height` and fewer frames while testing.
