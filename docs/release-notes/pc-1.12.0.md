# Resonance PC 1.12.0 — calmer detail, deeper Constellation

- Keep precise note detail while restoring a calmer, connected particle structure. Harmonic and percussive estimates now have separate attack/release envelopes and a gentle noise floor; fine strands and light retain note detail. These remain visual estimates, not isolated instrument stems.
- Track Character looks across the next six seconds of the saved audio map for short energy rises. Anticipation is faster, while seeking retains a smooth handoff. This needs an existing measured song profile; it does not predict unknown desktop audio.
- Constellation follows the desktop display cadence instead of discarding frame-timing remainder. Distant music stars use batched drawing and detailed artwork is prepared in small batches. Mobile retains its economical 30 FPS map cap.
- Dimmer background stars have continuously varied distances across twelve depth ranges. Journey and artist links remain visible when their endpoint stars leave the screen, and clip at the full canvas edges rather than the top/bottom UI boundaries.
- More compact map navigation, calmer song details and a connected journey list. Journey controls collapse after building a route, leaving playback actions immediately accessible; reopen Shape your journey to adjust it.
- Restore the previous static Music Only cover collage. The latest Sona artwork and animation routines are retained.
- Windows: fix the splash visibility rule exposing the legacy player during startup. Remove the deliberate initial animation pause and split interface setup across paints.

## Verification

289 automated JavaScript tests pass. A 2,600-song Electron scene measured a 16.6 ms median frame interval, 2.5 ms median CPU draw time and 3.1 ms p95 locally. These are local fixture results, not a guaranteed frame rate on every device. Desktop/portrait graphics checks cover shader compilation, group zoom, journey playback visibility and disposal. The restored collage is static at desktop and portrait sizes. A restored-session startup check confirms the intended dock throughout the splash handoff. Android UI fixture checks retain portrait rotation, camera/kaleidoscope controls and Music Only suspension.

Both distributable startup module graphs and a clean empty-library Windows welcome screen are checked before publication. Android build, device-test compilation, JVM tests and lint are checked; no physical S22+ was connected. GPU/driver initialization can still add hardware-dependent startup work.

Install over the existing version to preserve music and settings. Choose Restart & update when ready.
