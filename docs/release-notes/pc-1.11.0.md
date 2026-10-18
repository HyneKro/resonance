# Resonance 1.11.0 — musical layers and listening editions

- The visualizer now distinguishes estimated sustained notes from percussive attacks across its frequency lanes. Strands and accent particles respond differently, with Bluetooth visual sync preserved. This is a lightweight visual approximation, not downloadable instrument or vocal stems; playback audio stays unchanged.
- Music Only gains static listening editions: cover-led compositions, subtle genre-dependent line artwork and album-style typography, without a background animation loop.
- Sona has 104 revised illustrated poses, consistent headphone details and the Resonance clef, corrected blink timing, stable foot registration and bounded theme-tint caching. Fixed animation speed and three-cycle routines remain.
- Constellation uses a directly composited sky, cached projection/layout measurements and batched distant stars. Satellite details fade in more gently and captions/panels have clearer contrast.
- Genuinely unavailable playlist videos can use a strictly matched alternative recording. Rate limits and temporary blocks pause instead of launching replacement searches. Saved alternatives retain their playlist identity and are identified in song details.

Validation: 286 JavaScript tests; desktop/portrait GPU compilation and rendering; every Sona pose/emblem and bounded caches; static Music Only previews; a 2,600-song Constellation fixture; clean extracted Windows startup and complete distributable module graphs. The local Constellation fixture measured about 4 ms median drawing CPU time, not a performance guarantee for every computer. Android build, unit tests, lint and instrumentation compilation also pass; no physical S22+ test was available. The replacement-download flow was verified with controlled failures and matches, not a live blocked YouTube account.

The preceding designs are preserved privately for rollback. Existing music, playlists, settings and the approved checkpoint remain intact. Install through App updates when ready.
