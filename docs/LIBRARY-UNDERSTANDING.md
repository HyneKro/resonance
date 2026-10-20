# Library understanding

Open **Settings → Library & downloads → Library review** on PC or Android.

- **To review** separates unresolved artist and genre questions from missing album/date details. Search covers the whole local collection; Show more replaces the old 150-song ceiling.
- **Artists** explains whether a credit came from recording metadata, an explicitly named performer, an upload title, or a channel that may be the uploader. Edit artists uses semicolons between performers, preserving punctuation within a band name. Saved credits drive artist browsing and Constellation.
- **Genres** distinguishes missing labels, artist-level estimates, direct source evidence and personal choices. Research genre looks up one recording through the existing providers. Bulk discovery remains beside Library review in settings. The app sends song/artist search terms, never audio.
- **Versions & copies** compares locally available recordings with the same lead artist and cleaned title. It explains matching source IDs, probable copies with compatible versions/durations, and alternate versions. These are review suggestions, not acoustic fingerprints. Nothing is merged, removed, hidden or substituted automatically.

Inline artist and genre choices protect only the selected field. Explicitly keeping a current value or an empty field is supported. Undo restores the previous metadata, including evidence and locks, without reverting favorites or listening history. Older all-field manual choices remain protected. The original audio files are not retagged.

Genre evidence can be reused from another local copy only when title, artist credits, version and duration agree. Estimates and already copied evidence cannot seed further copies. Conflicting labels must agree before reuse. Artist catalogue suggestions remain marked as estimates. Editing an artist/title invalidates the old recording reference and flags an unlocked genre for rechecking.

This release improves evidence handling and correction workflows; it does not claim that every artist or genre is automatically identifiable, nor that a specific unknown-genre percentage is guaranteed. Repost channels, sparse catalogue entries and ambiguous versions can still require review.

Verification: shared identity/API tests, native Android evidence/lock tests, isolated PC and phone UI checks including long titles, save/undo/back, searching past 150 songs, responsive layouts and startup asset graphs. Physical Android device testing is separate.
