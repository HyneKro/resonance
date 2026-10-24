# Synapse — local circulation

Windows **1.26.2-dev.2** and Android **0.26.2-dev.2** (versionCode **108**), isolated development channel.

Synapse's base motion now varies across the web, while keeping the connected sparks, fine woven geometry, glow and palette behaviour from dev.1.

- The broad shared twist and swell are replaced by 24 overlapping areas of circulation in 3D. Their directions, tempos and musical frequency responses differ. Each junction blends four areas, so the web can fold locally without splitting into rigid motion groups.
- Musical bands advance the local clocks independently. Some patches stir while others drift or settle. Small per-junction variations and different spring responses add lag and uneven flex instead of moving every point with the same timing.
- Bass adds restrained local pulls in different directions. The existing currents still follow actual connections, and frequency-specific surface detail stays attached to each junction. Beat motion continues to control local attack flex.
- Local clocks continue through track changes and slow down on pause. Explicit hold and reduced-motion behaviour remain respected. The phone stays at 680 junctions / 16 routes; desktop stays at 1,700 / 36.

All **564 shared tests** and **151 Android JVM tests** passed. Regression checks cover independent local frequency timing, blended regions, visible nonuniform movement, nearest-link rearrangement, bounded step size, routed-current continuity, pause decay and frame-rate stability. Render checks distinguish active and quieter patches and cover bloom, facets, colour changes, camera angles, the background gradient and phone budgets. All seven visual worlds passed the cross-scene checks. Android builds and lint passed with zero errors and nine existing warnings. A fixed-camera silent preview makes the local movement easier to judge.

Both development packages require shared tests, Android JVM/build/lint checks, extracted startup module graphs, clean Windows launch, signing, legacy updater compatibility, upload hashes and anonymous channel verification. Desktop phone simulations are not physical Android testing. Main and ordinary releases remain Windows 1.26.1 / Android 0.26.1-preview pending approval.

Existing development installations receive this through **Settings → App updates**. Otherwise install the development Windows ZIP or Android APK once. The APK updates the existing installation with the same signing identity; do not uninstall. Windows testing uses a separate portable folder and isolated data.
