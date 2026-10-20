# Resonance PC 1.23.1 — Portable update recovery

Fixes the “Unsafe or invalid update entry” error when updating from 1.22.0. The optional lyrics-tool helper now lives in a directory that existing updaters accept. The update validator keeps its security checks.

If 1.22.0 has already downloaded the rejected 1.23.0 package, download **Resonance-PC-1.23.1-portable.zip** below, then choose **Settings → App updates → Install a downloaded ZIP…** and select it. Confirm **Restart & update** when ready. Do not extract over the running app or delete your data folder.

- PC users can now check for a newer release even when an update is already downloaded.
- Failed checks keep the verified downloaded update available. Installation errors show a short explanation instead of a PowerShell stack trace.
- The release process now tests the complete ZIP with the original 1.22.0 updater before uploading it, including every file hash.
- Includes the lyric timing workshop and word highlighting introduced in 1.23.0.

Verification: 430 JavaScript tests, complete packaged frontend module graphs, clean Windows startup, and full archive staging with the 1.22.0 updater. Regression tests cover the rejected helper location, corrected helper extraction, replacement releases, offline checks and data preservation.
