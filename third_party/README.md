# third_party — origins and separation

Nothing from the research repos is vendored wholesale. Each folder holds only a NOTICE recording what was used and how.
The repos themselves stay in `~/GeniusSound-Research/` (outside this repo).

| Repo | License | Status in Genius Sound | Code |
|---|---|---|---|
| PySceneDetect | BSD-3 | Pip dependency, unmodified | `api/services/scenes.py` |
| OpenMontage | MIT | Concepts re-implemented / one module adapted, attributed | `api/services/pacing.py`, `shot_prompts.py` |
| ComfyUI-OneShotMV | MIT code, restricted models | Workflow pattern only, clean-room; no models | `api/services/takes.py` |
| VocaVid | AGPL-3.0 | NOT used. Independent implementation only (existing lyric/karaoke code is original) | none |
| Remotion | Custom (company license for larger for-profits) | NOT integrated; legal decision pending | none |
