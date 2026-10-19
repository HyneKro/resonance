# Resonance Android 0.21.0-preview — A living listening path

Constellation now shows the playing song and the next four songs in native playback order, including shuffle. A light travels along the connection to the next star with playback progress; pausing, seeking and silent-edge edits are reflected. Repeat-one shows progress around the current star.

- **Follow queue** frames the path. Swiping, panning or pinching returns camera control to you. Open the path status to inspect upcoming music or skip ahead while preserving the queue.
- **Song & discoveries** expands the song panel. Find nearby music, less-played tracks and a different genre direction, with explanations and **Play next** actions. Recommendations use local metadata and sound profiles.
- Journey previews use a separate dashed path and can be framed before playback. Starting a journey returns to the live queue.
- **Visuals → Motion → Frequency lights** includes spectrum intensity and contrast, with stronger defaults: **1.50** intensity and **2.60** contrast. Intensity 0 hides this layer. Settings persist and their reset controls restore these defaults.
- The map reads only a small queue horizon per frame. A previous song's listening edit is cleared while loading the new song's analysis.

ARM64, package `music.resonance.mobile`, versionCode **47**, existing signing identity retained. Install over the existing app; uninstalling is unnecessary and would remove private app data.

Shared tests, native unit tests, build/lint checks and isolated phone-layout/bridge checks cover this release. No physical S22+ or Android installer test was performed; sustained performance and battery use remain device-test items. Dense views can omit some floating labels to prevent overlaps; the upcoming list remains accessible.

Release checks: **393 shared tests**, **124 Android unit tests**, both ABI builds and instrumentation-test compilation passed. Android lint: **0 errors**, 9 existing warnings. Both extracted distributables passed the full nested startup-module check. A clean, empty-library Windows extraction reached the welcome screen with no renderer errors. The isolated desktop/phone UI checks passed, including saved spectrum controls and native queue order. Repository audit: 672 files, no reported issues.
