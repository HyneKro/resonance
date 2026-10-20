# Resonance Android 0.8.0 preview — Listening modes and Constellation navigation

Library and Settings stay accessible at the top, with Visualizer, Constellation and Music only presented as three equal modes. Immerse and Visuals & Sona belong to Visualizer. Queue remains beside playback controls.

Constellation has a persistent, scrollable song-details panel and a breadcrumb trail with back/forward camera history. It follows the playing song and refreshed metadata. The duplicate Now playing card and on-screen zoom buttons are removed; pinch zoom remains available. Journeys vary their starting song unless explicitly pinned.

Genre research checks missing songs first, uses cached artist-catalogue suggestions, and can verify a missing artist against an exact song match using its uploader as a search clue. Repost channels are not automatically treated as artists. Suggestions and unresolved genres remain identified, with a missing percentage. The under-1% unknown target has not been verified.

Validation: 95 JVM tests, build and lint passed; all APK frontend dependencies verified; phone browser flow tested using a simulated native bridge. Shared JavaScript suite: 258 tests. Physical-device testing remains necessary.

ARM64, package `music.resonance.mobile`, versionCode 26, existing signing certificate. Install over the existing app; do not uninstall to update.
