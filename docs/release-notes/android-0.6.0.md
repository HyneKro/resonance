# A living constellation

- Constellation gains a procedural Milky Way sky, softly drifting song stars, glowing filaments and small artist particle orbits. Tap a star to play and smoothly focus it.
- One finger orbits, two fingers pan, and pinching zooms. Cancelled gestures do not start songs. Home, Find playing and Star details help you navigate.
- A more compact player leaves more room for the map while retaining playback, volume, seeking and navigation. Larger map panels open on request and close by tapping empty space.
- Genre discovery now searches recording, release, release-group and credited-artist evidence, with catalogue matching as a fallback. Featured credits and title formatting are handled more carefully; ambiguous artists and mismatched versions are rejected.
- Research genres from Map & genres or from one star's details. Results and sources are stored locally, artist suggestions are marked ≈, and your edits remain protected. Reusable provider responses have an 8 MiB / 1,024-entry cache budget; per-song results survive cache eviction.
- New downloads retain explicit genre labels and distinguish upload channels from recording artists when source credits or an artist–title upload name are available.

Validation: 245 shared JavaScript tests, 91 Android JVM tests, APK/instrumentation compilation and lint. The extracted APK startup graph and phone-width UI were checked with a simulated native bridge. No physical Android device was connected; hardware touch feel, battery use and native playback need confirmation on the device. Install over the existing app to retain music and settings; package ID and signing identity are unchanged.
