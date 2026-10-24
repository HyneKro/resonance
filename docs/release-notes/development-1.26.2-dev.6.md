# Finished songs are available during playlist downloads

Windows **1.26.2-dev.6** and Android **0.26.2-dev.6** (versionCode **112**), isolated development channel.

Windows previously waited until the entire selected batch finished before scanning its download folders. A large playlist could leave fully downloaded songs out of the library for hours.

- Each successful Windows download now imports its exact final audio file after extraction and post-processing, before the next transfer starts. It reads the same metadata and artwork as a normal scan, without rescanning a growing folder after every song.
- The desktop library and download list refresh as finished songs become available, including consecutive batches with matching completed counts. Current playback, saved edits, favorites and listening history remain intact. Playlist order, Spotify/Deezer catalogue identity and alternative-recording links are attached immediately.
- Completed songs remain accessible if later downloads fail, pause or are cancelled. Temporary extractor audio files are excluded from the online-source reconciliation scan. Final files must be nonempty audio inside the connected download source.
- Android already saves each song and refreshes its library during an active batch. A native regression check now verifies that saved-song publication precedes the next transfer; this update preserves that behavior.

Verification includes a real local service with the second transfer held pending while the first song is listed and streamed, cancellation/rate-limit cases, temporary-file exclusion, persisted metadata/history and native per-song publication. An isolated desktop UI check plays the first song during the second transfer and observes automatic updates. The real bundled downloader/FFmpeg also pass a final-file signal check using generated audio served only over localhost. Shared tests, Android JVM/build/lint checks, extracted startup graphs, clean Windows startup, signing identity, legacy updater compatibility, uploaded hashes and anonymous channel isolation are checked before publication. Physical Android testing remains outstanding.

All **575 shared tests** and **152 Android JVM tests** pass. Both ABI builds, device-test compilation and lint pass (0 errors; 9 existing warnings). The desktop UI check also verifies refresh during a consecutive batch whose completed count matches the previous batch.

Existing development installations can use **Settings → App updates**. Otherwise install the development ZIP/APK once. Android retains its signing identity and installs over the existing app; do not uninstall. Windows tests use a separate portable folder and isolated data. Main, ordinary releases and live download-page buttons remain Windows 1.26.1 / Android 0.26.1-preview pending approval.
