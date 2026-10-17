# Resonance for Android — 0.2.1 preview

A separate Android application based on the approved desktop checkpoint of 15 October 2026. The approved checkpoint is preserved. Shared visual fixes are applied separately to the current desktop and Android runtimes; the library and personal settings are untouched. This is an initial device-test build, not a claim that desktop parity or S22+ performance has been fully verified.

## Windows 1.2.2 / Android 0.2.2 · stable track handoffs

Saved visual identity and the opening audio chapter are selected together. Metadata/artwork refreshes retain the current session's character, and first-time analysis no longer introduces another opening silhouette. Windows also repairs the hidden updater helper's startup and automatic relaunch. See the new platform release notes for upgrade recovery and validation details.

## Windows 1.2.1 / Android 0.2.1 · playback and transition fixes

Loudness leveling now latches each track’s saved gain, avoids mid-play analysis changes, and leaves spectral analysis unaffected. Track Character uses continuous blending through seeks and analysis handoffs, with smaller fluid deformations. The timeline shows hatched skipped edges and exact times. Desktop EQ resets keep the current scroll position. See the platform release notes for validation and limits.

## Windows 1.2.0 / Android 0.2.0 · song maps and a smoother listen

- **Track character** now combines existing genre/theme cues and live frequencies with a compact, locally measured map of each file. Energy/texture chapters morph related particle forms, with gradual anticipation, changing density, glow and fluid detail. Background travel, camera motion, Sona timing and the live beat estimator remain unchanged. These are audio measurements and stylistic estimates, not instrument recognition or guaranteed verse/chorus labels.
- **A smoother listen**, in Sound or Settings, offers optional loudness leveling toward −16 LUFS with measured true-peak headroom and a +6 dB boost cap. It applies steady gain and retains dynamics. Skip silent edges removes only measured leading/trailing silence from playback. Both are off initially; existing settings are preserved.
- **Behind the sound → Listening edit & song analysis** displays the saved energy map and loudness. Analyze/refresh a song, preview and save start/end markers, or reset to the whole file. Mark spoken video intros/outros manually; automatic speech-versus-singing removal is not included. Original audio files are never modified.
- **PC experimental crossfade** overlaps queued songs by 1–8 seconds (off by default). Repeat-one, long mixes and consecutive songs with the same album label retain their original transitions. Seeking, pausing or manually changing songs cancels an overlap. Android keeps native playback transitions.
- **Library review** collects missing or uncertain details. Recording searches compare current/proposed values; choose fields individually, preserve manual choices, and undo the last metadata edit without reverting favorites or listening history.

Analysis runs one file at a time and is cached on the device. Music only avoids new decoding unless leveling or silence skipping needs it; explicit Analyze remains available. On Android, linked files may need a temporary copy (up to 512 MB, subject to free space), removed after analysis. No audio is uploaded. Install updates over existing copies to keep music and settings.

## Install on the S22+

1. Transfer `releases/Resonance-Android-0.2.0-preview.apk` to the phone and open it in My Files. Android may ask you to allow installation from that file app. Install it over the existing version, then open Library and tap any song cover or title to play. In Downloads, Listen now takes you directly to saved songs; Resume / Download continues your remaining downloads. Existing songs, sources and destination choices are retained. If you still have the old 101-song preview, expand Playlist & download options → Check playlists once.
2. **For an empty download folder:** open Library → Add music → Download a playlist. Paste the playlist link and tap Find playlist songs. Then Choose folder, select or create your music folder, and tap Download songs. Songs appear in Library as they finish. Existing linked playlists are under Add music → Downloads & playlist updates.
3. **For music already on the phone:** use Add existing music. This scans the chosen folder; it does not download songs into it. Old folders linked in 0.1.0 need to be selected again through Choose folder to grant permission to save downloads.
4. Start with a small collection and the default graphics settings. The full player works independently of the PC.

