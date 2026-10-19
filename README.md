# Resonance

A local music library with three ways to listen: an audio-reactive Visualizer, a 3D Constellation of your collection, and a quiet Music only view.

**[Download for Windows or Android](https://hynekro.github.io/resonance/)** — the page always offers the latest published builds. No account is needed.

## Start listening

1. Open **Library** and add a folder containing music, or connect a supported online playlist through **Library & downloads**.
2. Online playlists show a review screen before downloading. Choosing an empty folder sets a download destination; it does not add songs until files are downloaded.
3. Tap a song's cover or title in Library to play it. The player at the bottom handles pause, skip, seeking, volume and Queue.
4. Choose **Visualizer**, **Constellation** or **Music only** along the top. Library and Settings stay in the same place.

Click the playing song's cover or title to open **Behind the sound**: overview, lyrics, listening edits and editable metadata. Back returns to the previous panel and keeps your place.

## Make it yours

- **Visualizer:** audio-reactive particles and nebulae, smooth track-character changes, kaleidoscope patterns, manual orbit and optional camera motion. Visuals contains Style, Motion, Display and Extras; these controls belong to this mode.
- **Reactivity:** Steadier note detail and subtle phrase movement are always enabled. Saved analysis supports anticipation; live audio reacts as it arrives. A mirrored spectrum of emissive particles follows the ribbon, lights up only where sound is present, and uses the background palette. See [Musical response](docs/MUSICAL-RESPONSE.md).
- **Constellation:** explore the collection through genre and artist groups, click a star to play, and build a journey through related songs. Drag to orbit, right-drag to pan and scroll to zoom on PC. Background stars are decoration; labelled song stars belong to your library.
- **Music only:** a static composition built from the cover. The visualizer and mascot stop rendering to reduce work.
- **Mascots:** Sona is the default, with optional guest appearances. Authored motion uses fixed timing; music does not stretch the sprites or speed up the animation. Windows can keep the companion above other windows with compact playback controls.
- **Playback & sound:** optional per-song loudness leveling, silent-edge skipping, EQ, visual delay and interface sounds. Leveling targets a shared overall song loudness while retaining each song's internal dynamics. Peak protection can limit how much a recording is raised.
- **Listening edit:** see measured energy and skipped edges, or set start/end points for a video intro/outro. Original audio files remain unchanged. Automatic speech removal is not provided.
- **Library & downloads:** refresh sources, review uncertain metadata, research genres and manage playlists. Manual metadata edits take priority over automatic suggestions. Missing or ambiguous information can still require review.

Windows desktop-audio mode can react to other applications, with an optional microphone input. Capture is for live visuals; it is not recorded or uploaded. Android capture requires the system consent screen and only receives audio from applications that permit capture.

## Updates and your data

Download the Windows ZIP, extract the complete folder, then open `Resonance.exe`. Keep its `data` folder with the app. The tray icon indicates that Resonance is running; click it to reopen the window, or use its menu to quit.

Install the Android ARM64 APK over the previous version. **Do not uninstall to update:** uninstalling removes private app storage. Android requires confirmation through its system installer.

Both apps check for updates and show an update-ready indicator. Windows applies an update when you choose **Restart & update**; Android uses **Install update**. Music, playlists and preferences are retained. See the [update guide](docs/SHARING.md).

Storage shows music and cache estimates. Cache cleanup does not delete songs. Metadata searches send track and artist names to catalogue services; local analysis does not upload audio. Spotify imports use public track listings and reviewed YouTube matches, not Spotify audio. Availability and catalogue accuracy depend on the providers.

## Development and verification

Use Node 24: `npm ci`, then `npm start` for the desktop app or `npm run dev` for a browser. A fresh checkout starts with an empty library. Optional local configuration belongs in ignored `config.json`; `config.example.json` is the clean template.

- `npm test` runs the automated regression suite.
- [Android setup](android/README.md) covers native builds, unit tests, lint and device checks.
- [Sharing and releases](docs/SHARING.md) covers clean packaging, two-platform publication, updater verification and retention.
- [Polish review](docs/POLISH-REVIEW.md) records the current assessment, evidence and remaining gaps.
- [Release notes](docs/release-notes/) retain version-specific changes and validation limits.

The approved 15 October 2026 checkpoint remains separate in `CHECKPOINT.json` and the local `checkpoints/2026-10-15-major-baseline/` folder. Do not prune it. Personal music, library databases, caches, keys, local tools and used portable folders must never be committed or distributed.

Artwork and dependency notices are available in the app's Credits. Original particle studies took inspiration from the visual references supplied during development; tutorial projects and videos are not bundled. The licensed skybox is embedded only in authorized app builds, with a procedural fallback for public source builds.
