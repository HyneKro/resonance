# Afterglow road marking alignment

Windows **1.26.0-dev.37** and Android **0.26.0-dev.37** (versionCode **103**), development channel only.

The red dashed road markings now follow the road’s vanishing point and stay parallel to its longitudinal grid lines. Their spacing, glow and audio response are preserved.

Verified with the existing desktop/phone Afterglow render checks, 560 shared automated tests, 138 Android JVM tests and Android lint (0 errors, 9 existing warnings). Physical Android device testing remains outstanding. Both extracted app module graphs, clean Windows startup, Android signing identity, uploaded checksums and isolated development discovery are checked before completion.

Use **Settings → App updates** in an existing development installation, or install the matching development ZIP/APK once. Android updates the existing app; do not uninstall. Ordinary releases, `main` and the live download page stay unchanged.
