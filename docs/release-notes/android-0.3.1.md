Repairs a startup crash when reopening an existing music queue.

- Missing analysis progress no longer becomes an invalid number while the native player restores its queue. Idle and completed analysis states are safe to read.
- Listening-time tracking also handles older songs with no saved listening-time value.
- A persistent update-ready arrow opens App updates once the new APK has been verified. Android still asks you to confirm installation.
- General Settings no longer duplicates Visuals & Sona. Open Visuals directly from the listening screen.

Install this APK over the existing app. Do not uninstall: your music, queue, sources and preferences are retained. This preview keeps the same package and signing identity, with versionCode 20. Windows companion: 1.3.1.

Validation: 76 JVM tests passed; APK build and lint passed (0 errors, 17 existing warnings). Phone-size menu flows and the extracted APK's complete startup module graph were checked. The native smoke test now covers a restored queue, but could not run because the local emulator did not boot; no physical Android device test was available.
