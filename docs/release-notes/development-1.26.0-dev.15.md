# Astra eruptions and spectrum echoes · development test build

Windows **1.26.0-dev.15** · Android **0.26.0-dev.15** (versionCode **81**).

Astra's debris is now a field of small shaded spheres, retaining 520 desktop / 180 phone particles alongside the fine dust. Their orbital planes share a prograde direction, with modest differences in inclination and eccentricity. The solar surface has faster flowing convection, moving granulation and a finer mesh. Each musical eruption pushes a local shockwave through the photosphere and lights its launch site; launch pressure and the visible particle population vary with the music. Prominences grow, twist through three dimensions, fade and emerge at new positions without replacing a visible arch.

Every ring now carries a complete frequency pass, progressively rotated and delayed with distance. Strong vertical crests on the inner rings travel outward as fading echoes; the existing polar sweeps remain. Quiet rings are dimmer, while musical playback retains its brightness.

Two discontinuities were corrected: repeated attacks no longer replace visible ring fronts, and new comets no longer shift all existing trails into different particle slots. A comparison against dev.14 reproduced a 4.67-unit single-frame comet jump; the revised trajectory's largest step in that trace is 0.074 units. Spectrum history, orbital phase and active flare lifetimes persist through track changes. The live skip regression covers the first five seconds after each source change. One initial run recorded a 576 ms stall; two instrumented follow-ups, including a fresh graphics cache, did not reproduce it (largest frame gaps around 20 ms). This does not establish that every possible device-specific stall is resolved.

## Try it

In a development installation, use **Settings → App updates**, then select **Visuals → Style → Astra**. Skip between contrasting songs, compare paused and active ring brightness, orbit above the disc to see the rotated spectrum, and move closer to the sun for the erupting surface. Visuals continues to stay open while exploring.

Keep a manually extracted Windows test ZIP in a separate folder. The Android APK updates the existing installation with the same package and signing certificate, preserves its data and uses system confirmation; do not uninstall. Live releases and the ordinary download page stay unchanged.

## Verification

All 516 shared tests and 134 Android JVM tests pass. Android ARM64 and x86_64 builds, instrumentation compilation and lint pass (0 errors, 9 existing warnings). The distributed APK is ARM64, with the existing package ID and signing certificate. Both extracted distributables pass the complete startup module graph checks.

The clean, empty-library Windows extraction reaches the welcome screen and reports the development update channel. UI, constellation performance, startup and rapid-skip checks pass.

All eight visual directions pass isolated rendering checks. Shader readback verifies solar relief, delayed vertical spectrum displacement, returning and escaping ejecta. The live transport test uses generated audio and an isolated empty test profile. No physical Android device was tested; browser phone previews do not establish device performance, battery use or driver behavior.
