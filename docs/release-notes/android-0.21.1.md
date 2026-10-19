# Resonance Android 0.21.1-preview

- Constellation captions remain anchored to their stars during rotation, panning and zooming. Crowded names fade instead of jumping to new positions; names near the screen edge no longer slide along it.
- Spectrum intensity maximum: 12. Spectrum contrast maximum: 16, with its direction reversed as requested. Defaults are intensity 0.75 and contrast 2.00, matching the previous contrast 0.50. Existing custom contrast settings are translated once.
- Shared changes retain phone rendering limits, touch navigation and mobile display defaults.

ARM64 APK, package `music.resonance.mobile`, versionCode 48, with the existing signing certificate. Install over the previous version without uninstalling; Android still asks for installation confirmation.

Verification: 400 shared tests, 124 native JVM tests, both ABI builds, instrumentation compilation, and Android lint (0 errors; 9 existing warnings). The extracted APK's complete startup module graph and changed assets were checked. Isolated Android-interface previews checked setting defaults, maximums and persistence, the native queue adapter and narrow layouts. No physical S22+ or Android installation test was available.
