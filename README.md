# Resonance

A local music library, audio-reactive universe and Sona companion for Windows and Android. This is the private development repository. Personal music, sources, listening history, artwork caches, signing keys and compiled releases are excluded from Git.

For development, install Node 24 and run `npm ci`, then `npm start` (desktop) or `npm run dev` (browser). A fresh checkout starts with an empty library; add music from the app. Optional local configuration belongs in the ignored `config.json`; `config.example.json` is a clean template. See [Sharing and releases](docs/SHARING.md) for version control, private access and publishing updates, and [Android setup](android/README.md) for APK builds.

Existing Windows workspace installations can still use **Launch Resonance.cmd**. Portable releases keep their `data` folder alongside the executable and support installing a newer ZIP from Settings → App updates.

**Approved major checkpoint · 15 October 2026.** The user-approved baseline is preserved in `checkpoints/2026-10-15-major-baseline/`, including a source snapshot, a clean portable build, checksums and restore notes. Use it as the reference for subsequent changes; keep this checkpoint intact. See `CHECKPOINT.json` and the checkpoint's `RESTORE.txt` for exact paths and scope.

## Android 0.1.11 · shuffle and listening queue

The phone update is `android/releases/Resonance-Android-0.1.11-preview.apk`. Shuffle now explicitly applies a randomized native playback order and displays it in the queue; selecting a queued song preserves that order. The active button is clearer, settings persist, and disabling shuffle resumes playlist order. Install over the current app to retain music and settings. Native unit and phone-layout checks pass; physical phone verification is still needed. See `android/README.md`.

## Android 0.1.10 · touch and settings polish

The phone update is `android/releases/Resonance-Android-0.1.10-preview.apk`. Reset controls retain their scroll position; settings sliders distinguish sideways adjustment from vertical scrolling. One-finger scene orbit works alongside the existing two-finger gestures, and phone bloom is slightly lower. Install over the existing app. Desktop behavior is unchanged; see `android/README.md`.

## Android 0.1.9 · current visual updates

The matching phone build is available as `android/releases/Resonance-Android-0.1.9-preview.apk`. It includes smooth kaleidoscope fades and optional Rollercoaster / audio-reactive zoom controls, keeping the phone graphics defaults and portrait rotation. The app ID and signing certificate are unchanged, with a higher version code for installing over 0.1.8. The build, lint and phone-layout preview pass; no physical device was connected. See `android/README.md` for details.

## Desktop 1.1.3 · calmer camera and kaleidoscope fades

- All twelve kaleidoscope variants and the on/off toggle dissolve over 0.9 seconds. A new selection blends from the current visible mixture, including mid-transition. Complete images blend without stretching their folds; the scene and particles render only once. Reduced motion uses a brief 0.2-second dissolve.
- Rollercoaster starts and resets at 2.22×, one third of the previous 6.67× default; the maximum remains 20×. Existing custom speeds stay intact. The previous default migrates once.
- Camera zoom is now a single audio-reactive toggle. Bass and loudness control depth with a hard strength cap of 3; silence eases back to the wide view. A widening field of view softens the magnification as the camera moves inward. The obsolete intensity slider and saved intensity are removed.

Validation: 167 automated tests pass. GPU checks cover every directed kaleidoscope transition (156 combinations), midpoint pixel accuracy, rapid retargeting and the HDR shader path. Isolated Electron checks cover the actual settings controls and six camera views. Shared Android visual sources are synchronized; no new APK is included in this PC release.

## Desktop 1.1.2 · immersive camera zoom and Sona refinements

- Vertical and horizontal dragging both work while Rollercoaster is running. Vertical orbit has no pole limit; continuous angles prevent turn-boundary jumps. Rail speed now reaches 20× (ten times the previous maximum), with 6.67× as the new/reset default. Existing saved speeds are retained.
- Optional Camera zoom travels through the particle field, with bass and loudness shaping its depth. Zoom intensity ranges from 0 to 12, defaulting to 4; it works alongside manual orbit and Rollercoaster. Movement eases in and out, and nearby particles fade before crossing the camera. Reduced motion keeps zoom static; Reset view returns to the wide view and disables both camera effects. Wrapped GPU inputs preserve fine angular precision during long sessions, while camera interpolation remains continuous.
- Floating Sona has a fixed compact footprint and a centered translucent transport bar. Her controls remain visible even when the main app is zoomed. Her headset wears the exact Resonance clef across all visible poses, recolored with her theme; existing sprite artwork and animation timing are preserved.
- Behind the sound keeps its footer visible with one scrolling body. Artist details now have an “Every artist” back arrow.

