# Synapse: a living neural network

Development test builds: Windows **1.26.0-dev.25** and Android **0.26.0-dev.25** (versionCode 91). These remain on the isolated development channel; the approved apps and public download buttons are unchanged.

Open **Visuals → Style → Art direction → Synapse**.

- The network now moves through a changing three-dimensional volume. Every node can move, and nearby connections rebuild and crossfade as neighbours change. Desktop uses 1,700 nodes; mobile uses 680 with a smaller filament and particle budget.
- Bass and frequency energy reshape the volume; melody curls the strands and drives travelling charges. Audible attacks launch expanding illumination and deformation fronts from individual nodes, accompanied by outward sparks.
- Fine secondary filaments, flowing beads, glowing nuclei and membranes, depth halos and floating particles add detail from different camera angles.
- Filaments, nodes, particles and the background follow the song palette with stronger colour separation and smooth changes. A perceptually stored, dithered dark gradient replaces the compressed-looking background.
- Musical activity settles into a slow idle on pause, allowing existing waves to finish. Track changes preserve the organism's position, velocity and colour transition. Freeze and reduced motion hold the simulation without catching up later.

Verification: **539 shared tests** and **134 Android JVM tests** passed. Android lint reports zero errors and nine existing warnings. GPU checks pass for all eight visualizers and graphics-context recovery. The dedicated Synapse audit verifies movement of all 1,700 nodes, changing/crossfading connections, three-dimensional pulse travel, visibly distinct music palettes, stable frozen clocks, pause settling, side/oblique/back views and a smooth RGBA8 background gradient. The mobile rendering simulation uses 680 nodes; these timings are desktop browser measurements, not physical-phone performance claims. Both extracted startup module graphs pass and a clean, empty-library Windows build reaches the welcome screen in approximately 10.2 seconds. Shared visual files match both distributables byte-for-byte. Android retains package `music.resonance.mobile` and the existing signing certificate.

Use **Settings → App updates → Check for updates** in an existing development installation. Windows installs on your restart action. The Android APK updates the existing app with system confirmation; do not uninstall. Ordinary installations do not receive these test builds. No physical Android device test was available.
