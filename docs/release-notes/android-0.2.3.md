# Resonance Android 0.2.3-preview

Loudness leveling prepares and saves whole-song measurements locally, prioritizes the selected song and prepares upcoming music. It applies a fixed per-song correction toward −16 LUFS; quiet and loud passages inside a song remain intact.

An unmeasured song waits with **Matching song loudness** feedback and a **Play original level** choice. Pause cancels the waiting playback intent. Settings shows library preparation progress. The background pass handles one file at a time and can be stopped by turning leveling off. Original music files are untouched.

Very quiet masters are no longer restricted to a 6 dB boost when measured peak headroom allows more. Peak protection remains; particularly dynamic recordings may be quieter. This is not automatic volume adjustment within a song.

Install over the existing app to keep music and settings. Package identity and signing certificate are unchanged; versionCode is 18. Native JVM tests, build/lint and extracted APK assets are checked; no physical Android device was available, so on-device/background playback still needs confirmation.
