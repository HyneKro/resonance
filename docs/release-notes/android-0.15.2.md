# Resonance Android 0.15.2 preview · Music-video audio fallback

Unavailable playlist recordings now receive a dedicated music-video search after audio-upload alternatives. Close matches retain the original playlist link; longer or different recordings can be previewed and chosen using Find another upload. Video and quality labels are recognized, with clearer audio-only information in the selection screen.

Downloads prefer the separate audio stream. When only a combined clip is available, its sound is extracted and the temporary video is discarded. Original-quality and compact Opus preferences remain available. Extra dialogue or intros in a chosen clip are retained. Rate limits and connection problems pause downloads instead of triggering more searches.

Validation: both ABI builds and the device-test APK compile; all 110 JVM tests pass, including video matching and actual downloader request options. Lint reports no errors (nine warnings). Shared frontend tests and an isolated mobile selection flow pass. A Windows test confirmed audio-only extraction from a short public clip sample; no physical Android device was available to repeat this test on a phone. The ARM64 APK keeps the package ID and signing certificate, with versionCode 35. Install over the previous app to preserve data.