Validation: all 162 automated tests pass, alongside isolated Electron checks for real mouse dragging with the rail active, zoom controls and six rendered zoom views, footer layout at four window/zoom sizes, native floating-window resize recovery, and all 104 Sona poses. Full-turn camera and speed checks cover continuous angle interpolation, 48-hour GPU precision and frame-rate independence. The original sprite silhouette is unchanged and decal rendering remains cached. Android shared visual sources are synchronized; its released APK remains 0.1.8-preview. This is a PC release.

## Desktop 1.1.0 · camera, output profiles, floating Sona and portable updates

- Hold the left mouse button on the scene to orbit the sculpture. Visual settings includes an optional musical Rollercoaster rail, rail speed and Reset view. Camera motion is damped; reduced motion disables the automatic rail.
- Bluetooth & visual sync detects the current Windows output. Bluetooth keeps the device estimate; direct wired/USB outputs use zero automatic compensation. Fine offsets and a connection override are stored per output. Windows per-app routing or unusual drivers may require the override.
- Lyrics scroll with the full Behind the sound window. Collapse Lyrics to reach later details quickly.
- Real artist credits and the upload channel are separate. Recording metadata and recognizable upload titles repair channel-only credits; featured performers share the track in Artists. Manual edits are preserved. Ambiguous credits still benefit from reviewing metadata.
- Enable Sona, then Keep Sona above other windows. She appears when Resonance loses focus, with play/pause, previous/next, return-to-app and hide controls. Drag to move her; position is remembered. Resonance must remain running. Desktop-capture mode leaves transport controls to the source app.
- Clean portable releases include Settings & library → App updates. Select a future portable ZIP and confirm Restart & update. Files are validated before installation; replaced app files are backed up and restored if a replacement fails. The personal data folder and existing config are retained. Updates are selected locally; there is no hosted automatic update service. Friends install this version once to get the updater; later ZIPs can be applied from inside it.
- Android 0.1.8 rotates the complete landscape scene 90° in portrait, preserving particle proportions and kaleidoscope symmetry. Mobile controls remain upright.

Validation: 158 automated desktop tests and 49 Android unit tests pass; Android lint reports no errors (15 existing warnings). Isolated Electron checks exercised camera dragging, device profiles, lyrics scrolling, floating Sona and portrait/kaleidoscope rendering. The actual portable ZIP was staged, installed with a personal-data sentinel preserved, and launched without renderer errors; corrupt-update rollback was also checked. The APK keeps the previous signing certificate. No connected S22+ was available for on-device testing.

The approved checkpoint remains untouched. Restart the PC app to load this release. Share the clean ZIP linked in releases/latest.json, never your used data folder.

## Long-session visual fix · 15 October 2026

The background current now integrates speed changes from its current position. Previously, changing a track’s fluid recipe rescaled the entire elapsed animation clock, making transitions increasingly large after hours of listening. Short fluid travel and the existing color transitions are preserved. The same fix is included in Android 0.1.7; the approved checkpoint remains intact. Restart the desktop app to load the updated graphics code.

Validation: 151 Node tests pass, including accelerated 48-hour sessions and 800 track changes. An isolated Electron render compared the old and fixed drift at 1 minute, 6 hours and 24 hours and checked the full scene’s shader wiring. Run `node_modules/electron/dist/electron.exe tests/background-drift-check.cjs` for the graphics check; its report and comparison image are saved under `test-output/`. No actual multi-hour phone soak test has been run.

## Listen

