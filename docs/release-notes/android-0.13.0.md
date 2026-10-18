# Resonance Android 0.13.0 preview

Artist groups in Constellation now connect to every member song. All music and the current genre are available inside the map, alongside the existing navigation trail.

Downloads tries an exact-phrase search after a broad search cannot recover an unavailable YouTube recording. Artist, title, version and duration still need to match for automatic selection. Temporary restrictions pause the batch. Find another upload is available for ordinary and skipped playlist entries as well as Spotify matches: refine the search, preview a recording and choose it before starting Downloads. The saved replacement keeps its original playlist identity.

Genre discovery adds a second regional catalogue, bilingual artist aliases, short video-intro/outro tolerance for genre evidence, and labelled suggestions from consistent releases by an unambiguously matched artist. Research stays local and preserves manual edits. Retry missing genres to use the expanded research; coverage depends on available catalogue evidence.

Verification: 105 native JVM tests, application and instrumented-test APK builds passed; lint reports 0 errors and 9 warnings. Recursive frontend assets were checked in the actual ARM64 APK. The phone-sized replacement flow passed with a simulated native bridge. Shared matching was also checked against three live reported recordings on Windows; Android downloading, foreground services and playback were not tested on a physical phone for this release.

Package ID and signing certificate are unchanged; versionCode is 31. Install over the existing app without uninstalling to preserve private songs and settings. Android still requires confirmation to install updates. Spotify supplies metadata, not protected audio files.
