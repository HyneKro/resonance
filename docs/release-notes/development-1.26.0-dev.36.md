# Playlist access and recording selection

Windows **1.26.0-dev.36** and Android **0.26.0-dev.36** (versionCode **102**). Development channel only; live releases and the public download page stay unchanged.

- Playlist forms explain public access: Spotify/Deezer require public playlists; YouTube also accepts unlisted playlists. Spotify guidance includes **⋯ → Make public**. Private account access is not added.
- Spotify songs without a chosen YouTube recording no longer present a disabled selection dead end on Android. Tap the selection box or **Choose first recording**, compare results, and choose a recording to select the song. Audio is downloaded from YouTube only after the download action.
- Windows also opens recording search from an unmatched song’s selection box. Clearer labels distinguish a successfully read song needing a recording from an unreadable playlist.
- Android retains reviewed Spotify/Deezer recording choices after playlist rechecks and reordering. Preview refreshes use the native saved recording instead of overwriting it with a stale UI value.
- Android validates Spotify playlist metadata, discards podcasts/preview URLs, preserves original track positions, and reports access guidance. Spotify/Deezer service failures are no longer rewritten as unrelated YouTube errors.

Verification: 560 shared automated tests; 138 Android JVM tests; Android lint has 0 errors and 9 existing warnings. Isolated desktop and phone previews cover Spotify/Deezer import and explicit recording selection, including Spotify recheck retention and selected download requests. The extracted clean Windows build reached the empty-library welcome screen in 10.9 seconds, and both packaged Windows/APK frontend module graph checks passed. An anonymous live Spotify read returned 50 tracks from Today’s Top Hits; a live YouTube metadata search returned three reviewable matches. Neither probe downloaded audio. The Android APK retains the package and signing identity. No physical phone was available; service-dependent searches/downloads are tested with deterministic fixtures, not a live Spotify account or a physical device.

Try it through **Settings → App updates** in an existing development build. For a first development installation, use the matching ZIP/APK once. Android installs over the existing app; do not uninstall. A source-folder Windows run uses source changes instead of the portable updater.

See [playlist link help](../PLAYLIST-LINKS.md) for the public-link requirement and recording selection steps. Both development builds are public prereleases with Latest disabled; ordinary clients continue using the approved channel.
