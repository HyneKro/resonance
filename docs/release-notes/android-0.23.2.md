# Resonance Android 0.23.2-preview — Queued update recovery

- A downloaded APK no longer blocks manual or scheduled checks for a newer release.
- Installation checks freshness first. If a replacement is available, the app offers/downloads that version instead of opening the outdated package.
- Installation failures trigger one recovery lookup. Rejected versions are remembered across app restarts and are not retried automatically.
- Automatic replacement downloads remain Wi-Fi-only and respect the saved preferences. Installation always uses Android's confirmation.
- The APK is held unchanged while Android's installer is open. Returning after cancellation restores the installation controls.

Validation: ARM64 and x86_64 builds, 131 native unit tests, lint with 0 errors and 9 existing warnings, 436 shared JavaScript tests, extracted APK frontend dependency checks and shared updater UI checks. No physical-phone test was performed; system-installer return behavior still needs device validation.
