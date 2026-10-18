# Resonance Android 0.11.0 preview

- Shared musical-layer visual response separates estimated sustained and percussive activity. These are visual approximations, not isolated audio stems. Bluetooth visual delay still applies to both layers.
- New static Music Only listening editions retain restrained artwork sizing and no continuous background animation.
- Revised Sona sprites, stable registration, consistent headphones, the Resonance clef and corrected blinks. Fixed-speed, three-cycle dance routines remain.
- Constellation avoids a full-screen sky copy and repeated layout measurements, batches distant stars, and fades satellite details more gently. Mobile rendering limits are preserved.
- Last-resort alternate recordings require close artist/title/version/duration matches. Temporary restrictions pause downloads without extra searches. Playlist identity survives refresh and song details identify saved replacements.

Validation: shared JavaScript tests; portrait/desktop rendering fixtures and shader compilation; Android ARM64/x86_64 builds, JVM unit tests, lint and instrumentation compilation; extracted APK startup-module graph. Browser previews and desktop timing measurements are not physical-phone results. This release has not been tested on an S22+; unavailable-download recovery was exercised with controlled fixtures, not a blocked mobile account.

Install over the existing app to retain music and settings. Package ID and signing identity are unchanged; Android asks you to confirm installation.
