# Resonance 1.26.1 — Android playlist search and queue recovery

Windows **1.26.1** and Android **0.26.1-preview** (versionCode **106**) promote the reviewed development batch to the ordinary update channel.

- Android automatically searches for proposed YouTube recordings when checking public Spotify and Deezer playlists, using the PC ranking rules. Song rows show the proposed recording, uploader, duration and match score. Select songs directly, or use **Review recording** to compare alternatives. Proposals remain unchecked until chosen.
- Checks show search progress song by song and reuse recent search results. Reviewed choices survive playlist rechecks. If automatic search cannot find a recording, manual search remains available. Spotify and Deezer still supply song lists; audio uses the existing YouTube workflow.
- Disconnecting a playlist in Resonance clears its pending and skipped songs, removes its queued selections and interrupts a transfer belonging to that source. Other connected playlists can continue downloading. Saved audio remains in the library.
- Old pending entries belonging to disconnected sources are removed on restore. Late scan results cannot restore deleted sources, and stale selections no longer block valid songs from other playlists.

The Windows download workflow is unchanged. No visualizer changes are included in this release.

On ordinary installations, open **Settings → App updates**, check, download, then choose **Install update** on Android or **Restart & update** on Windows. Android updates the existing app with the same package and signing identity; do not uninstall. Music, playlists and settings are preserved. Android versionCode 106 also allows a manual update over development versionCode 105; development installations do not switch channels automatically.

After updating Android, run **Check playlists** again to populate proposed recordings. Previously disconnected playlists do not need to be reconnected to clear their orphaned rows.

Validation includes 560 shared tests, 151 Android JVM tests, Android builds/lint, isolated desktop/phone selection and queue-removal UI checks, both extracted startup module graphs, clean empty-library Windows startup, APK identity/signature checks and the frozen legacy Windows updater. Uploaded hashes and anonymous updater/download discovery are verified before completing publication. The supplied public 15-song playlist returned candidates for all 15, with identical Android/PC ranking; this metadata check does not establish successful audio downloads for every result. Physical Android device testing remains outstanding.
