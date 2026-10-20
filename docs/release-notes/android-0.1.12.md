Android preview 0.1.12, versionCode 13, ARM64.

- Settings → App updates checks public GitHub Releases without an account.
- Automatic app downloads use unmetered Wi-Fi and Android's Download Manager, so downloads can continue with the screen off. Manual download is also available.
- Download size, SHA-256, package identity, version and signing certificate are checked before installation.
- Tap Install update when ready and confirm with Android. If installation permission is requested, allow it and tap Install update again after returning.
- Update controls include progress, cancellation, release notes and automatic-check/download preferences.

Install this APK over your existing app once to gain online updates. Do not uninstall: updating preserves your music and settings. The signing certificate is unchanged.

59 native JVM tests and the build/lint checks pass. Update settings have been checked in a browser with a simulated native bridge. The Android installation flow has not been tested on a physical Android device.
