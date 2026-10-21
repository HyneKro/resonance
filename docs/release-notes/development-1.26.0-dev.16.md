# Astra surface and motion refinement · development test build

Windows **1.26.0-dev.16** · Android **0.26.0-dev.16** (versionCode **82**).

Frequency waves have softer, slightly lower crests, with the offset between successive rings reduced from 4.68° to 1.98°. Their outward echoes, polar sweeps and quiet/playback brightness contrast remain.

Solar ejecta now shares one inverse-square gravity model across a continuous range of launch speeds. Some particles return; others linger near escape velocity or leave quickly. Musical launch pressure, small transverse eddies and independent brightness/size variations add detail without splitting the cloud into two populations. The local surface shockwave and bloom remain. The flare arches are removed; flowing convection domes, finer ridges and intergranular lanes add detail to the star's actual surface and texture instead.

Camera zoom now enters more gently and limits catch-up after a delayed frame, with its depth and field of view advancing together. A regression that inserts 100 ms frames during playback, silence and resume reduced the largest logarithmic framing step from 6.6% to 1.72%. Ring projection also remains stable as foreground paths cross the camera plane. This addresses reproduced zoom discontinuities; it is not a claim that every device-specific rendering stall has been eliminated.

## Try it

In a development installation, use **Settings → App updates**, select **Visuals → Style → Astra**, and enable musical camera zoom. Start playback, skip songs and pause/resume to compare the camera transition. Orbit the scene to inspect the gentler spiral and move closer to the star for the new surface relief and eruption particles.

For a manual Windows installation, extract the ZIP into a separate test folder. The Android APK updates the existing app with the same package and signing identity, preserves its data and requires system confirmation; do not uninstall. Ordinary releases and the live download page remain unchanged.

## Verification

All 517 shared tests pass. Astra shader readback checks returning and escaping ejecta, continuous motion across escape velocity, local surface deformation, delayed frequency waves and ring orientation at the camera plane. All eight visual styles pass their rendering checks. The live generated-audio check covers playback start, two skips and pause/resume with camera zoom enabled: maximum framing step 0.48%, maximum frame interval 37.9 ms, no recorded long tasks.

Android builds and all 134 JVM tests pass; lint reports zero errors and nine existing warnings. The ARM64 APK retains the existing signing certificate and package ID. Both extracted distributables pass the complete frontend module-graph checks. A clean, empty-library Windows build reaches the welcome screen, and the UI, startup, constellation performance and rapid-skip checks pass.

No physical Android device was tested; desktop phone previews do not establish real-device performance or driver behavior.