- Browse tracks, long mixes, artists, favorites, recent listening, and your own playlists.
- Search for any combination of title, artist, album, genre, source channel, or original filename.
- Open a track’s **…** menu to edit details, search for an exact recording, add to a playlist, or add to the queue.
- Mixes remember their position. The last queue, track, position and volume are restored without autoplay.
- Clicking a track builds a queue in the current browse order, starting with that track and wrapping to the beginning of the selection. The queue refills before it runs out, favoring the same library type and shared genres. A single-result search also continues into your local collection. Recent repeats are avoided when there are enough tracks. Back history, queue position, and the original selection are saved locally. Unreadable files are skipped; repeated file failures pause playback with an explanation.
- **YouTube playlist order** is the default sort for tracks and mixes. It uses the last saved playlist check, shows original YouTube positions, and works offline. Gaps represent entries without a matching downloaded file; unmatched local files follow at the end of their source. **Update playlists → Check for new music** also refreshes this order without requiring a download. Sort selection is remembered. The order is the playlist's saved sequence, not a temporary sort selected in the YouTube website.
- **Genres** opens a visual atlas with track counts, exact genre filtering, a discovery progress indicator, and an option to include artist-based suggestions.
- The visualizer combines an oil-like nebula, flowing particles and a living folded sculpture. Your approved preset is the default: High detail, Auto frame rate matching the current screen and 2.55× Response. Retired galaxy, comet, gravitational-core and mouse-attraction layers are no longer rendered.
- Cover harmony shares six locally sampled colors between particles and background. Buttons and the new vector wordmark use a readable gradient drawn from the same cover.
- Play/pause from the dock or with Space. The center stays clear for scrolling and right-drag gestures. The dock cover opens **Behind the sound**, with metadata, artist, local listening statistics, lyrics and available same-artist/shared-genre suggestions from your library. **Library** remains a separate top-bar button.
- Motion uses damped springs with continuous velocity, so bass and drum hits push the forms smoothly. The background responds more slowly, with layered parallax, dust lanes, folded wisps and luminous ridges. Stable coordinates avoid particles jumping between forms; persistent particles fade before respawning. Long frame stalls are discarded rather than fast-forwarded.
- The visual engine measures eight ranges: 20–60, 60–150, 150–400, 400–1,000, 1,000–2,500, 2,500–6,000, 6,000–12,000, and 12,000–20,000 Hz, using an 8,192-sample FFT for bass definition, a 2,048-sample FFT for midrange and kick attacks, and a 1,024-sample FFT for treble attacks and short-window loudness. Fast light envelopes are separated from the slower geometric springs. Different ranges drive different scene properties. RMS, sample peak, and spectral-flux transients drive energy and accents. Band meters are relative visual levels; RMS/peak are dBFS, not LUFS or a measurement of speaker loudness. Analysis follows the playback/EQ signal and excludes interface sounds.
- Choose Adaptive, High or Low power detail. WebGL 2 renders additive particles into floating-point light buffers where supported, followed by bloom and tone mapping. A persistent GPU flow uses bounded timesteps and staggered lifetimes. A 2D fallback is used when WebGL 2 is unavailable.
- **Immerse · H** hides the headings and visual settings, and dims the floating player. Hover or focus the player to reveal it; Queue remains available. Press **H** again or **Escape** to reveal the headings. Fullscreen is available separately and keeps both Queue and Library accessible.
- Bass (45–140 Hz), attacks (1.4–5.2 kHz), and air (6.5–15 kHz) have independent transient envelopes. A sustained note decays instead of repeatedly triggering a beat. Bass expands the forms and clouds, mids bend the filaments, and high accents illuminate fine detail. Silence and paused playback keep a slower ambient drift. Reduced motion keeps geometry still.
- **Sound settings** and **Settings & library** include musical interface sounds: soft hover notes, navigation dyads, clicks, and favorite chords. They duck during music playback, respect the player's mute/zero volume, and have their own level, off switch, and preview. Hover sounds begin only after a user gesture. Visual hover halos and click ripples respect the motion preference.
- The sound controls include a three-band EQ. Zero gain bypasses the EQ. Windows/browser audio output can resample to the device’s configured sample rate; this is not an exclusive-mode bit-perfect player.
- **Sound settings → Bluetooth & visual sync** delays the visualizer and Sona to match delayed headphones or speakers. **Use device estimate** is on by default and uses reported Web Audio output plus processing latency when available. Device reports may omit some Bluetooth delay; the offset adds a precise 1 ms trim, with ±10 ms buttons and a reset. Positive values make visuals later; negative values reduce the automatic estimate. Turn the estimate off to choose the entire delay manually. Desktop audio has its own saved manual offset because capture timing cannot be inferred from the local playback device. Playback and audio quality are unchanged; Music only stops this work too.
- Scroll an empty area of the visualizer to adjust volume gently; **Shift + scroll** gives finer adjustment. Hold the **right mouse button** and drag horizontally, then release: right skips forward, left skips back without restarting the current track. Drag upward to seek forward or downward to seek back; hold Shift for fine seeking. The destination is previewed, then applied on release. Small and ambiguous diagonal drags do nothing; Escape cancels. Gestures exclude controls, library and open settings. They are listed in Settings & library → Good to know.
- The volume dock has a larger slider, percentage and mute with level restoration. Click the percentage for a wide slider, one-percent buttons and a numeric field precise to **0.1%**. Clicking outside Library or visual settings closes that overlay without activating controls underneath.
- The desktop title bar is translucent over the moving scene, with a native drag region and Windows minimize, maximize/restore, snap and close controls. Double-click the title bar to maximize/restore. **F11** toggles native fullscreen; **Escape** exits. The browser version uses the browser fullscreen API.
- Keyboard: **Space** play/pause, **Q** queue, **L** library, **H** immersion, **Ctrl K** library search, **Alt + left/right** previous/next, **Escape** close an overlay or leave immersion. Hardware media keys are supported through Media Session.

