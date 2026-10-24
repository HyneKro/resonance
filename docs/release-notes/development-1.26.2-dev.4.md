# Synapse — sharp depth and clearer frequencies

Windows **1.26.2-dev.4** and Android **0.26.2-dev.4** (versionCode **110**), isolated development channel.

- Removed Synapse's depth-of-field treatment from junctions, particles, threads and facets. Distant details stay sharp, with perspective-sized particles instead of oversized bokeh. Emissive glow and bloom remain.
- A bounded treble lift and local frequency contrast make quieter high notes register more clearly. The motion response is slightly stronger overall, with a modest additional high-percussion kick. Raw audio analysis and the bass detector remain independent of this visual response.
- A fixed noise floor prevents quiet numerical noise from moving the high end. Attack/release smoothing, local motion, pause decay, track continuity and the existing phone particle budgets remain.

Verification covers weak high notes driving actual local particle positions, rejecting floor noise, smooth track/pause response, bounded motion, and equal junctions rendered sharply at near/middle/far depths. Full shared tests, Android JVM/build/lint checks, all seven visual worlds, extracted nested startup graphs, empty-library Windows startup, signing identity, legacy updater compatibility, uploaded hashes and anonymous channel isolation are checked before completing publication. Automated phone layouts are desktop simulations; physical Android testing remains outstanding.

All **571 shared tests** and **151 Android JVM tests** pass. Both ABI builds, device-test compilation and lint pass (0 errors; 9 existing warnings). The focused GPU check confirms compact particle footprints at all three depths and continued bloom, local motion, palette changes, camera coverage and smooth pause decay. The generated-music preview uses Resonance's actual offline audio analysis.

Existing development installations can use **Settings → App updates**. Otherwise install the development ZIP/APK once. The APK updates the existing app with the same signing identity; do not uninstall. Windows tests use a separate portable folder with isolated data. Main, ordinary releases and live download-page buttons remain Windows 1.26.1 / Android 0.26.1-preview pending approval.
