# Choose your mascot

Open Visuals → Extras, turn on Mascot and choose Appearance. There are 30 choices: the original Sona and 29 guest characters, matching the PC roster. The phone uses a native dropdown, remembers your selection and resets to Sona without moving the settings page back to the top.

Guests have their own illustrated listening and dancing loops, plus idle/blink, sleep, greeting, pickup, held and landing poses. Fixed per-character pacing and three complete loops keep movement predictable. Tap to greet, hold/drag to pick up and release to land. Sona keeps her original artwork and theme colours; guests retain their own colours. Mascot stays off by default, and only the active atlas is loaded.

Shrek, Gengar, Pikachu and Team Rocket Meowth are not included because their artwork could not be generated. There are no placeholder options.

Validation: 298 shared/desktop automated tests; 105 Android JVM tests; ARM64 and x86 APK builds, device-test compilation and lint; both frontend menus tested in an isolated browser with a simulated phone bridge; full sprite rendering/contact-sheet review. The final APK's complete web module graph and all mascot assets were checked after extraction. Package ID and signing certificate are unchanged; versionCode is 32. No physical S22+ performance test was available. Install over the existing app to preserve your music and settings.
