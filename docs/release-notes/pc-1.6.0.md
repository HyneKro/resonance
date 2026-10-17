# A living constellation

- A procedural Milky Way sky and distant stars surround the library. Song stars now use glowing filaments, small particle halos and artist orbits that echo the music visualizer. Their slow drift stays bounded around saved positions, even in long sessions.
- Click a star to play and gently bring it into focus. Drag to orbit freely, right-drag or Shift-drag to pan, and scroll to zoom. Arrow keys orbit; Shift + arrows pan. Home and Find playing remain available.
- A compact selected-song card replaces the automatically opening details panel. Songs, Journey and Map & genres are the main tools; clicking empty space closes the panel. The normal player and other viewing modes are preserved.
- Genre research handles featured credits, upload suffixes and accents more accurately, with a second recording search using the lead artist. It checks recordings and releases before falling back to artist suggestions. Known electronic subgenres now map to the correct family.
- Research one star or start a pausable pass from Map & genres. Evidence and results are saved locally; artist-level suggestions carry ≈. Colours update without moving saved star positions. Use Refine map to regroup them when ready. Manual genre choices remain protected.

Validation: 245 JavaScript tests pass, including camera panning at arbitrary angles, long-session motion bounds, input cancellation, genre identity and cache persistence. Two public-recording research checks completed against live providers. Desktop and phone UI checks use isolated synthetic libraries. Extracted Windows startup and both packaged frontend dependency graphs verified. See the Android release for native checks and device limitations.

Genre coverage still depends on available catalogue evidence; unverified recordings are not assigned invented labels. Metadata lookups follow the [MusicBrainz API guidelines](https://musicbrainz.org/doc/MusicBrainz_API) and use the [Apple catalogue search](https://performance-partners.apple.com/search-api).
