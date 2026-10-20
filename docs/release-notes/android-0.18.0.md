# Resonance Android 0.18.0-preview — Understand your library

- New Library review: focused artist/genre questions, complete collection search and comparisons of versions or possible copies.
- Clear evidence explanations, quick single-field corrections and undo; preserve individual performers and band punctuation.
- Fix genre edits freezing artist discovery and words such as “featured” being misread as a credit.
- Reuse supported genres between matching local recordings; keep estimates distinct and reject conflicting evidence.
- Preserve genre evidence/locks when undoing, and recheck old genres after identity corrections.

Open Settings → Library & downloads → Library review. Comparisons never remove or substitute music. Existing files, playlists and signing identity are preserved; install over the previous app.

Verified with native unit tests, Android lint, both ABI builds, instrumentation-test compilation, shared regressions and phone-size UI previews. The published APK is ARM64. Physical-device playback/background behavior has not been retested on an Android testing device.