**Queue → Played before** shows actual playback starts, newest first, with replay that preserves upcoming songs. Skips and pause/resume do not create false entries. Up to 200 starts persist locally. When upgrading an older library, its last-known listening timestamps seed the history (one entry per previously heard song), explicitly marked as recovered listening. Library refreshes and queue edits preserve scroll position; settings, the queue and the library each have a bounded vertical scroll area.

## Music only and visual controls

**Music only** stops animation scheduling, releases the WebGL context, bypasses audio analysis and disables interface effects. A static cover collage and music controls remain. Images keep their original proportions and are capped near their native size. The background lookup caches larger cover art and verified artist photos when available; source and photo-credit links appear under the cover. Small or missing images fall back to a restrained local-cover arrangement and a cover-colored wash. Music playback and EQ continue unchanged.

Visual settings expose **Track character, Musical flashes, Contrast, Movement, Beat motion, Response, Detail, Frame rate and HDR**, plus optional bonus effects. Your other approved values are built into the preset. **Auto** frame rate follows the current screen and updates when the window moves between displays; manual limits from 30 to 360 FPS are available. Existing manual choices are preserved. Actual FPS depends on the display and GPU. **HDR → Auto / On / Off** controls extended-range output: Auto follows display capability, On requests it even when automatic detection misses, and Off uses standard output. A status line reports the active path. Windows HDR must also be enabled on a compatible display. HDR uses a floating-point WebGPU presentation canvas; unsupported hardware falls back to standard output. Music only releases both graphics paths. Reduced motion keeps geometry still and disables musical flashes.

Every track receives a locally saved procedural character. A paced background worker prioritizes the current track, searches MusicBrainz genre/recording evidence and exact LRCLIB lyric matches, then saves its sources, lyric cues and result locally. Titles, artist, album and duration are sent to the relevant public metadata provider; audio is never uploaded. Failed lookups retain matching cached evidence and retry on a later app run. Ambiguous versions are not treated as exact matches. A complete first library pass can take hours and provider coverage varies.

Title, genre, source tags and lyric cues guide the central sculpture family and its proportions. Background currents share that identity. Existing cached profiles benefit immediately. With no distinguishing cues, a stable seeded pair supplies a procedural character. Turning Track character off smoothly restores the original membrane. Each song has a stable seed, with restrained variation for each new listen and smooth transitions between identities. These are procedural stylistic interpretations, not verified understanding of lyrics or instrument separation. Live spectral lanes, transient envelopes and estimated bass/attack/lead/texture roles continue to drive the movement. Beat interval voting supplies rhythmic breathing and can settle at half or double time in ambiguous music.



Fluid backgrounds use eight independent continuous parameters derived from each saved track seed: current orientation, eddies, depth, cloud density, filament scale and thin-film material blends. A new listen gently varies that recipe within the same character. When a track changes, the fluid travels a short, bounded distance and settles in about two seconds. Rapid skips keep its current position and velocity. Cover colors retain their original palette smoothing, with no additional delay. Normal audio response and ambient drift continue.

