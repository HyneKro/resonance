# Development preview: responsive transport and quieter discovery

Windows 1.25.0-dev.6 · Android 0.25.0-dev.6 (versionCode 63).

- Windows playback shows when a song is preparing and lets Pause cancel immediately. Failed or stalled loudness preparation no longer leaves an indefinite wait. Play original level responds without waiting for an outstanding lookup. Saved loudness measurements still apply before playback; no automatic unnormalized fallback was added.
- Activity now offers Rescan, Check playlists, artist/release checks, genre discovery, Prepare missing sound data and Check this song for lyrics. It remains a subtle main-screen icon while busy; Library & downloads offers Activity & checks when idle. Playlist audio still requires selecting downloads. Android artist/release checks target the selected song; genre discovery works gradually across the library. Bulk sound preparation requires a charger on Android and pauses when the app goes into the background.
- Constellation uses smaller side captions with thin leader lines. Playing and Next remain labeled; later queue steps use numbers. Captions leave important stars clear and keep their world anchors instead of shuffling around the pointer. Full titles remain in the details and listening panels.

These are development prereleases for testing. The approved main branch, ordinary updater channel and public download buttons are unchanged. Automated desktop and phone-layout checks do not replace testing on a physical Android device.
