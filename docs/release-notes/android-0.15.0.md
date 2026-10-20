# Resonance Android 0.15.0 preview · More life for every mascot

All 29 guest mascots gain eight dance/listening routines with twelve illustrated poses each, plus fuller idle, sleep, greeting, pickup, carrying and landing sequences. Sona's existing artwork is preserved.

Fixed pacing, three complete loops before changing routines and bounded rendering caches keep the sprites responsive without audio-driven acceleration or stretching. Only the selected character's atlas is loaded.

Install this APK over the existing app to retain music and settings. The package ID and signing identity are unchanged; versionCode is 33. Physical-device animation performance still needs on-device confirmation.

Validation: 105 Android JVM tests pass; ARM64 app/test APK builds and lint pass (9 warnings, no errors). The extracted APK contains the complete frontend startup module graph. Every character pose was rendered in the mobile frontend with a simulated native settings bridge, including selection persistence and reset without scrolling. The APK signature matches the existing release identity. These checks do not replace physical-phone testing.
