# Resonance Android 0.22.0-preview — Dynamic Lyrics and playback responsiveness

**Lyrics** in the Visualizer lights up when the current recording has matching line timestamps. Tap it for readable animated lines with typography influenced by the song's genre. Seeking, pause and visual-sync delay are respected; the overlay is hidden in other viewing modes and during loading.

- Improved lyric matching, featured-credit handling, timecode storage and offline caching. Text-only matches remain in song details; mismatched recording durations do not enable false synchronization. Manual choices are protected. Lyrics requests have their own bounded background queue, so a slow provider cannot occupy playback-control workers.
- Removed library/profile reads from the playback service's recurring main-thread work. It now consumes background snapshots, so busy loudness analysis cannot hold up that work or notification controls.
- Background analysis releases its scheduling lock between catalogue checks. Large queue preparation and artwork checks run off the main thread. An unfinished queue restore cannot overwrite the saved queue.
- Queue order is rebuilt and sent to the WebView only when it changes, rather than every playback poll. Transport, shuffle and Constellation continue to share the native order.

Validation: 415 app tests, 128 native unit tests, both ABI builds, device-test compilation, and Android lint with zero errors and nine existing warnings. Hidden browser checks cover phone/landscape lyric layouts and timing behavior. A blocked-worker regression exercises 10,000 nonblocking snapshot reads. The extracted APK's complete web module graph and existing signing certificate were verified.

No physical Android device test was available. The changes address concrete blocking paths found in the code; they do not establish that every device-specific freeze is eliminated. Please check prolonged Visualizer/Constellation use and lock-screen controls on your phone.

Install over the existing app. Package identity and signing certificate are unchanged; do not uninstall. Timed lyrics are not available for every recording, and this release does not invent missing timestamps or upload audio.