The ARM64 APK fits the S22+; Android 10 or newer is required. It is a debug-signed preview for local testing, not a Play Store release. Keep the signing key used for this build for compatible updates. **Install 0.1.13 over the existing app. Do not uninstall to update:** **uninstalling Android apps deletes their private library, settings and downloaded music**. Files saved to a separately chosen Music folder remain outside the app. Existing private downloads are not moved automatically when you change the destination.

No personal playlists are embedded in the distributable. Connect playlists in Settings → Music sources. Files stored on a PC must first be copied to the phone; Android cannot access a PC drive directly. Embedded tags, common `.info.json` / cover sidecars and recognizable YouTube IDs in bracketed filenames help preserve metadata and avoid repeat downloads.

## Changes in 0.1.13

Companion preview to the Windows first-start repair. Android is unaffected by the Windows server route bug; playback and visuals are unchanged. Startup dependency checks now follow every import in the actual APK assets, including the updater. Shared startup assets remain aligned.

Validation: 59 JVM tests pass; build and lint succeed with no errors (16 warnings). The APK retains its signing certificate and package ID with versionCode 14. No physical Android device was used for this release.

## Previous changes in 0.1.12

Settings → App updates now checks public GitHub Releases and downloads newer APKs on unmetered Wi-Fi through Android's Download Manager. A manual download can use mobile data. Downloads survive screen-off; reopening the app also restores progress and checks completed downloads. Files are verified against the expected size, SHA-256, package name, newer versionCode and matching signing certificate. Tap Install update and confirm the Android installer; grant installation permission if requested, then return and tap Install again. Automatic checks and downloads are independently optional. No GitHub account or owner credential is needed. Install this APK over your existing version once to gain online updates.

Validation: 59 JVM tests, build and lint pass. The update settings flow is checked with a simulated native bridge; the installer still needs physical-device verification. VersionCode is 13.

## Previous changes in 0.1.11

- Shuffle explicitly installs a new randomized order in the native player while preserving the current song, position and paused/playing state. With three or more songs the next song differs from the sequential successor; all queued songs appear once per cycle. New library selections inherit shuffle. Turning it off restores playlist order at the current song.
- Now & next reads the native playback order, including its wraparound. Selecting a queued song seeks within the existing queue instead of replacing and reshuffling it. Saved shuffled order is restored after reopening when the library still matches.
- Shuffle has a filled accent background and a short confirmation. Its toggle uses the native player's current state and ignores overlapping taps while the request completes. Enabling it also exits Repeat track, with an explicit confirmation; repeat-one can still be enabled afterward.
- Playback checkpoints cannot overwrite a newer saved shuffle change with an older asynchronous write. Existing music files, sources and download settings are retained.

Validation: 54 JVM tests pass, including Media3 shuffle-order traversal for up to 2,526 tracks, toggle wiring without seeking/reloading, repeat-one interaction, fresh queues and saved-order validation. The isolated phone touch check verifies button feedback, queue ordering, queue selection, next/previous, unshuffle and overlapping taps with a simulated bridge. A native automatic-transition/background playback test compiles but has not run on a phone or emulator. The APK keeps the existing app ID and signing certificate, with versionCode 12.

## Previous changes in 0.1.10

- Reset arrows update controls in place, preserving menu scroll and focus. This also covers Reset view and exact Bluetooth-offset edits; slider and numeric offset values stay synchronized.
- Settings sliders wait for a deliberate sideways touch drag. Vertical swipes scroll the menu even when they begin on a slider. Mouse and keyboard adjustment remain available.
- One-finger swipes on an empty part of the visualizer orbit the particle scene in both directions, with the existing camera inertia and unrestricted angles. Portrait swipes account for the scene’s 90-degree rotation. Orbit remains available during Rollercoaster. Two-finger song/seek gestures, controls and Sona dragging stay separate; Music only does not orbit.
- Phone bloom defaults to 0.18 instead of 0.24. The old default migrates once; custom values remain intact. Desktop bloom is unchanged.

