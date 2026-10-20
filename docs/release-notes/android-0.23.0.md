# Resonance Android 0.23.0-preview — Word highlighting and lyric timing

- Dynamic Lyrics fills individual words when real word timestamps are available from a provider or imported file.
- **Behind the sound → Lyrics → Timing & word highlighting** adds saved Earlier/Later adjustments, reset and Restore original.
- Import LRC or Lyricsfile timing with Android's file picker; export prepared timing for another installation.
- PC's optional analysis tool can prepare timing files for the same recording. Android does not download or run recognition models, avoiding extra audio analysis on the phone.
- Original lyrics remain intact. Word highlighting follows native playback, seeks, pauses and Bluetooth visual delay.

Install over the existing app. Package ID and signing certificate are unchanged; versionCode is 51.

Validation: ARM64 and x86_64 builds, device-test compilation, 128 native unit tests and lint passed (existing lint warnings remain). The shared suite passed 427 tests. Phone browser previews checked controls, saved offsets, word timing, compact portrait and landscape. The extracted ARM64 APK passed the complete frontend dependency check and signature verification. No connected physical phone was available; native picker behavior and sustained S22+ playback still need device testing.
