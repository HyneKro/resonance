# Resonance 1.8.0 — Clearer ways to listen and explore

Visualizer, Constellation and Music only now have three permanent, mutually exclusive mode buttons. Library, Settings and Fullscreen have their own global group. Immerse, Visuals and Desktop audio appear only in Visualizer. Clicking either the player cover or song title opens Behind the sound.

Constellation keeps the full song inspector visible, following current playback and fresh metadata. Upload-channel names remain visible when an artist credit is unconfirmed, with that distinction explained. The duplicate Now playing card and zoom buttons are removed. Genre, artist and star views have breadcrumbs and back/forward history that restores camera position smoothly. Opening the map still suspends the main visualizer.

Journeys choose a fresh nearby starting song on each build unless you explicitly select Start here. Chosen destinations and essential stops remain respected.

Genre research prioritizes unlabelled songs, adds a cached artist-catalogue fallback, and can corroborate a missing artist using an exact recording match against its uploader name. A fixed first-lookup bug now saves repaired artist credits together with genre evidence. Independent provider failures no longer discard useful results or stop a productive batch. Artist-level genres remain marked as suggestions; manual edits are preserved. Missing counts and percentages are visible. Complete genre coverage is not guaranteed, and the under-1% unknown target has not been verified.

Validation: 258 JavaScript tests, 95 Android JVM tests, Android build/lint, extracted ZIP/APK startup dependency checks, clean empty-library PC welcome screen, desktop and phone browser navigation checks. No physical S22+ test was performed. Music, artwork caches, settings and playlists are retained when updating.
