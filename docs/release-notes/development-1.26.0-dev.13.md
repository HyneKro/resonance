# Astra: brighter light, polar waves and a wider solar system

Development test builds: Windows **1.26.0-dev.13**, Android **0.26.0-dev.13** (versionCode **79**). These builds use the isolated development channel; the approved releases and live download page remain unchanged.

## What changed

- Much brighter photosphere, flares and frequency rings, with a stronger, smoother bloom halo. The star, rings, particles and surrounding atmosphere now share pronounced music-driven colour changes instead of staying close to one fixed palette.
- The existing 48 frequency orbits remain, joined by 24 distant rings in four separated groups. Radial wave fronts and rotating angular patterns modulate ring light and displacement across the system.
- Planets and moons drift very slowly in silence, accelerate smoothly with music and leave particle trails when moving faster. Returning to quiet lets their added speed decay naturally.
- Solar prominences have five braided strands each, with moving bright knots, ripples, twisting and music-driven changes in height and shape.
- Sustained heavy bass now feeds smaller, more frequent eruptions. Most fragments follow short-range ballistic arcs back into the star; a smaller escaping stream fades outward.
- Comets follow focus-centred elliptical paths, accelerating near the star and slowing at the far end, with trails sampled along their previous positions. Their separate event pool keeps frequent eruptions from cutting their journeys short.
- Playback freeze, reduced motion, scene re-entry and track changes preserve the intended clock/reset behaviour. The existing HDR and dark-gradient precision protections remain.

## Verification

- All **511 shared tests** passed, including sustained-bass cadence, bounded pools, quiet-to-music velocity contrast, frame-rate consistency and elliptical orbital geometry/swept area.
- Astra GPU checks passed at desktop and simulated phone layouts: colour/bloom response, visible trails/comets, five viewing directions plus wide and close-up views, frozen/reduced motion, track reset, and RGBA8/HDR gradient checks. Direct shader readback confirmed that burst particles rise, fall and disappear at the stellar surface.
- All eight scene render regressions and context restoration passed. Desktop/mobile visual controls and actual HDR presentation checks passed. All four application-polish checks passed (navigation, constellation performance, startup and rapid skipping). The staged repository audit found no issues.
- Android built both ABI variants and compiled the device-test APK: **134 JVM tests passed**, **0 lint errors**, **9 existing warnings**. ARM64 distributable retains package `music.resonance.mobile` and the existing signing certificate.
- Complete startup module graphs passed against both extracted distributables. Source, Android shared files, packaged Windows assets and APK assets match. A clean Windows installation reached the welcome screen in **10.312 seconds** without errors.

## Trying the build

In an existing development installation, open **Settings → App updates → Check for updates**, then use Windows **Restart & update** or Android **Install update** when ready. Select **Astra** in Visuals; compare silence with a bass-heavy passage, rotate the view, and zoom out to see the separated outer rings. Try tracks with different colours and instrumental balances.

For a first development installation, extract the Windows ZIP into a separate portable test folder with fresh data. Android installs over the existing app with system confirmation and preserves its data/signing identity; do not uninstall. Installing this APK switches that installation to development updates.

No physical Android device was tested. Simulated phone rendering on the desktop GPU is not a phone performance or battery-life measurement. Solar debris uses a bounded visual approximation of gravity; comets use Keplerian ellipses. A generated-signal preview is retained locally for visual review.
