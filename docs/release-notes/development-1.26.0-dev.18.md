# Contour painted spectrum · development test build

Windows **1.26.0-dev.18** · Android **0.26.0-dev.18** (versionCode **84**).

Contour keeps its flat, textured ink composition, with a much clearer musical response:

- The broad brushstroke and its colored companion trace the same live frequency curve, running from bass to treble along the gesture. Frequency peaks deform the brush across its local normal.
- The fine circle breathes with bass, ripples with the spectrum and gains weight with the lead.
- Percussion scatters black and colored ink dots and irregular splashes. Fresh colored ink glows, then dries and fades. Up to 320 dots remain bounded in eight bursts.
- The paper is darker, and colored ink has a bright core and soft neon halo. Black brushwork and lettering do not emit light.
- The accent starts vermilion and gradually takes on the track's palette and spectral balance. Pause, reduced motion and track changes preserve smooth color behavior.

Release verification also uncovered a temporary Windows file-lock error when saving updater preferences. Atomic preference replacement now retries transient locks for at most 775 ms; permanent errors remain visible and the previous file is never deleted to work around a lock.

## Try it

In a development installation, open **Settings → App updates**, then choose **Visuals → Style → Contour**. Compare a bass-heavy section, a higher melody and a drum passage. Watch the brush and neon line share the frequency peaks, the circle respond separately, and fresh ink scatter on accents. Try songs with different cover palettes and allow a few seconds for the tint to settle.

For a manual Windows test, extract the ZIP into a separate portable folder. The Android APK updates the existing app with the same package and signing identity and preserves its data; confirm the system installer and do not uninstall. Ordinary releases and the live download-page buttons remain unchanged.

## Verification

All **521 shared tests** and **134 Android JVM tests** pass. Android lint reports zero errors and nine existing warnings. Both ABI variants build; the published APK is ARM64. Both extracted distributables pass the complete startup module-graph checks, and the clean Windows build reaches the welcome screen with an empty library.

GPU readback verifies low-to-high frequency placement, matching brush/line displacement, an independently deforming circle, colored-only bloom, a darker paper background, gradual palette response, stable paused frames and flat camera behavior. Desktop, portrait phone and RGBA8 fallback previews were inspected. All eight visualizers pass the shared render audit, including context recovery. Updater tests cover transient locks, preservation of the old preferences file, bounded retries and permanent failures.

No physical Android device was tested. Desktop phone previews do not establish real-device GPU performance, thermal behavior or driver compatibility.
