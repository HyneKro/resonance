# Resonance 1.24.0 — the listening edition

Music only has a new artwork-led layout: large intact cover art, expressive song typography, cover-sampled colors, layered print details and four genre-sensitive compositions. Album/year details appear when known, Behind the sound is one click away, and an Up next preview opens the queue. Playback and global navigation keep their familiar positions. Long titles wrap; wide covers keep their proportions. The screen stays lightweight, with no continuous scene rendering.

Installed portable apps now clean up obsolete `.updates` content automatically after launch. One latest rollback backup is retained; completed payloads and older successful update folders are removed. Cancelled preparations are cleaned too. Active installers, interrupted/failed updates, personal data and redirected folders are protected. Cleanup runs separately from playback and records its result locally.

The previous Music only design remains recoverable from 1.23.5. Your music, playlists, preferences and cover cache are preserved.

Validation: 436 JavaScript tests, 131 Android JVM tests, Android build/lint (zero errors; nine existing warnings), isolated desktop/phone layout and action checks, final ZIP/APK startup module graphs, empty-library packaged Windows startup, and full ZIP staging through the original 1.22.0 updater. Cleanup was tested against active work, failed rollback, private files, directory junctions and repeated execution. No physical Android test was performed.

Design limits: treatments follow existing genre metadata and artwork quality. A generic or low-resolution thumbnail remains a limitation; this is not a claim of a uniquely painted artwork for every song.
