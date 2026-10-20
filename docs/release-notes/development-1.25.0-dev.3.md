# Development preview — automatic test updates

Windows **1.25.0-dev.3** · Android **0.25.0-dev.3**

This is a development build for testing. Ordinary installations and the main download page remain on the approved releases.

## Updates

- Development installations now receive future development builds through App updates.
- The update screen identifies the channel: **Development channel · test builds**.
- Regular installations only receive approved releases. Cached updates from another channel are discarded.
- Updates retain the existing restart/installation confirmation, checksum checks and user data protection.

**One-time setup:** download this build manually. In your existing Windows development app, open Settings → App updates → **Install a downloaded ZIP…** and choose the ZIP. Android users can install the APK over the existing app without uninstalling. Later development updates will arrive in the app. Installing the Android preview updates the existing app; it does not create a second installation.

## Included in this preview

- Smart collections that fill themselves from the library.
- A persistent Activity panel for scans, downloads and background lookups.
- Clearer Constellation labels, playing path and centered queue controls.
- Comfortable and Large text options, stronger secondary text and keyboard improvements.
- Music only artwork with whole-app parallax and a listening ledger.
- Portable settings exports for preferences, playlist links and custom song edits.
- Loudness leveling and silent-edge skipping enabled for new installations; saved choices stay unchanged.

See [the preview guide](https://github.com/HyneKro/resonance/blob/development/docs/DEVELOPMENT-PREVIEW.md) for details and testing steps.

Automated Windows, update-isolation and Android build/unit/lint checks are run before publication. Physical-phone update and performance testing remains to be done.
