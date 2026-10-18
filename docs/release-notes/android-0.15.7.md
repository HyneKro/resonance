# Resonance Android 0.15.7 preview

All guest mascots now follow Sona's animation timing and complete three-cycle dances. Existing character drawings are mapped to her pose slots, with steadier alignment, consistent waving hands and connected pickup/landing poses. Sona's approved animations and every character's artwork are preserved.

The shared controller removes the separate guest speed settings and long reversing sequences. It keeps the existing bounded frame caches and does not add generated in-between frames or music-dependent stretching.

Validation: 357 JavaScript tests, all 30 appearances rendered, phone-layout selection/reset/persistence checks, Android build, local JVM tests, lint and packaged startup dependency checks. No physical Android device was available for this release.

Install over the existing app to preserve your music and settings. The package ID and signing certificate are unchanged; versionCode is 40.
