# Resonance 1.21.1 — Steadier Constellation labels

- Song and group names stay attached to their stars as you orbit, pan and zoom. Text faces the camera for readability; it no longer jumps between collision-avoidance slots or slides along screen edges.
- Crowded captions fade instead of moving. Existing labels get priority over newly appearing neighbours, with a short clearance delay to prevent flickering. Hovering another song does not rearrange the map's labels.
- Visuals → Motion: spectrum intensity now reaches 12 and spectrum contrast reaches 16. Contrast runs in the requested direction: higher values reproduce the effect of lowering the old control.
- New defaults: intensity 0.75, contrast 2.00 (equivalent to the previous contrast 0.50). Custom contrast values are converted once to retain their appearance; the previous default preset adopts the new defaults. Reset returns to the new values.

Verification: 400 shared tests and 124 Android JVM tests passed. Windows and Android shared modules match the extracted releases, including the entire startup dependency graph. A clean Windows installation reached the welcome screen without renderer errors. Hidden app previews exercised camera movement with changing hover targets, queue navigation, and desktop/phone/landscape layouts; both real interfaces passed spectrum defaults, maximums and saving checks. A local 3,000-song probe recorded approximately 60 FPS, with draw-time medians of 1.3–3.0 ms. This is a local measurement, not a device-wide performance guarantee. No physical Android device was tested.
