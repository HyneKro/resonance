# Constellation

Open **Library → Constellation** on Windows or Android. Select a star to see its cover, playback controls and related songs. Play starts it with up to thirty nearby songs queued behind it. Search opens a selectable song list; the list is also a keyboard and screen-reader alternative to the map. Drag to pan, scroll or pinch to zoom. Groups open as you zoom; Fit map and Find playing bring you back.

The map uses locally saved audio profiles when available: relative energy contour, a zero-crossing texture estimate, transient contrast and energy variation. Genre clues supplement them. These descriptors are estimates, not BPM, instrument detection, semantic understanding or guaranteed mood labels. Songs without usable clues gather in the uncharted centre. Colours reuse cached cover palettes or are sampled when a cover is opened; missing covers use a neutral star.

Positions and named bookmarks are saved locally. New measurements do not move existing stars automatically. **About this map & saved places → Refine map** rebuilds positions while retaining bookmarks.

**Prepare sound data** explicitly requests the existing local file analyzer, one song at a time. Closing the view, hiding the app or pausing preparation stops further requests; the current file may finish. Android checks for a connected charger before each new bulk request. This does not change the existing loudness-leveling preparation policy. Failed or unreadable files are skipped. No audio or library map is uploaded. Constellation reads completed profiles on reopening; no decoding is required just to browse.

## Journeys

Choose a starting song, optionally a destination song and up to five essential stops. Select an approximate duration, a direction and Familiar ↔ Explore. Build journey creates a preview from available local songs, avoiding duplicates and long mixes as intermediate stops. Explicitly chosen long mixes can be endpoints or stops. Whole-song durations mean the actual length may differ from the request, especially in small libraries.

Review the order, move songs up/down, remove them or request an alternative. Pinned stops are protected from replacement but may be explicitly removed. Changes to the route criteria require rebuilding before playback. You can save the reviewed route as an ordinary playlist.

**Play after current** replaces upcoming songs while preserving the current playback position and play/pause state. **Play now** starts at the first song. Shuffle and repeat-one are disabled for a journey. Windows keeps its existing continuous-queue refill; Android repeats the resulting queue. Play next/Add to queue move an already-upcoming song instead of duplicating it; Android disables shuffle to honour that explicit order.

The map paints only on interaction, resize or visible playback updates. It does not run its own continuous animation loop while idle or hidden. The existing visualizer retains its own settings.

## Validation

Shared model and local-server tests cover persisted coordinates, malformed state, sound summaries, relationships, route constraints, 2,500-song planning, queue history and both platforms' shared assets. Android JVM tests cover compact profile parity, map validation and route-tail handling. `ConstellationPlaybackTest` exercises native queue insertion, position preservation, shuffle/repeat changes and duplicate removal on a disposable device installation.
