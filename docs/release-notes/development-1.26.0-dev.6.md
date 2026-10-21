# Orrery: a celestial field

Windows **1.26.0-dev.6** · Android **0.26.0-dev.6** (versionCode 72). Development channel only.

Open **Visuals → Style → Art direction → Orrery**. Resonance remains the default.

Orrery now centres on an astral composition: a textured blue celestial body, eight smaller orbiting planets, 28 fine paths, a crescent of illuminated dust and three comet streams. Most tracks share a tilted plane, with four inclined paths opening the silhouette. A sparse star field, a distant luminous arc and flowing lines beneath the system add depth. Gears, dial markings and solid brass bands have been removed.

Bass opens the orbits and sends waves through the lower field. Melody changes orbital inclination and illuminates trails; percussion lifts scattered debris and catches planetary glints. Frequency lights illuminate their corresponding paths. Artwork colours tint the cool blue and warm amber materials. Travel uses integrated motion clocks, keeping planets continuous across musical attacks. Paused or frozen clocks hold their positions; reduced motion suppresses geometric deformation. Camera movement still explores the scene in depth.

The visual review corrected faint orbit compositing, broken path segments, regular surface patterns and overly bright stars. Phone rendering uses fewer dust points, path segments and planet triangles. This is an artistic astronomical study, not a physical orbital simulation. Compare quiet, melodic and percussion-heavy recordings during the trial.

Development installations receive this update through **Settings → App updates**. Ordinary installations need a one-time development ZIP/APK installation to enter the test channel. Keep the Windows trial in a separate portable folder. The Android APK updates the existing signed app and preserves its data; confirm installation through Android and do not uninstall. Ordinary releases, main and the public download buttons remain unchanged.

Verification: 493 shared tests and 134 native Android unit tests passed. Android lint reports zero errors and nine existing warnings. Rendering checks pass across all seven styles, including independent bass/melody/percussion responses, fixed frames, frequency-light controls and graphics-context recovery. Orrery-specific checks verify orbital travel, frozen-clock stability and camera depth. Desktop and compact-phone interface checks pass. Startup, control, queue and rapid-skip polish checks pass. Both extracted startup module graphs pass; the clean Windows extraction reaches the empty-library welcome screen with the development update channel. Android retains package ID `music.resonance.mobile` and its previous signing certificate.

Desktop GPU measurements at phone resolution are not physical-phone testing. Android battery use, heat and sustained frame rate still need device testing. The motion preview is silent and uses generated test impulses, not personal audio.
