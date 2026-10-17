# Constellation, in three dimensions

- Constellation is now a full listening-room mode, alongside Visualizer and Music only. The regular player, volume and queue remain available. Your visualizer and its settings are preserved.
- Tap a song sphere to play immediately, with related music queued behind it. Orbit in any direction, zoom through the map, search for a song or return with Home / Find playing.
- Genre colours, artist satellite patterns and selected-song connections make the library readable. Map key and Song details explain the exact saved genres, artist credits and evidence.
- Journeys, local sound-data preparation and saved places remain available in compact panels. Previous bookmarks migrate without losing music or playlists.
- The background visualizer and Sona pause rendering while the map is open. The map stops drawing when hidden or closed, uses cached sphere textures and respects reduced motion.

Validation: 239 automated JavaScript tests, including 3D camera/picking, touch cancellation, migration, 2,500-song graphs and both complete frontend dependency graphs. Desktop and phone-width UI checks use isolated synthetic libraries. Clean extracted Windows startup and extracted APK assets verified. Android native device testing remains limited to compiled instrumentation; no physical S22+ was connected.