Validation: isolated touch-input checks cover scroll position and focus, slider scrolling/adjustment, portrait/landscape orbit, Rollercoaster, two-finger playback/seek gestures, Sona dragging and Music only. Native playback code is unchanged. Physical S22+ testing remains necessary.

## Previous changes in 0.1.9

- All twelve kaleidoscope patterns and their on/off toggle now dissolve smoothly, including changes made during a fade. The same rendered scene feeds both patterns, without stretching between folds. Reduced motion uses a shorter dissolve.
- Visual character now includes optional Rollercoaster camera and audio-reactive Camera zoom. Rail speed defaults to 2.22× and reaches 20×. Zoom is capped at strength 3, widens the field of view while moving inward and returns to the wide view in quiet moments; it has no intensity slider. Reset view disables both effects. Both are off by default.
- The current shared Sona renderer includes the Resonance clef on her headset. Native playback, playlist downloads, private storage and the portrait scene rotation are retained.
- Phone defaults remain Balanced detail, 60 FPS and HDR off. Install over the previous preview to keep songs and settings. This shares the latest PC visual updates; Windows-only features such as the floating desktop Sona window are not part of Android.

Build verification: both ABI variants and the instrumented test APK compile; all 49 unchanged native JVM tests remain passing (Gradle up-to-date), and lint has no errors (15 existing warnings). An isolated phone-layout preview verifies portrait rotation, the new camera controls and saved preferences, kaleidoscope fades and Music only. The 0.1.9 certificate matches 0.1.8 and versionCode increases from 9 to 10. No physical Android device was connected for on-device validation.

## Previous changes in 0.1.8

- In portrait orientation, the complete landscape visualizer is rotated 90 degrees to fill the screen. Particle proportions and kaleidoscope symmetry use the landscape aspect ratio before rotation. Controls and Sona remain upright.
- Landscape orientation restores the normal scene layout. The change includes the HDR presentation surface if supported.
- Built and checked locally; orientation and performance still need confirmation on the S22+.

## Previous changes in 0.1.7

- Background transitions no longer travel farther after hours of listening. The fluid current integrates changes of speed from its present position instead of multiplying the entire session clock by the next track’s recipe.
- Short travel, continuous ambient motion and cover-color transitions are preserved. The drift clock lives outside the GPU scene, so rebuilding graphics does not discard its history.
- Desktop and Android use identical corrected clock and shader files. Automated simulations cover up to 48 hours, 800 song changes, freeze/reduced motion and graphics recreation. The shader and full scene were rendered in isolated Electron checks at simulated 1-minute, 6-hour and 24-hour session times. These are accelerated checks, not a day-long phone soak test.
- This build retains the 0.1.6 audio-buffer fix. Update over the existing app to retain music and settings.

## Previous changes in 0.1.6

- Fixed the exact reported playback crash: `IllegalArgumentException: The source buffer is this buffer`. Media3 can send its shared empty buffer before decoded audio arrives. The spectrum processor attempted to copy that buffer into itself, stopping playback with visuals either on or off. Empty input is now a no-op and does not erase pending audio.
- Reproduced that exception in a local regression test against 0.1.5 before applying the fix. Five new tests cover startup polling, unchanged PCM bytes, varying buffer sizes, partially consumed output, both analysis modes, end-of-stream, flush and reset. One exercises the real Media3 processing pipeline.
- The report confirmed the file was readable and identified as Opus. This fix does not require reconnecting that folder, downloading the songs again or reinstalling from scratch. Install this update over the existing app and try Sierra again.
- Native device tests still require a connected phone or usable emulator; no S22+ playback claim is made from the local test results.

## Previous changes in 0.1.5

