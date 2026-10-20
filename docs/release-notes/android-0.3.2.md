# Resonance for Android 0.3.2 preview

- Fix the standalone loudness analyzer's runtime: initialize its supporting packages and include the shared libraries supplied outside FFmpeg's own folder. Earlier failed measurements become eligible for retry automatically; valid saved measurements remain intact. Leveling still applies one steady gain per song.
- Restore missing cover cache entries on demand, first from embedded artwork and then from the saved thumbnail source. Older YouTube songs can recover using their saved video ID. Recovery runs in a bounded background queue and respects the existing artwork cache limit.
- Keep thumbnail source addresses for future recovery. Recreate the artwork directory if Android removed it, and stop treating undecodable images as successful saves.
- Missing images show a fallback, then retry when recovery completes. The cover palette and Music only wallpaper can recover without switching songs or restarting. Offline failures are throttled; reconnecting allows another attempt.
- Keep bounded local engine diagnostics in the song's Listening edit screen if measurement still fails.

Install over the existing app: package identity and signing certificate are unchanged; versionCode is 21. Songs and playlists are retained. With leveling enabled, previous failures will be prepared one song at a time. Cover recovery may need an Internet connection when artwork is not embedded.

Validation: 82 JVM tests and 224 app tests pass; APK build, lint and the extracted startup module graph pass. Browser checks cover missing-image recovery with the packaged mobile UI and a simulated native bridge. A real FFmpeg measurement test compiles, but no Android device was connected, so Android-device verification remains necessary. The artwork recovery addresses missing cache/source failures; the exact state of the reported phone's cache was not available for inspection.

Constellation is a proposed next feature and is not included yet.
