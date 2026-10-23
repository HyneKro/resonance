# Aerial: luminous materials and living currents

Windows **1.26.0-dev.33** · Android **0.26.0-dev.33** (versionCode **99**).

Aerial now places its sculpture against an anthracite-to-black studio. Liquid chrome, refractive glass, animated marble, gold, silver, ceramic and emissive spheres have distinct surfaces and stronger coloured lighting. Frequencies deform individual bodies, ripple the liquid surface, and drive brighter rims, highlights and emission. Compact bloom passes smooth the glow around tiny droplets. Song palettes have a much stronger influence on materials and light sources.

Thin spatial currents weave through the sculpture. Percussion and strong bass release rising bubble groups, with musical intensity affecting their motion. Satellites and burst droplets scale and fade at birth and death; full burst pools skip releases instead of replacing visible particles. Phones use fewer bodies, satellites, bursts and currents.

The camera reaches a lower view just above the floor. Song changes preserve the sculpture, motion and in-flight bubbles while frequencies and colours blend. Pause eases the response down and retains slow ambient movement. Explicit Freeze and reduced motion still hold the simulation without catching up later.

Verification: 552 shared tests; all seven visualizers and graphics-context recovery; desktop/Android control persistence; focused Aerial rendered bloom, actual shader deformation and particle lifetime continuity, low/side/high camera views, playback/colour transitions and phone composition. The extracted Windows ZIP and Android APK pass the complete frontend module graph checks, including nested imports. Clean Windows startup reaches the empty-library welcome screen in approximately 10.3 seconds without errors. Android passed 134 JVM tests and lint (0 errors, 9 existing warnings), ARM64/x86_64 builds and signing/package identity verification.

These are isolated development updates. In an existing development installation, use **Settings → App updates**, install the update, then select **Aerial** in Visuals. **Studio darkness** ranges from charcoal at 0 to near-black at 1. Drag/swipe upward to try the low view. Scrolling still changes volume. The ordinary updater channel, live website and `main` are unchanged.

Android retains the existing package and signing identity: install over the current app without uninstalling to retain data. Installation requires Android's system confirmation. Windows keeps the owner's installed app and library separate from clean packaging and test profiles. Physical Android hardware, sustained phone thermals and the system installation prompt have not been tested here. Glass, liquid and floor reflections remain bounded artistic approximations rather than a full fluid or ray-tracing simulation.
