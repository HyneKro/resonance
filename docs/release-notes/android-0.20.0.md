# Resonance Android 0.20.0-preview — Light in the ribbon

- Add emissive spectrum particles following the ribbon. Individual frequency ranges light up with the sound and fade away in silence.
- Use mirrored low-to-high frequency runs and the background palette, joining bass to bass and treble to treble without a color seam.
- Keep Musical reactivity and remove the old response dropdown, including migration of saved Classic preferences.
- Preserve the rotated phone scene, Bluetooth visual delay, reduced motion, existing audio playback and phone performance defaults. The extra layer shares the existing buffers and bloom, with a smaller particle budget on mobile.

The ARM64 APK retains the existing package and signing certificate; install over the previous version to preserve your library. Verified with 386 shared tests, 124 native tests, Android builds/lint, phone-size interface and GPU checks, and extracted startup assets. No physical S22+ was available; on-device frame rate, heat and battery use remain device checks.
