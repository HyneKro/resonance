# Resonance Android 0.17.0-preview — Deezer playlists

- **Add music → Download a playlist** now recognizes public Deezer playlist links. Paste the full `deezer.com/playlist/…` address from your browser; localized links work too. Private playlists and short sharing links are not supported.
- Loads every playlist page, preserves song order and remembers downloaded Deezer entries. Supports up to 10,000 entries and reports incomplete responses.
- Tap **Choose recording** beside a song, review a YouTube audio upload or music video, then download its audio. Deezer supplies the song list; no subscription audio or preview clips are extracted.
- Unmatched songs stay unselected, including after status refreshes. Clearer feedback explains which songs still need a recording.

Verification: 116 Android unit tests, both ABI builds, instrumentation-test compilation and lint (0 errors; 9 existing warnings). Shared JavaScript regression suite and extracted APK module checks passed. Isolated phone UI check covers link detection, source creation, recording choice and download selection. Public Deezer metadata checked live from the PC; no physical phone test was available. Install this ARM64 APK over the previous app to retain music and settings; the package ID and signing certificate are unchanged.
