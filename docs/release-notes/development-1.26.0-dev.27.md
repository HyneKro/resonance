# Synapse: a brighter, more reactive geometric web

Development test builds: Windows **1.26.0-dev.27** and Android **0.26.0-dev.27** (versionCode 93). These use the isolated development channel; approved releases and the public download buttons are unchanged.

Open **Visuals → Style → Art direction → Synapse**.

- Kept the airy polygonal web, with much stronger deformation and light. Bass swells the folded field, harmonics curl its woven patches, percussion produces local pressure surges, and treble adds glints and sparks. Individual frequency bands affect different nodes independently of the lighting spectrum.
- Added bright charge trails along connections, more fine woven strands, travelling contours inside translucent facets, and more floating particles. Neighbour connections and facets keep rearranging as the nodes move.
- Strengthened bloom with a broad two-pass halo. Highlights retain more of the song palette, while out-of-focus points and strands spread less light so the fine structure remains visible at peaks.
- Attacks in separate percussion lanes trigger stronger three-dimensional waves, echoes and curling particle bursts. Trusted beat pulses, spectral changes, loudness, musical roles and phrase energy contribute to distinct parts of the response.
- Strong motion uses a damped spring that stays stable across frame rates. Song changes preserve in-flight waves and network momentum; pause lets the scene settle toward a slow idle. Freeze and reduced motion still hold the simulation. Existing motion, flash, bloom, detail and particle controls remain available, with lower detail counts on Android.

Verification: **544 shared tests** and **134 Android JVM tests** passed. Android lint reports zero errors and nine existing warnings. All eight visualizers pass GPU checks, including graphics-context recovery. Dedicated Synapse checks cover independent frequency response, visible bloom and charge trails, moving neighbours and facets, travelling pressure waves, song palettes, camera angles, pause/freeze behaviour, phone rendering and smooth RGBA8 gradients. The extracted startup module graphs pass for both platforms, shared visual files match both distributables byte-for-byte, and the clean Windows build reaches its empty-library welcome screen in approximately 13.5 seconds. Android retains package `music.resonance.mobile` and its existing signing certificate. No physical Android device test was available; browser phone checks are not device performance measurements.

Use **Settings → App updates → Check for updates** in an existing development installation. Windows applies the update on your restart action. Android updates the existing app with system confirmation; do not uninstall. Ordinary installations do not receive these test builds. Switching from an ordinary installation to the development channel requires the one-time development ZIP/APK installation.
