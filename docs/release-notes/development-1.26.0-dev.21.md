# Contour living ink materials · development test build

Windows **1.26.0-dev.21** · Android **0.26.0-dev.21** (versionCode **87**).

Contour adds wet ink, capillary spreading, connected pools, expressive brush loading, varied rain and a faint memory of previous marks. The white paper and continuously visible frequency gesture remain the composition's foundation.

- Fresh pools and falling beads catch soft reflections and small highlights. As water absorbs, the highlights disappear and the pigment becomes matte and grainy.
- Irregular edges creep along fine paper fibres, with darker drying rims and thin spreading tendrils. Nearby wet pools develop a smooth connecting neck; the connection releases as they dry.
- Bass loads a wider, denser brush. Quieter sound exposes broken bristles and fine scratches. Pressure changes ease over time, and track changes retain the brush's material state rather than making it collapse.
- The rain mixes tiny mist, ordinary drops and occasional large accented impacts. Larger drops make wider pools and stronger satellite splashes. Droplets accelerate toward the paper.
- Selected absorbed stains leave pale traces for up to 45 seconds beneath fresh ink. Each drop and trace retains its deposited colour, so an earlier palette can linger beneath a new one. Traces never overwrite one another while visible.

The simulation stays bounded at 64 active/drying drops and 128 faint traces. A small shared data texture carries the drop material, deposited pigment and pool connections. Rain and memory are painted behind the main gesture. Pause and reduced motion hold every stage; silent passages produce no new rain. A new song clears the rain and memory layers, while the main gesture stays continuously present.

## Try it

In a development installation, open **Settings → App updates** and install dev.21. Select **Visuals → Style → Contour**. Compare a quiet passage with a bass entrance, look for occasional large impacts and joined pools, and leave it playing for 15–30 seconds to see the older pale stains beneath fresh drops. Pause to inspect the surface detail.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app with the original package and signing identity; confirm the system installer without uninstalling. Ordinary releases, main and live download buttons remain unchanged.

## Verification

All **527 shared tests** pass. New CPU regressions cover the three rain families, rare large impacts, aspect-correct pool connections and their drying release, bounded memory without replacement of visible marks, retention of deposited colours, smooth brush pressure and pause continuity.

GPU checks verify wet highlights fading to matte pigment, a connecting pool neck where separate drops leave white paper, faint memory at about 8% of fresh ink's full-image absorption, and an approximately 70% wider and denser loaded brush in the controlled pressure comparison. The existing frequency-placement, companion-line alignment, circle, white-paper, selective-glow, continuous-gesture, pause, reduced-motion and flat-camera checks pass. Desktop, portrait phone and RGBA8 fallback previews were inspected. All eight visual directions pass their rendering and context-recovery checks; Contour's role audit allows its new pressure envelope to settle before comparing responses.

Both Android ABI variants build, **134 Android JVM tests** pass, and lint reports zero errors and nine existing warnings. The ARM64 APK retains its signing certificate. A 16-second preview uses generated signals and no personal music or library data.

Both extracted distributables pass the complete startup module-graph checks, and the clean Windows portable build reaches the welcome screen with an empty library.

No physical Android device was tested. Desktop phone-budget rendering does not establish real-device GPU performance, thermal behaviour or driver compatibility.
