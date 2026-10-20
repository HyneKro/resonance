# Resonance for Android

The Android app shares Resonance's visual identity and music-library features, with native Media3 playback, system media controls and a touch interface. The current preview is **0.23.1-preview** (versionCode 52), built for ARM64 phones such as the Galaxy S22+.

**[Download the latest APK](https://hynekro.github.io/resonance/)** and install it over the existing app. The package ID and signing identity must stay unchanged. Uninstalling deletes private app music and data; an update does not require uninstalling.

## Everyday use

- **Library** opens your music. Tap a song's cover or title to play; tap the playing song in the bottom player for details.
- **Settings Ã¢â€ â€™ Library & downloads** adds local folders or online playlist sources. An empty selected folder is a download destination. Check the playlist, review the selection, then download songs before listening offline.
- Public **Deezer playlists** are supported alongside YouTube and Spotify. Paste the full `https://www.deezer.com/playlist/Ã¢â‚¬Â¦` browser link (localized links work too). Deezer supplies titles, artists and playlist order; use **Choose recording** to review a YouTube version, then download its audio. Private playlists and short sharing links are not supported. All pages are read, up to 10,000 songs; an incomplete response is reported rather than silently accepting the first page.
- **Visualizer**, **Constellation** and **Music only** are three separate views. Visual settings appear only with the Visualizer. One-finger swipes rotate the scene; settings sliders require a deliberate sideways drag, so vertical scrolling does not change a value accidentally.
- **Lyrics** in Visualizer lights up when matching line timestamps are available. Tap it for animated lyrics. Seeking and Bluetooth visual sync are respected; lyrics remain available offline after lookup. Text-only results stay in Behind the sound. Timing & word highlighting adds per-song offsets and timed-lyrics import/export; word cues fill progressively when available. Heavy audio analysis runs only in the optional PC tool ([guide](../docs/LYRICS.md)). Lyrics availability depends on the catalogue and recording; unsupported versions are not given invented timestamps.
- **Playback & sound** contains loudness leveling, silent-edge skipping, EQ and visual sync. Measurements are local. Uncertain metadata can be reviewed in Behind the sound.
- Playback runs in a native background service. Lock-screen and notification controls provide transport controls; hardware volume buttons adjust music. Samsung's battery restrictions can affect prolonged background work. Screen-off listening help links to system settings without changing restrictions automatically.
- **App updates** checks for new APKs. Automatic downloads use unmetered Wi-Fi by default. Installation always uses Android's confirmation screen.

The current polish pass improves readable sheets, consistent transport icons, compact-phone and landscape layouts, preserved edits/focus during panel refreshes, and Constellation label reuse. Version-specific changes are in [release notes](../docs/release-notes/).

## Phone defaults and storage

Balanced detail (now adapting its resolution under sustained load), 60 FPS, HDR off and Sona off are the mobile defaults. 30 FPS, 120 FPS and match-display options are available, but the actual frame rate depends on Android/WebView, the device refresh setting, GPU load and temperature. HDR is a capability-dependent WebView request, not a guarantee of HDR output.

Downloads preserve compressed audio by default without deliberately converting it to MP3. Existing FLAC/WAV and other supported local formats stay untouched. Optional Opus 128 kb/s saves space for new downloads (roughly 1 MB/minute). Source quality cannot be improved by converting to lossless. Playback currently uses Media3's 16-bit PCM analysis path; this build does **not** claim bit-perfect high-resolution/USB-DAC output.

Wi-Fi/unmetered playlist checks and downloads are on by default. A 512 MB free-space reserve is checked before each download. Artwork is resized to at most 640 px and the cache defaults to 128 MB. Settings displays linked audio, downloaded audio, artwork, database, extracted tools, APK and free space. Cache clearing never removes songs. Android may also evict artwork itself; rescan/research can restore covers.

The downloader bundles Python/FFmpeg, so the APK is approximately 80 MB and uses additional space when its tools are first extracted. The much larger `.toolchain` folder is PC-only development tooling, never shipped inside the APK.

## Verification and device checks

Native unit tests, Android lint and both ABI builds run through the build script below. Shared web regressions and isolated browser previews cover touch gestures, menus, saved state and representative phone layouts. Browser simulations are not physical S22+ tests.

Before treating a preview as fully device-verified, check:

1. AAC/MP3/Opus/FLAC playback, pause, seek, shuffle, queue advance and relaunch.
2. Screen-off playback, notification/headset controls, interruptions and disconnected headphones.
3. Sustained Visualizer/Constellation performance, battery use and temperature. High frame-rate settings depend on the device and WebView.
4. Bluetooth visual timing against actual sound, then a wired output.
5. Folder access across app updates, downloads, cancellation, retry and unavailable recordings.
6. Android's app-update installer and permission prompts over the previous version.

No connected physical phone or working emulator is assumed by the build. Automated results alone do not establish device-specific capture, download or background-playback success. There is no PC-to-phone library synchronization or bit-perfect high-resolution output claim.

## Build

The `shared/` directory is a synchronized copy of the desktop's shared web assets. It does not reference the desktop runtime or depend on personal data. `web/` is the phone UI and bridge; native source is in `app/src/main/java/music/resonance/mobile`.

Use JDK 17 or 21 and Android SDK platform 36 / build-tools 35.0.0. Set `JAVA_HOME`, then run `tools/setup-sdk.ps1` and review the Android SDK license prompts. `-AcceptLicenses` is available only when you explicitly want to accept those terms. This user's initial SDK setup was explicitly authorized in the chat. The SDK and Gradle cache are kept under `.toolchain/`.

Run `tools/build.ps1` to build both ABI variants, compile the device test and run JVM tests/lint. Use `-DeviceTests` only with a disposable emulator/test installation: the instrumentation test adds a generated tone and changes test settings. Standard cross-platform Gradle commands are also available through `gradlew` / `gradlew.bat`.

The source archive excludes PC SDKs, Gradle caches, APKs, local paths, signing keys, private music and the browser fixture. It contains the shared UI assets needed to build independently.

## Upstream software

See `web/credits.html` and `web/licenses/`. Download support uses [youtubedl-android](https://github.com/yausername/youtubedl-android) 0.18.1 (GPL-3.0), including its FFmpeg package; AndroidX Media3/WebKit/DocumentFile use Apache-2.0. Bundled downloader runtimes retain their upstream licenses. This local preview does not change the desktop project's licensing. Before publicly distributing a combined product, provide the required licenses and corresponding sources for the chosen dependency versions; the app-source zip alone is not a complete upstream source bundle.

Android references: [background playback](https://developer.android.com/media/media3/session/background-playback), [capture permissions and restrictions](https://developer.android.com/media/platform/av-capture), [local WebView assets](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content).
