Fixes the loading screen that prevented Windows 1.1.4 from opening on a fresh installation. An interface dependency used by the update screen was present in the ZIP but not served by the app, so the main interface could not start.

- The missing dependency now loads correctly. A clean, empty library reaches the welcome screen.
- A failed startup script now shows a useful error immediately instead of an endless scene-loading message.
- Release checks now follow every frontend module dependency in the extracted Windows ZIP and Android APK.

If 1.1.4 is stuck at startup, download this ZIP and extract the entire folder before opening Resonance.exe. The stuck version cannot reach its in-app updater. If you already have a library, close Resonance and copy the old portable folder's `data` folder into the new portable folder before opening it; retain the old copy until you have checked the new one. Do not delete your music or data to fix this issue.

Validation: 182 automated checks pass, including a regression reproduced against the released 1.1.4 package. The extracted 1.1.5 assets and clean welcome screen are checked separately. This does not claim testing on every Windows graphics configuration.