Track character chooses from 24 sculpture families, retaining the original six and adding manta veils, nautilus sails, Möbius currents, double helices, armillary spheres, gravity lanterns, phoenix wings, magnetic crowns, solar helices, seedpods, orchid spirals, coral chalices, chrysalises, whisper canopies, infinity veils, trefoils, gyroid lanterns and diamond braids. Track-specific proportions and detail distinguish songs within a family. Persistent particle coordinates blend between forms over six seconds; rapid skips queue the next morph instead of snapping midway.

Each exposed visual and sound preference has a **↺** button to restore its approved default independently; EQ bands reset to 0 dB and download format to Original quality. Interface sounds now use layered glass tones, textured plucks, rising/falling navigation gestures, a blooming favorite chord and restrained adjustment ticks. They retain the existing volume, ducking, mute and Music only behavior.

Immerse is beside Library in the top-right controls; its exit remains reachable while the other controls fade. Favorite hearts are solid accent color when selected. Buttons have no hover descriptions but retain accessible names. Interface sounds have four times the previous synthesis gain and start at 50%; this update resets their level to 50% once, then remembers subsequent changes. A compressor on the interface sound bus controls overlapping peaks without processing the music.

Lyrics prefer same-name local .lrc files and embedded tags, then exactly matched LRCLIB results. They are cached for offline reading and shown in a bounded, scrollable panel. Suggestions use available local tracks from the same artist or sharing genre tags; nothing downloads or interrupts playback until you choose a song. All editing and source details remain under **Metadata, files & editing**.

