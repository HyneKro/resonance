# Constellation

**Constellation is a third listening-room view**, alongside Visualizer and Music only. Use Constellation on the main screen or in Library. It temporarily replaces the background; the existing visualizer, its settings, and Music only remain available. The ordinary player keeps playback, volume and queue within reach. Back to listening restores the previous background; Music only switches directly to the static artwork view.

Each sphere is one available local song in a perspective-projected 3D space. **Tap a sphere to play immediately**, with up to thirty related songs queued behind it. Drag/swipe horizontally or vertically to orbit without a vertical angle limit; scroll/pinch to zoom. Home fits the library, and Find playing takes you to the current song. Search and Song list are keyboard/screen-reader alternatives; selecting a song there also starts playback. Arrow keys rotate, +/− zoom, Home resets, and Escape closes the map's detail panel before leaving the mode.

Genre families form coloured regions. The Map key lists the mapping, and Song details displays the exact saved genre rather than presenting a broad family as an exact classification. Missing genres remain grey. Artist credits determine a repeatable satellite count, orbit style and inclination; these are visual signatures, not globally unique identifiers. Structured guest credits also make artist connections. Solid pale lines connect shared artists, dotted lines show nearby sound/genre clues, faint coloured threads tie a region together, and gold lines show a planned journey. Only a bounded subset is drawn to avoid clutter.

Locally saved audio profiles refine positions and sound connections: relative energy contour, a zero-crossing texture estimate, transient contrast and energy variation. These descriptors are estimates, not BPM, instrument detection, semantic understanding or guaranteed mood labels. No genre is invented from a cover or measurement.

Positions and named bookmarks are saved locally. New measurements and metadata do not move existing stars automatically. **Saved places → Refine map** rebuilds positions with the latest saved genre and sound data while retaining bookmarks. Old 2D bookmarks migrate by song identity; unavailable files retain their saved places for when their folder returns.

**Prepare sound data** explicitly requests the existing local file analyzer, one song at a time. Closing the view, hiding the app or pausing preparation stops further requests; the current file may finish. Android checks for a connected charger before each new bulk request. This does not change the existing loudness-leveling preparation policy. Failed or unreadable files are skipped. No audio or library map is uploaded. Constellation reads completed profiles on reopening; no decoding is required just to browse.

## Journeys

Choose a starting song, optionally a destination song and up to five essential stops. Select an approximate duration, a direction and Familiar ↔ Explore. Build journey creates a preview from available local songs, avoiding duplicates and long mixes as intermediate stops. Explicitly chosen long mixes can be endpoints or stops. Whole-song durations mean the actual length may differ from the request, especially in small libraries.

Review the order, move songs up/down, remove them or request an alternative. Pinned stops are protected from replacement but may be explicitly removed. Changes to the route criteria require rebuilding before playback. You can save the reviewed route as an ordinary playlist.

**Play after current** replaces upcoming songs while preserving the current playback position and play/pause state. **Play now** starts at the first song. Shuffle and repeat-one are disabled for a journey. Windows keeps its existing continuous-queue refill; Android repeats the resulting queue. Play next/Add to queue move an already-upcoming song instead of duplicating it; Android disables shuffle to honour that explicit order.

The map uses a dedicated lightweight Canvas renderer with 3D coordinates, perspective, depth ordering and frontmost-sphere picking. Sphere textures are cached. Animation is capped at 60 FPS on desktop, 30 FPS on phones, and 10 FPS with reduced motion. Hidden or closed maps stop their frame loop. The normal visualizer and Sona stop rendering while the map is active; Android also suspends its visual audio-analysis polling. No extra audio decoder or WebGL context is created. Camera angles stay unwrapped during interpolation, and taps are suppressed after drags, pinches or cancelled pointer gestures.

## Validation

Shared tests cover 3D projection and picking, unrestricted camera interpolation, cancelled/pinch gestures, saved-state migration, genre/artist encoding, sound summaries, sparse 2,500-song graphs, journeys and queue history. Local endpoint tests verify state persistence and complete shared-asset delivery. Android JVM tests cover spatial-state validation, legacy bookmarks, compact profiles and route-tail handling. `ConstellationPlaybackTest` exercises native queue insertion on a disposable device installation; compilation does not imply it has run on a physical phone.
