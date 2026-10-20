# Resonance Android 0.23.1-preview — Maintenance release

Companion release for the Windows update recovery. Retains the lyric timing workshop, per-song offsets, timed-lyrics import/export and word highlighting from 0.23.0. Heavy lyrics analysis remains PC-only.

The Windows ZIP packaging problem does not affect Android APK installation. Android continues to require system confirmation, with the same package ID and signing identity; install over the existing app.

Verification: ARM64 and x86_64 builds, 128 native unit tests, lint (0 errors, 9 existing warnings), 430 JavaScript tests and the complete frontend module graph from the extracted APK. No physical-phone testing was performed for this maintenance release.
