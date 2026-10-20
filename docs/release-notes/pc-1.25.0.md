# Resonance 1.25.0 — discovery and personal setup

The approved development batch is now available through the regular update channel, with Android 0.25.0-preview alongside it.

- **Smart collections** have their own place in Library. Four starter collections fill themselves from your music; custom rules can combine artists, genres, favorites, listening history and duration.
- **Constellation** makes the playing song and upcoming path clearer, with quieter captions, distinct genre/artist/song labels, numbered queue steps and progress controls at the top center.
- **Music only** builds its composition entirely from the current cover, with independent layers drifting slowly on Windows. Small windows keep decorative elements behind the artwork instead of adding a scrollbar. Android and reduced-motion layouts remain still.
- **Accessibility** adds comfortable and large interface text, stronger secondary text and improved keyboard navigation.
- **Transfer settings** exports a small file containing shared preferences, playlist links, smart collections and supported per-song customizations. Import previews protect existing edits and leave uncertain matches pending. Audio, listening history, local folder paths and credentials are not transferred; this is not automatic device synchronization.
- **Activity & checks** brings scans, playlist review, metadata discovery, sound preparation and a current-song lyric check together. A subtle main-screen icon appears while work is running; the panel remains accessible from Library & downloads when idle.
- New installations enable loudness leveling and silent-edge skipping. Existing preferences are preserved. Blank notifications are suppressed, rapid skipping stays responsive, and expected Play/Pause interruptions no longer show browser errors.
- The **Windows updater** waits for this installation's remaining processes, retries temporary locks and skips unchanged files. Changed files are replaced atomically with rollback protection. A persistent lock gives a retry explanation without disturbing other installations.

Regular installations receive this release through App updates. Development installations stay on their separate channel: to return to regular releases, install this ZIP through **Install a downloaded ZIP…**, or install the Android APK over the existing app. Android versionCode 66 is newer than dev.8; do not uninstall. Music and local data are preserved.

Validation: 470 JavaScript tests; 134 Android JVM tests; Android ARM64/x86_64 builds, device-test compilation and lint (zero errors, nine existing warnings); isolated desktop/phone layout, Constellation, startup and rapid-transport checks; both extracted startup module graphs; and an empty-library packaged Windows startup. Android package identity, versionCode and signing certificate were verified. Physical Android device testing was not performed.
