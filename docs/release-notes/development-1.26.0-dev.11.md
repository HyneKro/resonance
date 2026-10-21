# Afterglow — neon night drive

Windows **1.26.0-dev.11** and Android **0.26.0-dev.11** (versionCode 77). Development channel only.

Open **Visuals → Style → Art direction → Afterglow**. The scene now has a faster neon highway, passing palm silhouettes, three layers of an Art Deco skyline, lit windows, rooftop antennas, a saturated striped sunset, stars and drifting motes. Road reflections, horizon haze and bloom give the light sources more presence. The forward camera stays fixed, including when camera orbit, rail, zoom or kaleidoscope is enabled.

The terrain is a mirrored landscape built from the existing 48-band spectrum. Bass raises the ridges; percussion brightens road lines; melody illuminates the sunset. Recent music is nearest the viewer, with quieter delayed copies fading into the distance. A separate 6 KB memory buffer holds about four seconds of spectrum values; no audio recording, external service or new analysis model is involved. Paused/frozen playback holds travel, reduced motion holds the echo history, switching away suspends it and changing songs clears the previous history.

Three saved controls are available on both platforms:

- **CRT scanlines:** scan rows, subtle tube curvature, colour separation and grain.
- **Phosphor dots:** a staggered RGB screen texture. Set both CRT controls to zero for a clean picture.
- **Music colours:** blends the song palette into the classic pink, cyan and amber neon. Zero keeps the classic palette.

Movement controls driving speed; Beat motion affects the road's percussion response; Frequency lights illuminate terrain and windows; Bloom and Glow control light spill; Orbiting dust controls the motes. Android retains its adaptive resolution, lower mote count and existing rotated portrait composition. The effects are stylized procedural graphics, including the palm silhouettes and sunset reflection.

Development installations receive this build through **Settings → App updates**. An ordinary installation needs a one-time development ZIP/APK installation to enter the test channel. Keep Windows testing in a separate portable folder. Android updates the existing signed app and preserves data; confirm through the system installer and do not uninstall. Main, ordinary releases and the public download buttons remain unchanged.

Verification: 504 shared tests and 134 Android JVM tests pass. Both Android ABI builds, instrumentation-test compilation and lint pass; lint has zero errors and nine existing warnings. The complete startup module graphs pass from the extracted Windows ZIP and Android APK. The clean Windows build reaches the empty-library welcome screen in 12.1 seconds. The ARM64 APK retains its package ID and signing certificate and raises versionCode to 77. Repository audit, navigation, startup and rapid-skipping checks pass.

Actual graphics checks cover all eight directions, independent musical responses, frequency lighting, paused frames and context recovery. Afterglow additionally passes rendered CRT and palette changes, fixed-camera invariance, history reset, echo influence, mirrored terrain, travel and phone-layout checks. Windows and Android controls persist and fit compact layouts. A 20-second preview uses generated signals and shows the default, clean and stronger CRT treatments; no personal music or library data is used. Desktop graphics checks at phone resolution do not establish sustained performance, heat or battery use on a physical Android device.
