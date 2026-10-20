# Resonance PC 1.23.4

- Removed the optional lyrics recognition download and audio-analysis workflow. Existing lyric lookup, saved lyrics, the Lyrics button and Dynamic Lyrics mode remain.
- Sung words now fill smoothly from left to right using real word start/end times. Pause, seek, playback speed, per-song offsets and visual-sync delay are respected. Line-only lyrics stay unfilled.
- A compact Lyrics timing menu explains the available timing and keeps manual offset adjustment and lyric import/export. Previously accepted timings remain usable.
- Word animation stops while hidden or paused; no recognition job runs in the background.

Validated with automated lyric/storage regressions, PC and phone interface checks, a clean Windows startup, packaged frontend module checks, and the frozen 1.22.0 updater compatibility check. Existing personal lyrics and data are preserved.
