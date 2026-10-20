# Resonance PC 1.22.0 — Dynamic Lyrics

The Visualizer now has a **Lyrics** button immediately left of Desktop audio. It lights up when the current recording has matching timed lyrics. Turn it on for a readable current line, quiet surrounding lines and a short entrance animation. Typography follows the song's genre, with subtle artist-specific spacing.

- Lyrics follow playback, pause, seeking and Bluetooth visual-sync compensation. The overlay stays out of other viewing modes and loading transitions, ignores pointer input, and respects reduced motion.
- Better lookup cleans upload labels and featured credits. Catalogue search still runs when the exact-match endpoint fails, and can find timed alternatives to text-only results. Timecodes, local LRC files and embedded millisecond timestamps are preserved.
- Cached results work offline. Existing manual choices remain protected. A music-video version with a different duration can receive plain lyrics without incorrectly enabling synchronized display. Service outages are not remembered as “no lyrics”; requests are paced and respect rate limits.
- These are real line timestamps where available, not generated word-level karaoke. Lyrics coverage still depends on the recording and provider. Use **Behind the sound → Lyrics → Find lyrics** to review other results.

Validation: 415 automated app tests; hidden desktop and phone UI checks covering ready/active states, backwards seeks, blank breaks, mode transitions, visual delay, stale responses and compact/landscape layouts. The extracted portable build's complete frontend module graph and empty-library welcome screen were checked. Source audited before publication.

Music, playlists, settings, the approved checkpoint and the existing Music-only design are preserved.
