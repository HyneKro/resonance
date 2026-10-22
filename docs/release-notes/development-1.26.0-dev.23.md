# Contour paper pond, moving pigment and leaf shadows · development test build

Windows **1.26.0-dev.23** · Android **0.26.0-dev.23** (versionCode **89**).

Contour replaces the external branching channels and blooms with a quieter treatment of the brush, rain and paper. Music moves pigment inside the existing stroke, droplets create fine water-like ripples, and soft leaf shadows drift around the paper's edges.

- The complete main gesture remains visible. Bristle texture, marbling, suspended pigment and wet highlights now travel within it, with faster internal motion as bass and energy rise. The companion line retains its live frequency displacement and selective glow.
- Rain begins fully above the visible frame. All drop families share one constant vertical speed; their different landing heights determine flight duration. Drops keep varied sizes, music-driven emission, deposited colours, pools, small splashes and faint dry memories. Their silhouettes now taper into rounded beads with smooth highlights. Slot reuse waits seven seconds, covering the longest flight and drying tail.
- Each impact sends out a small train of expanding light-and-shade rings. They remain behind the painting, settle within about three seconds, and give the paper a subtle pond-like sheen without turning it into a glowing surface.
- Defocused leaf silhouettes frame the sheet. Gentle shared wind and smaller individual sways move the shadows while leaving the central painting open. These shadows are illumination on the paper rather than new ink shapes.
- The dev.22 transition fix remains: song changes preserve existing marks and the brush pose during loading, then ease into the next spectrum and palette. Pause, reduced motion and inactive intervals hold all animation without catch-up. The camera stays flat and locked.

The previous 32-channel/eight-bloom layer and its data texture are removed. Rain and memory remain bounded at 64 active/drying drops and 128 absorbed traces. Leaf shadows and ripples use small instanced passes shared by Windows and Android.

## Try it

In a development installation, open **Settings → App updates** and install dev.23, then select **Visuals → Style → Contour**. Watch the bristles and wet highlights during a steady phrase, inspect the rings around fresh impacts, and compare the shadows over several seconds. Skip a song to confirm that the painting stays on the paper.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app using the original package and signing identity; confirm the system installer without uninstalling. Ordinary releases, main and public download buttons remain unchanged.

## Verification

All **530 shared tests** pass. CPU regressions cover the common offscreen rain origin and speed across all drop families, safe drying/reuse duration, internal pigment speed and frame-rate consistency, deposited-colour memory and continuity across track changes.

GPU checks measure the constant falling speed, verify ripples expand before settling to zero, and confirm the internal texture moves while preserving brush coverage (about 99.7% in the controlled phase comparison). Shadow checks verify peripheral placement, a clear centre, gentle opacity and visible wind motion. Existing live frequency placement, companion-line alignment, wet ink, pool joining, pressure, white paper, selective glow, continuous gesture and locked-camera checks pass. The song-loading fixture retains the identical frame and painted event data. Desktop, portrait phone-budget and RGBA8 fallback previews were inspected; all eight directions pass rendering and context-recovery checks.

Both Android ABI variants build; **134 Android JVM tests** pass and lint reports zero errors and nine existing warnings. The ARM64 APK retains package `music.resonance.mobile` and its original signing certificate. Both extracted distributables pass the complete startup module graph, including nested imports. A clean Windows portable installation reaches its welcome screen with an empty library in about 11 seconds.

A 16-second preview uses generated musical signals with quiet/heavy passages and a track/palette change. No physical Android device was tested; desktop phone-budget previews do not establish real-device driver compatibility, sustained performance or thermal behaviour.
