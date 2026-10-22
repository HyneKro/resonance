# Synapse: an airy geometric web

Development test builds: Windows **1.26.0-dev.26** and Android **0.26.0-dev.26** (versionCode 92). These use the isolated development channel; approved releases and the public download buttons are unchanged.

Open **Visuals → Style → Art direction → Synapse**.

- Reworked the composition as a spacious, gently folded polygonal field with fine straight connections, small luminous points and open pockets.
- Added sparse translucent triangles and delicate woven strands inside selected patches. Triangles share the moving nodes, and both facets and links crossfade as nearby connections change.
- Added rare point glints and softer hexagonal bokeh. Cellular rings/nuclei are removed, and fewer floating particles keep the focused mesh readable.
- Broader cyan–violet atmospheric gradients give the scene depth. The field, particles and background still follow the song palette with smooth colour changes. Perceptual gradient storage and dithering preserve the banding fix.
- Retained independent node motion, frequency/bass deformation, travelling charges and single-point shockwaves. Pause settles toward a slow idle; freeze and reduced motion hold the simulation without catch-up. Mobile uses fewer nodes, woven strands and particles.

Verification: **540 shared tests** and **134 Android JVM tests** passed. Android lint reports zero errors and nine existing warnings. GPU checks pass for all eight visualizers and graphics-context recovery. The dedicated Synapse audit checks changing neighbours, visible facets/woven detail, travelling three-dimensional pulses, music palettes, camera angles, pause/freeze behaviour, phone rendering and smooth RGBA8 gradients. Facet slots, indices, finite values and crossfades are covered by shared tests. Browser phone checks are not physical-device performance measurements. Both extracted startup module graphs pass, shared visual files match both distributables byte-for-byte, and a clean empty-library Windows build reaches the welcome screen in approximately 12.6 seconds. Android retains package `music.resonance.mobile` and its existing signing certificate.

Use **Settings → App updates → Check for updates** in an existing development installation. Windows applies the update on your restart action. Android updates the existing app with system confirmation; do not uninstall. Ordinary installations do not receive these test builds. No physical Android device test was available.