- Play retries now prepare the player again after an error. Skipping away from an error also restarts loading. Decoder initialization can fall back to an available lower-priority decoder.
- App-owned downloads are resolved when their audio is opened, off the UI thread. A stale file path can reconnect to the same saved filename or an unambiguous YouTube identity in the current app Music directory. Linked folder permissions are not bypassed, ambiguous matches are left alone, and no audio is deleted, moved or re-encoded.
- Playback errors distinguish file access, parsing, decoding and audio output. Playback details checks whether the saved file is readable, reports its actual size and audio stream, and exposes the exact player error. Copy diagnostic details copies the report locally only; nothing is uploaded.
- Update over the existing app, then try a downloaded song. If playback still fails, open **Playback details → Copy diagnostic details** and share that text. The old generic message did not reveal the S22+'s underlying error, so these recovery fixes are not confirmation that its original failure has been reproduced or resolved.
- Unit regressions cover path preservation/recovery and error classification. The compiled device tests include synthetic Opus and AAC downloads, stale-path recovery and retry after a missing-file error. No physical phone was available; these device tests have not run.

## Previous changes in 0.1.4

- Covers, titles and durations form one large play button in Library, the queue and suggestions. A visible play symbol makes the cover action explicit; the separate ⋯ button opens song details. The bottom player artwork still opens details.
- Library has Play all, a Downloaded filter and a brief tap hint. Empty filtered views offer Show all my music.
- Listen now clears old searches/filters and opens downloaded music. It is also available while more songs download, without interrupting the job.
- Selecting a queue song returns to the player without an asynchronous queue refresh reopening the panel.
- Native playback and downloaded-file handling are unchanged; this corrects the tap targets, following confirmation that title taps already played audio.

## Previous changes in 0.1.3

- A recording that fails extraction or download is automatically skipped after the downloader's bounded retries. Later songs continue without manual deselection. Finished files remain saved. A duplicate failed recording in the same job is not requested again.
- Skipped entries retain a short reason locally, are deselected by default, and survive app restarts and playlist reordering/refresh. Retry skipped explicitly attempts them again; a successful retry removes the entry from the pending list.
- Connection loss, rate limiting, service outages, missing tools and storage/permission failures pause the batch instead of labelling every remaining song unavailable. Cancelling leaves the current and unattempted songs ready to resume.
- A simpler Downloads screen leads with Download / Resume and shows saved, skipped and remaining counts. Ready and Skipped tabs separate the lists. Folder choice and playlist maintenance are compact expandable sections. Retry skipped and Listen now are available when finished; the library provides a direct link back to downloads.

## Previous changes in 0.1.2

- Bundle verified yt-dlp 2026.08.19, including its JavaScript challenge solver, and replace an older extracted engine when upgrading. The Android wrapper already includes Python 3.12 and QuickJS. Check official stable updates before playlist checks/downloads, at most daily after a successful check; failed automatic checks keep the bundled engine usable. Manual update remains available. Updates use HTTPS, bounded reads, SHA-256 verification and rollback on validation failure.
- Detect incomplete playlist pagination, including a successful process that returns 101 entries while declaring 2,532. Keep the previous list and report an incomplete scan instead of silently treating it as complete.
- Search across all pending songs, show page and full-selection counts separately, and keep selection across pages. Download selections pass compact keys to a saved native job, avoiding Android's system-message size limit for large collections.
- Check audio formats before downloading, retry transient extraction/fragment failures, and show short actionable errors with optional technical details and a direct Update downloader button.

