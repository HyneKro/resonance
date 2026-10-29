# Resonance development: Windows 1.26.3-dev.5 / Android 0.26.3-dev.5

The experimental Govee room-lighting feature has been removed at the owner's request.

- Removed Room lighting from Settings on Windows and Android.
- Removed device discovery, UDP control, lighting frame publishing and calibration controls.
- Removed lighting-only spectrum samples, timers and Android Wi-Fi multicast permissions. Music only no longer has an optional lighting analysis path.
- Music, playlists, playback, visualizers and existing user data are preserved. This update does not change the strips' LAN Control switch in Govee Home.

These are isolated development builds. Ordinary Windows/Android updates and the live download page remain unchanged. Android installs over the existing app with the same package and signing identity; do not uninstall.

Verification:

- 578 shared tests and 152 Android JVM tests pass.
- Both Android ABI builds and device-test compilation pass. Lint: no errors; nine existing warnings.
- Extracted Windows and Android startup graphs pass, including nested imports. Removed lighting assets are absent from both distributables.
- Clean Windows portable welcome-screen startup passes with no renderer errors. Settings contains the seven remaining sections and no Room lighting entry.
- Packaged phone UI passes with a simulated native bridge: Settings, Visualizer analysis, stopping analysis in Music only and no lighting calls.
- Android ARM64 APK retains package `music.resonance.mobile`, signing certificate and versionCode 118; Wi-Fi multicast permissions are absent.
- No physical Android device test was performed. No LED commands were sent for this removal.
- Publication checks verify uploaded hashes and sizes, frozen Windows updater compatibility, anonymous discovery/downloads, current-version suppression and development-channel isolation for current and legacy clients. Main, Latest and public download buttons remain unchanged.
