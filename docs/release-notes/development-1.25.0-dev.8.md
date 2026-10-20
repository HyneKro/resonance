# Development preview: more reliable Windows updates

Windows 1.25.0-dev.8 · Android 0.25.0-dev.8 (versionCode 65).

- The Windows updater waits for remaining background processes from the installation being updated and retries temporary file locks. It never terminates other installations.
- Unchanged executable and runtime files are skipped. Every staged file is validated and changed destinations are checked before replacement begins.
- Changed files are replaced atomically, with backups recorded only after successful replacement. A blocked write no longer creates a false rollback error. The installed update manifest participates in rollback too.
- Concurrent installers for the same folder are rejected before shutdown. If Windows keeps a file locked, the app offers a clear retry through App updates instead of directing users straight to a manual ZIP.

Regression coverage includes real temporary and persistent Windows file locks, surviving app processes, independent installations, simultaneous helpers, unchanged locked binaries, automatic relaunch, and restoration after failed installation validation. Android retains its existing system-confirmed update flow and signing identity.

Validation passed: 470 JavaScript tests (including 12 native updater regressions), 134 Android unit tests, Android lint/build, both extracted startup module graphs and a clean Windows welcome-screen launch.

These are development prereleases. The approved main branch, ordinary update channel and public download buttons remain unchanged. Physical Android testing is not available.