The packaged `app/src/main/res/raw/ytdlp` is the official zipimport executable from [release 2026.08.19](https://github.com/yt-dlp/yt-dlp/releases/tag/2026.08.19). SHA-256: `1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6`. Its bundled solver avoids requiring a separate remote JavaScript download. See the upstream [EJS documentation](https://github.com/yt-dlp/yt-dlp/wiki/EJS).

## Previous changes in 0.1.1

- Separate existing-file import and playlist-download paths. Playlist linking checks immediately, names can be inferred, and review/selection, progress, errors, cancellation and destination choice are together. Large song lists show 80 at a time; selection applies to the whole list.
- Native library and preview revisions keep fast scans/checks and completed songs visible even if polling misses a job's running state. Interrupted jobs show a recovery message on restart.
- Downloads can go to a folder chosen with Android's read/write picker. A new file is created and SHA-256 verified before its private staging copy is discarded. Existing documents are never overwritten. Finished songs across overlapping playlists are deduplicated.
- A padded native parent keeps the WebView, including fixed controls and sheets, inside system-bar, display-cutout, mandatory-gesture and keyboard insets.
- Native playback continues independently of the screen, has trusted system-controller access and saved-queue resumption. Expanded media controls request volume-down and volume-up actions alongside standard transport. Actual layout depends on Android/Samsung. Physical volume keys target music.
- Screen-off listening help includes shortcuts to notification/app settings. On Samsung, Battery → Unrestricted and removing Resonance from Sleeping apps may be needed if the OS stops playback. No battery restrictions are changed automatically.

## Included in this preview

- Native Media3 local playback, an ongoing queue, repeat/shuffle, favorites, saved session, listening history, long-mix position, Android notification/lock-screen media controls and audio focus handling.
- Local folder access through Android's scoped folder picker, manual playlists and basic M3U/M3U8 import. M3U entries must resolve to unique filenames inside that authorized folder. Remote entries are skipped.
- YouTube playlist checks, review and local audio downloads with an archive; public Spotify song lists with explicit selection of matching YouTube recordings. Spotify audio itself is not downloaded. Public embed listings may be incomplete for large Spotify playlists.
- Local SQLite metadata; embedded tags, MusicBrainz and Apple catalogue research, matched LRCLIB lyrics, manual recording/lyrics selection and manual edits. Uncertain genres remain unknown or are labelled as artist suggestions.
- The frozen desktop nebula, particles, track character, cover-derived interface colors, kaleidoscope patterns and Sona sprite animations in a phone layout. Music-only mode uses a static cover collage and stops visual rendering, Sona and spectrum analysis.
- Precise volume, native three-band EQ, Bluetooth visual delay in milliseconds, visual settings/reset controls, immersive view and two-finger background gestures.
- Consent-based visualization of other Android apps using AudioPlaybackCapture. Local music pauses. Only apps permitting capture can contribute audio; DRM/protected playback, calls and many streaming apps may be silent. No captured samples are saved or uploaded.

Track character is generated locally from the available title, artist, genre and lyrics using the checkpoint logic. It is a visual interpretation, not a verified instrument classifier or a researched BPM system. The reverted external-BPM approach stays reverted.

## Phone defaults and storage

Balanced detail, 60 FPS, HDR off and Sona off are the mobile defaults. 30 FPS, 120 FPS and match-display options are available, but the actual frame rate depends on Android/WebView, the device refresh setting, GPU load and temperature. HDR is a capability-dependent WebView request, not a guarantee of HDR output.

Downloads preserve compressed audio by default without deliberately converting it to MP3. Existing FLAC/WAV and other supported local formats stay untouched. Optional Opus 128 kb/s saves space for new downloads (roughly 1 MB/minute). Source quality cannot be improved by converting to lossless. Playback currently uses Media3's 16-bit PCM analysis path; this build does **not** claim bit-perfect high-resolution/USB-DAC output.

Wi-Fi/unmetered playlist checks and downloads are on by default. A 512 MB free-space reserve is checked before each download. Artwork is resized to at most 640 px and the cache defaults to 128 MB. Settings displays linked audio, downloaded audio, artwork, database, extracted tools, APK and free space. Cache clearing never removes songs. Android may also evict artwork itself; rescan/research can restore covers.

The downloader bundles Python/FFmpeg, so the APK is approximately 80 MB and uses additional space when its tools are first extracted. The much larger `.toolchain` folder is PC-only development tooling, never shipped inside the APK.

## Validation and remaining device work

Build and Android lint pass. Forty-nine local JVM tests cover audio-buffer lifecycle, path recovery, playback error reporting, spectrum/file-copy integrity, complete playlist retrieval, selection resolution, batch continuation after one or several failed songs, cancellation, fatal connection/storage failures, duplicate unavailable recordings, persistent skip annotations and playlist reordering. The updated UI was exercised in an isolated browser with simulated native operations, including a successful song after a failed middle song and retrying that skipped song. Screenshots in `verification/` are browser previews, not S22+ captures.

The old 2025.11.12 engine reproduced the reported 101-entry result against the user's actual public playlist, despite reporting a total of 2,532. Version 2026.08.19 read all 2,532 entries and all 164 entries in the mixes playlist. A 10 KiB audio test download of the exact reported failing video, “Sierra”, succeeded on this PC with the newer engine. These are real online extraction checks, not fixtures, but they do not establish Android/network-specific download success or download the whole collection.

An instrumented native playback/background/440 Hz analysis test is included. Its APK compiles, but it has **not run successfully**: this PC has no Android emulator hypervisor, and the software emulator remained offline. No hardware driver or Windows virtualization setting was changed. No phone was connected.

Please validate on the S22+:

1. Import a few AAC/MP3/Opus/FLAC files and a long mix. Play, pause, seek, change track, close/reopen panels and relaunch the app.
2. Lock the phone for several minutes. Check ongoing playback, headset controls, interruptions, headphone disconnect and queue advance.
3. Compare music-only and visualizer modes, then Sona/kaleidoscope. Watch sustained temperature, frame pacing and battery use; 120 FPS is optional.
4. Set a Bluetooth visual delay and verify synchronization by ear/eye. Automatic end-to-end Bluetooth measurement is not available here.
5. Add a small public YouTube playlist, review/download a track, cancel an update, then recheck for duplicates. Extractor compatibility changes over time; use Update playlist downloader if necessary. This Android download path has not yet been tested on a physical device.
6. Test a public Spotify playlist's matching flow and an app that permits audio capture. Review Android's consent screen each time.

The port has not yet demonstrated full desktop feature parity. In particular there is no PC-to-phone library/settings sync, no automatic migration of desktop cached research, no device-verified HDR path, and no bit-perfect high-resolution output. These limitations are explicit rather than silently represented as working.

## Build

The `shared/` directory is a private copy of the checkpoint's web assets. It does not reference the desktop runtime or depend on personal data. `web/` is the phone UI and bridge; native source is in `app/src/main/java/music/resonance/mobile`.

Use JDK 17 or 21 and Android SDK platform 36 / build-tools 35.0.0. Set `JAVA_HOME`, then run `tools/setup-sdk.ps1` and review the Android SDK license prompts. `-AcceptLicenses` is available only when you explicitly want to accept those terms. This user's initial SDK setup was explicitly authorized in the chat. The SDK and Gradle cache are kept under `.toolchain/`.

Run `tools/build.ps1` to build both ABI variants, compile the device test and run JVM tests/lint. Use `-DeviceTests` only with a disposable emulator/test installation: the instrumentation test adds a generated tone and changes test settings. Standard cross-platform Gradle commands are also available through `gradlew` / `gradlew.bat`.

The source archive excludes PC SDKs, Gradle caches, APKs, local paths, signing keys, private music and the browser fixture. It contains the frozen shared UI assets needed to build independently.

## Upstream software

See `web/credits.html` and `web/licenses/`. Download support uses [youtubedl-android](https://github.com/yausername/youtubedl-android) 0.18.1 (GPL-3.0), including its FFmpeg package; AndroidX Media3/WebKit/DocumentFile use Apache-2.0. Bundled downloader runtimes retain their upstream licenses. This local preview does not change the desktop project's licensing. Before publicly distributing a combined product, provide the required licenses and corresponding sources for the chosen dependency versions; the app-source zip alone is not a complete upstream source bundle.

Android references: [background playback](https://developer.android.com/media/media3/session/background-playback), [capture permissions and restrictions](https://developer.android.com/media/platform/av-capture), [local WebView assets](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content).
