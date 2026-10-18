# Resonance 1.15.1 · Correct artist credits

Artist pages now retain performers who upload their own collaborations, separate combined uploader/performer tags, and include explicitly named remixers. Feature credits before a title separator no longer absorb the song title. Version and video labels such as “VIP”, “Music Video” and numbered daily uploads are not treated as artist names.

Existing saved credits are repaired automatically on first launch. Original source information, manual corrections, listening history, favorites, playlists and audio files are preserved. Constellation and genre lookups use the same corrected credits.

Validation: all 320 JavaScript tests pass, including shared credit fixtures, repeatable repair and a persisted-library migration. An isolated existing-library check confirms the artist page and song list agree after repair. The extracted clean portable build reaches the empty-library welcome screen without renderer errors; nested startup assets resolve in both distributables.
