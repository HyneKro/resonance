# Resonance Android 0.15.3 preview · Mascot movement cleanup

Shares the PC cleanup of all 29 guest characters: reviewed pose sequences, steady timing, corrected horizontal alignment, brief blinks and greetings, and consistent pickup, held and landing drawings. Sona's shoulder groove and sway also receive targeted corrections. Character designs, theme coloring and existing preferences are preserved.

The sprite renderer keeps its 24 Hz presentation budget and never exceeds 12 illustrated poses per second. Music cannot stretch or speed up the characters. Dance routines still complete at least three cycles before changing. No additional textures or image decoding are required.

Validation: all 328 shared JavaScript tests and 110 native JVM tests pass. Both ABI variants and the instrumented-test APK compile; lint reports zero errors and nine existing warnings. All 30 appearances render without silhouette clipping in the isolated browser check; the mobile picker, saved choice and reset flow pass with a simulated native bridge. Extracted APK assets pass the complete startup module-graph check. No physical Android device was available for this release.

ARM64 preview, versionCode 36, unchanged package ID and signing certificate. Install over the existing app to retain music, playlists and settings.
