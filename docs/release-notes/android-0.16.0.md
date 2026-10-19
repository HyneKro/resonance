# Android 0.16.0-preview — everyday polish

- Clearer sheets, consistent playback icons and easier-to-hit controls.
- Compact phone headers fit, and landscape navigation stays clear of the player.
- EQ and other sliders retain deliberate sideways adjustment; vertical scrolling does not change their values. Reset keeps scroll position and focus.
- Menu refreshes preserve unfinished edits. Saving has busy feedback and duplicate protection; notifications remain visible above open sheets.
- Constellation discards unused labels as you explore. Existing native playback, saved music, settings and mascot movement are preserved.

Validation: 111 Android unit tests passed; both ABI builds and instrumentation compilation succeeded. Lint reports zero errors and nine existing warnings. Shared regressions, 50 PC/phone screen previews and 31 behavior checks passed, including real simulated touch events. The APK's complete frontend module graph and existing signing identity were verified. No physical S22+ or emulator test is claimed.

Install this ARM64 APK over the previous app and confirm Android's installer. Do not uninstall: uninstalling removes private app music. Version code 41 keeps the existing package and signing identity.
