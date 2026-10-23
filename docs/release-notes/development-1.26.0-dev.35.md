# Aerial: calmer currents and controlled musical gravity

Windows **1.26.0-dev.35** · Android **0.26.0-dev.35** (versionCode **101**).

The wires and currents move much more slowly. Each now has its own integrated phase, so percussion changes affect its rate without multiplying total elapsed time and abruptly shifting the pattern. Broader travelling highlights, gentler brightness changes and soft minimum-width strokes reduce flicker and thin-line crawling. An actual shader regression checks continuity after an hour of simulated playback and across phase wrapping.

Bass rises give the spheres a short upward lift and temporarily lighten gravity. Loudness has a separate, limited outward push and expansion. Larger bodies retain their inertia, sustained bass settles rather than repeatedly relaunching the sculpture, and gravity eases the bodies back after a lift. The composition, collisions, floor limits, smooth pause/play and track transitions remain intact.

Real collisions and landings add subtle, smoothly filtered squash, latitude highlights and coloured glints on the materials. These details follow contact energy and settle naturally instead of flashing on for a frame.

Verification includes 559 shared tests; isolated bass/loudness physics, settling, contact smoothing and current-phase tests; actual shader geometry and light stability; frame-by-frame music/track continuity; all seven visualizers and context recovery; full extracted Windows/Android startup module graphs and clean Windows welcome-screen startup. Android ARM64/x86_64 builds passed, with 134 JVM tests and lint reporting 0 errors and 9 existing warnings. The package, versionCode 101 and original signing certificate are verified. Physical Android hardware, prolonged phone thermals and the system installation prompt have not been tested here.

Use **Settings → App updates** in a development installation, install the update, then select **Aerial** in Visuals. Android uses the existing package and signing identity: install over the current app without uninstalling to preserve data. Packaging and Windows startup tests use separate clean folders and isolated data. These are development updates only; the ordinary channel, live website and `main` remain unchanged.
