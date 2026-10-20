# Resonance PC 1.23.5

- Dynamic Lyrics now has a smooth left-to-right phrase sweep when only line timestamps are available. It follows the phrase duration and fills wrapped text in reading order. This fallback is approximate; genuine word timestamps still take priority.
- Highlights glow in a bright color drawn from the visualizer's sampled palette. Unsung text is muted, with stronger black text shadows and a dark backing for readability over busy or bright scenes.
- Pause, seeking, playback speed, manual lyric offsets and visual-sync delay remain supported. No recognition tool or model download is needed.

Validated with regression tests, desktop/phone interface checks, bright-background and wrapped-phrase checks, packaged frontend module checks, clean Windows startup and compatibility with the frozen 1.22.0 updater.
