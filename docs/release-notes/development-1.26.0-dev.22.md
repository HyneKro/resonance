# Contour currents and continuous song transitions · development test build

Windows **1.26.0-dev.22** · Android **0.26.0-dev.22** (versionCode **88**).

Contour's rain and main gesture now participate in one flowing painting. Landed pools send fine ink channels toward the brush, with branching tributaries, travelling pigment pulses and occasional larger blooms on strong musical accents. White paper, the continuously visible brush and its frequency-following companion line remain the foundation.

- Channels grow after impact and attach to the same live frequency curve used by the main brush. Where a neighbouring wet pool exists, a tributary can connect it. Smaller branches curl into the paper's tooth.
- Bass accelerates the travelling pigment pulses. Spectral balance gently steers the current, while the brush's frequencies carry the roots with its changing shape. Channels retain their deposited colours, grow gradually and dry away over nine seconds.
- Distinct strong accents can grow a branching ink bloom from the brush. Branches unfold over about three seconds, dry to a faint trace and disappear by fifteen seconds. A cooldown keeps blooms occasional. Existing visible events are never replaced to make room for new ones.
- Changing songs no longer clears rain, stains, channels or blooms. The brush holds its pose while the next track loads, then eases into its frequencies and roles over about 1.6 seconds. Newly deposited ink follows the existing smooth palette transition; old marks keep their colours.
- Normal frequency response uses a short smoothing envelope. Pause, reduced motion and inactive intervals hold the painting and pulse phase without fast-forwarding. The camera remains flat and locked.

The added layer is bounded at 32 channels and eight blooms, carried by a small data texture. Phone settings use fewer curve segments. The existing wet ink, pool joining, fine mist, large splashes, pressure, deposited-pigment memory and selective companion-line glow remain.

## Try it

In a development installation, open **Settings → App updates** and install dev.22. Choose **Visuals → Style → Contour**. Let rain build for several seconds, look for thin channels running toward the brush, then compare a quiet passage with a strong bass entrance. Skip between two different songs: the painting should stay on the paper through loading and settle into the next song without disappearing.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app using the original package and signing identity; confirm the system installer without uninstalling. Ordinary releases, main and the public download buttons remain unchanged.

## Verification

All **531 shared tests** pass. CPU regressions cover impact-to-brush binding in landscape and portrait, retention of deposited colours, bounded event reuse without overwriting visible marks, accent gating, silence, transport speed, frame-rate consistency, pause and track continuity.

GPU checks verify channel growth, visible travelling pulses, bloom growth and drying to about 10% of fresh absorption before disappearance. The track-change loading frame has zero pixel difference and retains all painted event data; the first new-spectrum frame changes the largest normalized band by about 0.019 in the controlled fixture. Existing frequency placement, brush/companion alignment, continuous gesture, white paper, selective glow, wet/dry pools, memory, pause and locked-camera checks pass. Desktop, portrait phone-budget and RGBA8 fallback previews were inspected. All eight directions pass rendering and graphics-context recovery checks.

Both Android ABI variants build; **134 Android JVM tests** pass and lint reports zero errors and nine existing warnings. The ARM64 APK has package `music.resonance.mobile`, versionCode 88 and the unchanged signing certificate. Both extracted distributables pass their complete startup module graphs, including nested imports. A clean Windows portable installation reaches the welcome screen with an empty library in about 11.3 seconds.

A 16-second preview uses generated musical signals, including a track and palette change. No physical Android device was tested; desktop phone-budget previews do not establish real-device driver, thermal or sustained performance behaviour.
