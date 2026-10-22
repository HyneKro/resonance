# Contour diffuse canopy, drifting ink and pause settling · development test build

Windows **1.26.0-dev.24** · Android **0.26.0-dev.24** (versionCode **90**).

Contour moves closer to paper behaving like a quiet water surface. Landed pigment drifts and gently deforms, ripples travel with the stains, and broader, defocused canopy shadows replace the regular paired leaves. Pausing now lets the scene settle instead of freezing it instantly.

- Irregular, overlapping clusters of broad palmate leaves cast soft grey shadows at varied apparent depths. The canopy extends beyond the frame, with the central-left painting area left open. The paper's unshadowed white point stays intact.
- Landed droplets and absorbed pigment share a slow current. Their outlines stretch, turn and diffuse gently; softer edges and restrained grain make the marks feel more fluid. Ripples stay centred on the drifting stain. Incoming rain keeps its straight flight and common speed, while the main brush remains anchored to its frequency gesture.
- On pause, new rain stops immediately. Existing beads finish falling and ripples resolve at normal speed; brush displacement and pressure relax, while internal pigment, water drift and wind gradually slow. The scene reaches a fully still frame after eight seconds. Resuming eases back into the sound without resetting the painting or its colours.
- Explicit visual freeze, reduced motion and track-loading holds still take effect immediately. Long inactive gaps and clock changes never fast-forward the simulation. Track changes retain existing pigment and the smooth spectrum/palette transition.

Contour now receives its own continuous scene clock and audible playing state from the shared reactor. The other visual directions keep their existing timing behaviour. The water and canopy effects remain bounded shader/particle approximations rather than a full fluid simulation.

## Try it

In a development installation, open **Settings → App updates** and install dev.24, then choose **Visuals → Style → Contour**. Let a few larger drops land and watch their marks drift relative to the anchored brush. Pause during a busy passage: the remaining rain should land, the ripples should finish, and the brush/water/shadows should ease into stillness. Resume, then compare the explicit visual freeze control.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app using the original package and signing identity; confirm the system installer without uninstalling. Ordinary releases, main and public download buttons remain unchanged.

## Verification

All **534 shared tests** pass. New CPU coverage verifies no emissions from stale paused audio, gradual motion damping, exact bounded stillness, gentle resume, immediate freeze/reduced-motion holds, drift shared by landed and absorbed pigment, straight incoming flight, and the reactor's continuous clock and audible-state handoff.

GPU checks exercise the actual renderer with a running clock and paused audible state: motion continues after pause, no new drops are emitted, and subsequent frames become pixel-identical after settling. Explicit freeze also produces identical frames. Fluid mark deformation is visible while retaining about 99.9% of pigment absorption in the controlled comparison. Canopy checks verify soft peripheral coverage, clear paper to the left of centre and wind motion. White-point, frequency placement, companion-line alignment, continuous brush, wet ink, pool joining, memory, ripples, selective glow and locked-camera checks pass. Desktop, portrait phone-budget and RGBA8 fallback previews were inspected. All eight directions pass rendering and context-recovery checks.

Both Android ABI variants build; **134 Android JVM tests** pass and lint reports zero errors and nine existing warnings. The ARM64 APK retains package `music.resonance.mobile` and its original signing certificate. Both extracted distributables pass the complete startup module graph, including nested imports. A clean Windows portable installation reaches the welcome screen with an empty library.

A 24-second preview uses generated musical signals and labels playing, paused/settling, paused/still and resume stages, followed by a track/palette change. No physical Android device was tested; desktop phone-budget previews do not establish real-device driver compatibility, sustained performance or thermal behaviour.
