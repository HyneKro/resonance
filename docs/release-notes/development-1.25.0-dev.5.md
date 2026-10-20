# A calmer listening edition and faster skipping

Development test update: Windows **1.25.0-dev.5** and Android **0.25.0-dev.5** (versionCode 62). These builds update the development channel only; the approved app and public download page stay unchanged.

- Music only uses the playing song's cover for every image in the composition. Supplementary artist photos, neighboring covers and their automatic artwork requests are removed.
- Windows artwork layers drift slowly on their own, at different depths and speeds. Moving the mouse no longer changes the composition. Reduced motion keeps it still; hidden views pause the drift. Android retains its still composition for performance.
- Rapid Windows Next/Previous clicks accumulate the intended queue position, then load only the final selection after a short settling interval. Superseded preparations are cancelled. Listening-history saves no longer block the next track, and repeated queue/volume saves are combined and serialized. Pause and direct song selection cancel a pending skip.
- Activity keeps one quiet icon in the main controls and disappears when idle. It is no longer moved into library/settings dialogs. The update-ready indicator also has one main-screen location; App updates remains available in Settings.

## Verification

458 JavaScript regression tests passed. The isolated UI tour passed 63 screens and 31 behavioral checks, plus Music only compact-window, phone/landscape, enlarged-text, cover-only, automatic-drift and reduced-motion checks. Constellation and startup checks passed.

A 2,600-song synthetic Windows library reached the 25th next song after a 25-click burst in approximately 0.9 seconds, despite an injected 700 ms listening-history response delay. Only one recording was opened. The largest observed animation-frame gap was about 17 ms in that Music only test. Reverse skipping, pausing during a pending skip and selecting another song also passed. This is an isolated regression result, not a guarantee for every device, file or background workload.

Android build, 134 JVM tests and lint passed. Both extracted startup module graphs, a clean empty-library Windows launch, and Android's existing signing identity were verified. Publication also checks uploaded hashes, anonymous development updates and isolation from the approved channel. No physical Android device was tested.

Use **Settings → App updates → Check for updates** in an existing channel-aware development installation, then restart/install when ready. Android installation uses the system confirmation and updates the existing app with its data preserved; do not uninstall.
