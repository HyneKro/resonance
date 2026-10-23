# Aerial: expressive colour and continuous musical motion

Windows **1.26.0-dev.34** · Android **0.26.0-dev.34** (versionCode **100**).

Aerial now uses all six song tones, with continuous hue shifts from spectral balance and each body's notes. Coloured light cards and stronger material tinting let glass, marble, metals and emissive spheres show much larger changes within a song and between tracks.

Each main body has independent, spring-smoothed frequency, harmonic, percussion and glint envelopes. They drive stronger deformation, distinct drifting motion, animated marble veins, fine surface filaments, glass caustics and luminous microstructure. Twenty-four surface threads wrap around selected bodies on desktop, sixteen on phones, in addition to the existing spatial currents. Bubble releases send travelling crests of light through nearby surfaces.

The previous percussion response could instantly move satellite spheres outward by 0.12 scene units. Hits now excite a continuous damped envelope and distributed forces. In the repeatable 60 FPS percussion regression, the largest radius step is approximately 0.0075 and the largest body step drops from approximately 0.047 to 0.028. The liquid renderer uses conservative tracing so it does not skip thin displaced regions and make them flash away. Existing smooth particle births/deaths, slow idle motion and pause/track continuity remain.

Verification: 555 shared tests; focused rendered material, all-six-tone colour, spectral hue shift, deformation and particle continuity checks; a frame-by-frame percussion/song-change regression; seven-scene graphics and context recovery; clean Windows welcome-screen startup and full extracted Windows/Android startup module graphs. Android ARM64/x86_64 builds passed, with 134 JVM tests and lint reporting 0 errors and 9 existing warnings. The package, versionCode 100 and existing signing certificate are verified. Physical Android hardware, sustained phone thermals and the system installation prompt have not been tested here. Liquid, glass and reflections remain bounded artistic approximations.

Use **Settings → App updates** in a development installation, install the update, then select **Aerial** in Visuals. Android retains the existing signing identity and package: install over the current app without uninstalling to preserve data. Windows test packaging and startup checks use isolated data and do not replace the owner's running installation. These are isolated development releases; the ordinary channel, live website and `main` remain unchanged.
