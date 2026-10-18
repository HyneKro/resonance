# Resonance Android 0.15.5 preview · Cover performer credits

The same cover-credit correction as Windows 1.15.5 now runs in Android's native library. Explicit “Cover by”, arrangement and performance credits identify the performer instead of a game or song prefix. Corroborated collaborators get separate artist entries while band names remain intact.

Existing entries repair automatically when opening the updated app. Manual corrections, locked artists, recording metadata, original source titles, favorites and playback history are preserved. Both runtimes use the same regression fixtures, including the reported RichaadEB example. Source refresh also preserves the full game/song title.

ARM64 preview, versionCode 38, unchanged package ID and signing certificate. Install over the existing app to retain music, playlists and settings. Physical Android device testing was not available.

Validation: 356 JavaScript tests and 111 native JVM tests pass. Both ABI builds and the instrumented-test APK compile. Lint reports no errors and nine existing warnings, and the extracted APK's complete startup module graph passes.
