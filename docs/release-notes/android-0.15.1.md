# Resonance Android 0.15.1 preview · Correct artist credits

Artist credit repair now runs in the native library, including existing saved tracks. Self-uploading performers remain credited alongside their collaborators, combined source tags are separated, and named remixes retain their remixer. Song/version labels and titles following a feature credit no longer become additional artists.

New downloads retain original upload titles and recording credits separately from the uploader. Manual choices and listening data are preserved. Install over the existing app; package ID and signing identity are unchanged, with versionCode 34.

Validation: ARM64 APK and device-test APK build successfully; all 108 JVM tests pass, including the shared artist-credit fixtures and source-refresh protection. Android lint reports no errors (nine warnings). Extracted web assets pass the nested startup-module check, and the signing certificate matches the previous release. No physical Android device was available for this release; on-device migration and playback have not been re-tested.
