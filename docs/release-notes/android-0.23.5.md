# Resonance Android 0.23.5-preview

- Dynamic Lyrics now sweeps through line-timed phrases from left to right, including wrapped lines. Phrase timing is approximate; real word timestamps remain preferred.
- Palette-colored emissive text makes the moving highlight easier to see. Muted unsung text, stronger black shadows and a dark backing improve readability over bright visualizer scenes.
- The same playback clock keeps pause, seeks and visual-sync delay aligned. Layout measurement is limited to new phrases, resizes and font loads; no audio-analysis tool is used.

Validated with ARM64/x86_64 builds, native unit tests, Android lint, packaged module checks and phone-sized interface checks. No physical Android device was available. Install over the existing app to preserve your library and settings.
