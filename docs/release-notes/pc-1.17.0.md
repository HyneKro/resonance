# Resonance PC 1.17.0 — Deezer playlists

- Library → Add music now includes **Deezer playlist**. Connect a public playlist and choose its download folder.
- Reads the full song list with pagination and preserves playlist order, titles and artist credits. Supports full and localized Deezer browser links, up to 10,000 entries. Private playlists and short sharing links are not supported.
- Finds matching YouTube recordings for review. Compare the title, artist, duration and version, then select the recordings to download. Deezer supplies metadata, not subscription audio or preview clips.
- Remembers recording choices and downloaded Deezer identities for future playlist checks. Existing YouTube and Spotify sources continue to work.

Verification: 363 automated JavaScript checks, including 2,501-entry pagination, incomplete/private response rejection, cancellation, source persistence, candidate review and Spotify regressions. Public Deezer metadata read verified live. Isolated PC and phone UI checks cover adding a source, choosing a recording and selection. Clean packaged startup and complete extracted frontend module checks passed. Android native tests and lint also passed. YouTube availability still depends on the recording and connection; no physical Android phone was used for this release.
