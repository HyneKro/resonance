# Astra framing continuity · development test build

Windows **1.26.0-dev.19** · Android **0.26.0-dev.19** (versionCode **85**).

Astra's whole-scene scale now eases through musical arrivals, song changes and pauses. This fixes a reproduced forward/backward framing jump that occurs with **Camera zoom off**: phrase detection previously enlarged the entire solar system in one frame, and resetting song evidence removed that enlargement immediately. The final scale now retains its position and velocity across those changes. A delayed frame cannot advance several scale steps at once.

All Astra layers share that eased scale. Frequency waves, orbital speed, eruptions and lighting retain their existing response. The Camera zoom control and other scenes are unchanged.

## Try it

In a development installation, open **Settings → App updates** and install this update. Select Astra, turn **Camera zoom off** and compare a quiet introduction followed by a strong musical entrance. Skip tracks and pause/resume. Repeat with Camera zoom enabled: the intentional camera movement remains, while the independent scene-scale pulse is smoothed.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app using the same package and signing identity; confirm the system installer without uninstalling. Ordinary clients, main and live download-page buttons remain unchanged.

## Verification

The new graphics regression holds the camera stationary and drives the real phrase detector through a quiet-to-loud arrival and a source reset. Against dev.18, the maximum scale step is **1.569%**; with this fix it is **0.0555%**, approximately 28 times smaller. Both desktop and phone rendering budgets upload the same eased scale to the star, rings, debris and particles. The old source fails this regression and the corrected source passes. Mean full-image frame change in that interval drops from 4.39 to 0.77 code values on desktop and 3.65 to 0.70 on phone settings.

All **523 shared tests** pass, including pause, re-entry, missing-frame and invalid-input framing checks. The live generated-audio test covers two skips and pause/resume with camera zoom enabled: maximum framing step 0.48%, largest frame gap 75.6 ms and no recorded long tasks. Astra rendering, its surface and gravity checks also pass.

All eight visual directions pass rendering and context-recovery checks. Both Android ABI variants build, **134 Android JVM tests** pass, and lint reports zero errors and nine existing warnings. The published APK is ARM64 and retains the signing certificate. Both extracted distributables pass their complete startup module-graph checks; the clean Windows package reaches the welcome screen with an empty library.

No physical Android device was tested. These checks establish the reproduced scale discontinuity; they do not rule out every possible device-specific rendering stall.