Remote artwork uses [Cover Art Archive](https://musicbrainz.org/doc/Cover_Art_Archive/API), original YouTube thumbnails, and free Wikimedia images linked to a verified MusicBrainz artist. Unknown, low-resolution and ambiguous results fall back to your existing cover. Photo credits are retained with the image. Lyrics use [LRCLIB](https://lrclib.net/docs).

## Update playlists

Choose **Music sources → Add music source** to connect a YouTube playlist with a local download folder, a local folder without a link, or an M3U/M3U8 playlist. Browse opens the native Windows chooser in the desktop app; the browser version accepts a full local path. Local playlist order is preserved; streams are skipped. Edit and disconnect sources in **Manage sources** or **Settings & library**. Disconnecting preserves files, artwork, edits and listening history for reconnection. Fresh copies start with no sources.

Click **Update playlists**, then **Check for new music** to check all connected YouTube sources. Playlist links and destination folders are saved only in your local configuration and library database; existing connections are preserved when updating.

The check compares saved YouTube IDs, the download archive, and exact normalized filenames with compatible durations. Possible duplicates are not selected by default. **Review** opens a side-by-side comparison of the local file and proposed recording, including artist and duration differences, with local playback and a YouTube listening link. Choose **Leave unchecked** or **Select for download**; nothing downloads until **Download selected**. Spotify review compares its catalogue entry with the chosen YouTube candidate. Title changes can still need human review. Cancel keeps completed downloads and the archive; another check resumes cleanly. Updates never remove local music.

The official yt-dlp executable, a Node JavaScript runtime, and FFmpeg tools are bundled. The app ignores unrelated global yt-dlp configurations, uses argument arrays rather than a shell, and does not read browser cookies. Publicly accessible playlist entries work without signing in; unavailable, private, or restricted items can fail and are reported in the update panel.

**Original quality** selects the best available source audio and avoids an additional lossy encode. A FLAC option is available, but it cannot restore detail missing from a YouTube source. Downloads keep a video ID in the filename, original metadata in `.info.json`, and a thumbnail beside the audio. Existing audio is not retagged or converted.

## Share a clean copy

Run `npm run share` to create a portable Windows folder and ZIP in `releases`. It uses an explicit allowlist and includes the app and download tools, with empty source configuration. Music, databases, cached covers, listening history, download archives, private playlist snapshots and browser profiles are excluded. The portable app writes its own `data` folder beside the executable. Share the original clean ZIP, rather than a portable folder after it has been used.

## Metadata and offline use

1. Embedded tags and neighboring artwork/yt-dlp metadata are read during import.
2. Checking the YouTube playlists identifies existing files and caches their original thumbnails and source links.
3. **Settings & library → Find metadata** looks up recording matches through MusicBrainz. Only high-confidence title, artist, version and duration matches are applied automatically. Pause this job from the same screen; the setting persists across restarts.
4. In track details, **Refresh upload date & YouTube details** caches the source’s available artist/track information, upload date and view-count snapshot. Upload date, release date, source channel, recording artist, global views and your local plays remain distinct.
5. Correct uncertain details yourself or select an exact MusicBrainz recording. Your manual edits are protected from automatic matching.
6. **Genres → Discover genres** reads explicit local source labels and cached YouTube tags, looks up artist genres, then searches each recording more deeply, including recording, release, and release-group genre data. Shared artists are processed first to improve coverage quickly. Provider requests are rate-limited and retried; successful and empty responses are cached locally. Discovery is resumable, and pauses after repeated provider failures. Starting genre discovery pauses the older title/album matching job to give genre requests priority.
7. **Track details → Search genres for this track** performs a focused lookup. Genre evidence includes its scope and provider link when available. **≈** labels are artist-based suggestions, not confirmation that every song by that artist has that genre. Recording/source evidence takes priority over these suggestions. Ambiguous artist names are left unresolved. Genres cannot be established reliably for every upload.
8. Editing a genre locks that field against automatic discovery, including a deliberately empty genre. **Use discovered genres instead** releases that lock. Titles, filenames, original audio tags, playlists, and listening history are not rewritten by genre discovery. Generic categories such as “Music” and “Entertainment” are discarded.

Metadata providers do not cover every upload. Missing fields are left blank. Matching is deliberately conservative. Playback, cached artwork, edits, playlists and local listening history work offline. Downloads, uncached artwork and external metadata searches need the internet.

Your local play count increments once per playback session after 30 seconds of actual playback, or half the duration of a shorter track. Seeking does not count as listening. Listening time and mix positions are periodically persisted while playing and when pausing/changing tracks. Abrupt process termination may lose the most recent few seconds.

## Storage

- `data/library.sqlite`: library, metadata, genre evidence and provider cache, playlists, favorites, listening statistics, player state, source configuration, interface/visual preferences, cached matches, and playlist-check results. Preferences persist even when the desktop app changes its loopback port.
- `data/artwork/`: local artwork files.
- `data/downloads.txt`: yt-dlp’s persistent download archive.
- Your selected music folders: original and newly downloaded music.

Back up the entire `data` folder with the app closed. Losing this folder loses the local metadata/playlist/history cache, but never the source music. A missing drive is reported without removing its records. Files removed from a successfully scanned source are marked unavailable.

## Development and checks

Requires Node 24 for development. `npm install`, `npm run dev` for the local browser version, `npm start` for the desktop shell, `npm test` for importer/API/range/matching/genre-cache/audio-analysis regression tests, and `npm run package` for the Windows build. Runtime data, test data and downloaded tools are excluded from source control.

The server binds to loopback only. Writes require a per-process token and same-origin checks. Audio is exposed only through indexed track IDs. The desktop renderer has Node access disabled, context isolation and sandboxing enabled, restricted navigation, and no camera/microphone permissions.

Data sources and implementation references: [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API), [Cover Art Archive](https://musicbrainz.org/doc/Cover_Art_Archive/API), [yt-dlp](https://github.com/yt-dlp/yt-dlp), [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/MediaElementAudioSourceNode).

This version does not include gapless/crossfade playback, exclusive WASAPI output, audio fingerprinting, lyrics synchronization, or a TouchDesigner project.

## Visual inspiration

The particle studies are original implementations inspired by the supplied references: [nicholaspjm — Audio Reactive Particles using Pops](https://www.youtube.com/watch?v=SlVoPnsQlbU), [eclipsys — particlewave](https://www.youtube.com/watch?v=ATLhkFcQZN0), [Axi0m — Math Based Audio-Reactive Particles](https://www.youtube.com/watch?v=m-IGHr4SV0o), and [supermarket sallad — Collapsing Noise](https://www.youtube.com/watch?v=qLebV9rjqb4). No tutorial project files or video assets are bundled.

The Breach study draws inspiration from the fine filaments and dark opening in [sarv.live7 — La brèche - Rework](https://www.youtube.com/shorts/bdgM6KHiu-8).

The interface follows a readable accent sampled from the playing cover: transport, sliders, navigation, focus rings and glass borders share that color. Changes blend between songs; Music only applies a static accent without an animation loop. A new cover may be sampled once at 96 × 96 pixels and cached locally. The cover accent is the default throughout the interface.


## Refinement pass

The fluid travels through a much smaller coordinate range between songs, settling in about two seconds. Colors retain their own cover-palette transition. The sculpture rotates at a constant 0.024 radians per second; track changes do not restart its orientation. Incompatible surfaces reweave their strands while each strand is dark, avoiding stretched ribbons. Freeze and reduced-motion controls still apply.

**Visual settings → Bonus effects** contains twelve Kaleidoscope patterns and Sona, a small chibi dance companion, both off by default. Sona keeps her illustrated character design with 104 poses across thirteen focused sequences: two-step, hip sway, head bob, one-handed wave, shoulder groove, alternating cheer bounce, small hop, full turn, idle/blink, sleep, greeting, pickup/held and landing. Dance and listening routines use fixed authored timing, independent of BPM and loudness. Music only disables the scene, analysis and companion updates. The active artwork is the shared lossless texture `public/sona-motions.webp`; the current headset corrections and replacement D6 prompts are in `public/sona-headset-artwork.json`, with the earlier artwork history in `public/sona-motion-artwork.json`. Source sheets and registration measurements are archived in `test-output/sona-headset-sync/`; `scripts/pack-sona-motions.mjs` registers whole figures without painting or warping their anatomy. Eight-pose loops use fixed foot anchors and deliberate timing. Sways and hand waves take four beats; the other dances take two for clearer motion. Right-drag gestures remain available on the scene while Visual character is open; controls inside the panel are protected. The original membrane keeps its winding stable, preserves its shape through gaps between songs, and eases timbre changes independently of the light response.

Beat Motion now requires coherent timing evidence, limits tempo changes to three BPM per second, ignores off-grid phase corrections, and fades out when confidence falls. Spectrum envelopes smooth linear amplitudes with fast attacks and quieter steady-state movement before display compression. The analysis refinement draws on [Graeme Phi’s audio-visualizer article](https://graemephi.github.io/posts/audio-visualizers/). The user also supplied [pbltrr](https://www.youtube.com/@pbltrr/videos) as a future visual reference; no video assets are bundled.

Click the dock cover and use **Find missing details → Search online again**. Recording and lyric matches show artist, version, duration, provider and similarity. Preview lyrics before selecting; explicit choices remain available offline and take priority over automatic matching. Automatic research fills missing recording fields only for confident matches and now tries a lyric catalogue search after an exact lookup misses. Known upload decorations are removed for searching while remix/live/cover identity remains protected. Catalogue coverage is not guaranteed.

**Discover genres** looks up labels for already-indexed music; it does not download audio. Progress and completion messages appear inside the settings panel. When recent cached checks are exhausted, **Retry missing genres** refreshes unresolved tracks and provider evidence. Personal genre edits stay protected.


Sona’s hair follows the live background pigments with a stronger, shaded color gradient; her outfit keeps the softer interface accents. Warm skin, strand shading and transparency stay intact, and palette changes fade smoothly. The illustrated poses remain intact, with no skeletal deformation or frame crossfades. Routine changes switch directly without an extra transition effect. Idle has an occasional synchronized blink; eye-closes in the greeting, hop and landing are brief and tied to the gesture. Click for a greeting; hold or drag to lift, carry and gently land. Carrying leans gradually around her headphone band, and the drawn knees absorb the landing before she resumes a neutral dance phase. Idle gradually becomes sleep when music stops. Her relative position saves locally and stays inside the scene on resize. Space / Enter picks up and drops, arrows move (Shift for fine movement), and Escape cancels. Bonus effects has a reset-position button. Sprite loops use fixed timing up to 12 illustrated frames per second; a separate 24 Hz redraw cap keeps carrying and breathing light. Actual animation speed remains independent of display refresh. Hidden windows, disabled Sona and Music only stop all companion drawing; reduced motion settles her pose. Wheel and right-drag music gestures pass through her.

### Desktop audio

The Windows app’s Desktop audio button pauses local playback and listens to the system output for live visuals and Sona’s dancing. Stop listening or select a local song to leave capture. Nothing is recorded or uploaded. Playback and volume remain controlled in the source app or Windows. Interface sounds are quiet while listening. Capture is session-only and stops on exit or Music only. A temporary app-video track required by Chromium is immediately stopped; the audio analyser has a zero-gain output to avoid replay or feedback. Microphone and camera requests stay denied.

Kaleidoscope’s dropdown offers Crystal, Petals, Mandala, Spiral bloom, Prism tunnel and Liquid mirrors. The selected pattern saves locally; each effect still defaults off. Animated pattern drift respects reduced motion.

### Public Spotify playlists

Add music source → Spotify public playlist. Connect a public playlist link and an empty writable music folder. Update playlists reads the public track list, caches YouTube recording matches, and presents up to three candidates per song with duration and artist evidence. Matches stay unchecked until reviewed. Downloads use the selected YouTube recording; Spotify protected audio and preview clips are never downloaded. Spotify track links and original playlist positions are stored locally.

No Spotify account is needed. Private playlists and podcasts are unsupported. Spotify’s embed can expose only the first 100 entries; the app reports this limit explicitly and never removes local files when a remote list is partial. A provider change can temporarily break public import; existing local music keeps working.

## Listening experience

Startup begins with a still clef while the interface and HDR adapter initialize, then starts the loading animation. Interface preparation, shader submissions, particle generation and small graphics uploads are spread across presentation frames. Each visual layer warms separately on a small surface, followed by one complete full-resolution frame, before the room fades in. HDR presentation warms separately from the WebGL scene. GPU completion is checked without blocking the animation; slow or hidden windows can continue preparing. Parallel shader compilation is used where supported. A quiet musical signature respects interface-sound preferences, mute and Music only. A slow start offers Retry or Music only.

Music only uses a static record-sleeve composition: crisp cover fragments, record grooves, paper grain, artist lettering and edition details. It has no animation loop or ongoing blur. Live analysis stops in this mode; metadata lookups can continue. Returning to the visualizer keeps the static artwork in place until the full scene has drawn its first frame, then gently reveals it.

Sona holds each dance for at least three full loops and changes on a loop boundary. Her animation speed and sprite proportions remain constant regardless of music tempo or loudness. Extra beat-driven bobbing is removed; the illustrated jump still follows its authored arc. Clicking, carrying, dropping and pausing remain responsive.

Deeper genre discovery refreshes missing source labels, matches MusicBrainz recordings/releases, checks exact Apple Music catalogue results, follows linked Wikidata artist genres, then considers consistent evidence from other local tracks by that artist. Artist suggestions are marked ≈. Manual genres are preserved; uncertain matches remain unknown. Existing libraries are eligible for the new pass.

Beat motion uses the original live rhythm estimator. The saved-BPM experiment and background tempo decoding have been removed; old cache entries are ignored.

Catalogue requests share track/artist names with MusicBrainz, Apple and linked Wikidata records; source refreshes use YouTube/yt-dlp. Audio is never uploaded. Large libraries take time, and cached genre/character research survives restarts.

Provider references: [Apple catalogue search](https://performance-partners.apple.com/search-api), [Wikidata data access](https://www.wikidata.org/wiki/Wikidata:Data_access), [parallel shader compilation](https://registry.khronos.org/webgl/extensions/KHR_parallel_shader_compile/).

Settings & library now shows a total storage estimate with music, cached artwork, library data, browser data and the application itself. Music sizes use the existing index; other sizes are measured from file metadata only. Measurements are cached for a minute and can be refreshed. Native builds include their own browser profile and runtime; portable nested folders are counted once.

Visual delay retains its history when device latency changes, interpolates continuous measurements, and delivers each attack once. Small offset adjustments ease into place without resetting the live beat tracker. Sona follows actual playback with delayed start/stop edges, independently of analysis interruptions. Her sprite clock never catches up by skipping poses after a slow render; colour updates reuse bounded paint surfaces.
