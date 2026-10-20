# Resonance for Android 0.25.0-preview

This release includes the approved discovery and personal setup improvements: Smart collections in Library, clearer Constellation navigation, cover-based Music only layouts, readable text options, settings transfer and Activity & checks. See the [complete feature notes](https://github.com/HyneKro/resonance/releases/tag/pc-v1.25.0).

Music only remains still on phones. Sound preparation processes one file at a time while charging and pauses when the app goes into the background. Android retains native playback, notification controls and its existing performance defaults. Windows-only updater file-lock handling does not change Android's installer.

This ARM64 APK keeps the existing package ID and signing certificate. VersionCode 66 updates both the previous regular preview and dev.8 in place. Install over the existing app; never uninstall to update. Android still requires its system installation confirmation.

Validation: 470 JavaScript tests; 134 Android JVM tests; Android ARM64/x86_64 builds, device-test compilation and lint (zero errors, nine existing warnings); isolated desktop/phone layout, Constellation, startup and rapid-transport checks; both extracted startup module graphs; and an empty-library packaged Windows startup. Android package identity, versionCode and signing certificate were verified. Physical Android device testing was not performed.
