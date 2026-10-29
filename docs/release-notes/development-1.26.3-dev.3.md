# Automatic cleanup of completed Windows updates

Windows **1.26.3-dev.3** and Android **0.26.3-dev.3** (versionCode **116**), isolated development channel.

Windows now removes completed update payloads and older successful update folders after launch, including development versions. The previous cleanup helper could not parse `-dev.N` versions and stopped before removing anything. Numeric revision ordering now keeps the correct latest rollback backup, including when moving from `dev.9` to `dev.10`. Pending, failed, active, newer, malformed, redirected and personal-data folders remain protected.

Cleanup also handles reused Windows process IDs when a protected process hides its start time. If the cleanup helper fails, a local `.updates/cleanup.json` report records the error without interrupting playback. The app keeps one latest successful rollback backup; failed updates are retained for investigation.

Android accompanies this development release with its existing behavior and signing identity. Install through **Settings → App updates**. Windows installs after **Restart & update**; Android uses the system confirmation and updates the existing app without uninstalling. The Windows cleanup runs about a minute after launch.

Verification: development/preview/stable version ordering, future and malformed version retention, active installers, filesystem links, personal data, rollback retention and repeated cleanup are covered by automated tests. Both platform builds, extracted startup module graphs, clean Windows startup, Android signing, frozen Windows updater compatibility and development-channel isolation are checked before publication. Physical Android testing is not claimed.

Final checks: **586 shared tests** and **157 Android JVM tests** pass. Both ABI builds and device-test compilation pass; Android lint has **0 errors / 9 existing warnings**. The extracted Windows ZIP reaches the welcome screen with an empty library, and both extracted startup module graphs pass. The packaged cleanup helper also successfully reads the owner's development installation and preserves its latest rollback and five failed updates. Android package/signing identity is unchanged.
