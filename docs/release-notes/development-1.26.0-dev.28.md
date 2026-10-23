# Flux: closer, brighter waves in black space

Development test builds: Windows **1.26.0-dev.28** and Android **0.26.0-dev.28** (versionCode 94). These use the isolated development channel; approved releases and the public download buttons are unchanged.

Open **Visuals → Style → Art direction → Flux**.

- Brought the camera closer and slightly deepened the wave volume. Larger sculpture settings retain extra camera stand-off, and the wave remains readable from the side, rear and underside.
- Restored a pure black background. The small world-space floating motes remain, controlled by **Orbiting dust**. Contrast preserves black instead of lifting it toward grey.
- Increased filament and point emission substantially, with hotter cores, broad two-pass bloom and highlights that retain more of the music palette.
- Doubled the measured frequency history from about 4.2 to 8.5 seconds and made older samples fade more gradually. Flux uses a bounded 12 KB history buffer; Afterglow keeps its separate original buffer.
- Delayed fragment detachment until samples have moved behind the leading wave. Fewer fragments lift from stronger peaks, lift less, and stay behind the sample that emitted them, reducing noise around the newest wave.
- Added denser fine threads and moving bead highlights within the wave. Mobile keeps lower trace and particle counts. Pause/freeze hold the history, reduced motion suspends sampling, and silence drains the trail without inventing peaks.

Verification: **545 shared tests** and **134 Android JVM tests** passed. Android lint reports zero errors and nine existing warnings. All eight visualizers pass GPU checks, including graphics-context recovery. The Flux GPU audit covers seven camera angles and the phone composition, finite radiance, bloom controls, black background, debris timing, a visible six-second-old trail, pause and silent history. The isolated debris pass renders no detached fragments in the newest samples and visible fragments farther back. Both extracted startup module graphs pass, shared visual files match both distributables byte-for-byte, and the clean Windows build reaches its empty-library welcome screen in approximately 10.4 seconds. Android retains package `music.resonance.mobile` and its existing signing certificate. No physical Android device test was available; browser phone checks are not device performance measurements.

Use **Settings → App updates → Check for updates** in an existing development installation. Windows applies the update on your restart action. Android updates the existing app with system confirmation; do not uninstall. Ordinary installations do not receive these test builds. The first development installation requires the one-time development ZIP/APK installation.
