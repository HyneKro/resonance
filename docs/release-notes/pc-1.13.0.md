# Resonance 1.13.0

Artist exploration now draws connections from the artist hub to every song, including artists with only one song. All music and the current genre have controls inside the map; the existing back/forward trail remains available. Artist navigation retains a relevant genre in the trail.

Unavailable YouTube recordings get a second, exact-phrase search when a broad search fails. Automatic replacements still require matching artist, title, version and duration. Temporary service restrictions stop requests rather than triggering more searches. Downloads also offers Find another upload with an editable search, listening links and a recording comparison. Choosing a match does not start downloading. Saved replacements retain the original playlist identity to avoid repeated missing-song prompts.

Genre discovery now checks a second regional catalogue, handles bilingual artist aliases, and accepts a short music-video intro/outro difference when matching genre evidence. Consistent releases from an unambiguous artist catalogue can supply a labelled artist suggestion. Results remain local; manual genre edits are preserved. Retry missing genres to research unresolved tracks. This does not guarantee that every track can be classified.

Verification: 295 JavaScript tests and both real frontend replacement flows passed. A 2,600-song Constellation fixture verified all artist links, genre/home navigation, pan/zoom and shader compilation without console errors. Live isolated downloads recovered Over the Cycle (HEALER), The Archive (Aineth) and Petrochem (Head Splitter) through matching alternate uploads, including audio conversion and metadata. Provider availability can change. Clean packaged startup and recursive frontend asset checks passed before publication.

Update over the current portable installation to retain your music and settings. Spotify remains a metadata source with reviewed YouTube matches; protected Spotify audio is not downloaded.
