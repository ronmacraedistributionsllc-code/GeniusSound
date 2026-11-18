# OpenMontage — MIT
Source: https://github.com/calesthio/OpenMontage (local: ~/GeniusSound-Research/OpenMontage)
Derived work:
- api/services/shot_prompts.py  <- lib/shot_prompt_builder.py (5-layer camera/movement/subject/lighting/style; rewritten, smaller vocab)
- api/services/pacing.py        <- concept of lib/verify_scene_pacing.py + lib/variation_checker.py (re-implemented for song sections/beats)
Reviewed, not yet used (candidates): lib/scoring.py (provider scoring), lib/checkpoint.py (resume), lib/slideshow_risk.py.
Not used: OpenMontage's Remotion/TerminalScene compositions (Remotion license).

MIT License

Copyright (c) 2026 OpenMontage

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
