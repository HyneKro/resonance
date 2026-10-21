# Astra orbit-plane correction · development test build

Windows **1.26.0-dev.17** · Android **0.26.0-dev.17** (versionCode **83**).

Astra's frequency waves now rise perpendicular to each orbit's own plane. Previously the frequency displacement was added along world-up after the ring was tilted, which skewed the waves sideways. The displacement now happens along the local normal before the ring's inclination is applied. Wave strength, twist, echoes, colour and the rest of the scene are unchanged.

## Try it

In a development installation, use **Settings → App updates**, select **Visuals → Style → Astra**, play music and rotate around the scene. Both the inner rings and the differently tilted outer rings should carry their frequency crests perpendicular to their planes.

For a manual Windows test, extract the ZIP into a separate folder. The Android APK updates the existing app with the same package and signing identity and preserves its data; confirm the system installer and do not uninstall. Ordinary releases and the live download page remain unchanged.

## Verification

The shader regression measures frequency displacement against the plane derived from each ring's undisturbed geometry, covering all 72 rings. It also checks the unchanged crest magnitude and outward echo delay. Multi-angle rendering covers side, above, rear, below and close views.

All 517 shared tests and 134 Android JVM tests pass. Android lint reports zero errors and nine existing warnings. Both extracted distributables pass the complete startup module-graph checks, and the clean, empty-library Windows build reaches the welcome screen. Android's package ID and signing certificate are unchanged.

No physical Android device was tested; desktop phone previews do not establish real-device performance or driver behavior.
