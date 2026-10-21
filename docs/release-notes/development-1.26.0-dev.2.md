# Four visual worlds, rebuilt

Windows **1.26.0-dev.2** · Android **0.26.0-dev.2** (versionCode 68). Development channel only.

Open **Visuals → Style → Art direction**. Resonance remains the original default.

- **Contour:** Geometric ink on textured paper: four intersecting textured brush circles, a small vermilion center, responsive contour echoes and restrained percussion-driven ink droplets.
- **Orrery:** clockwork and fine drafting behind engraved three-dimensional brass rings, shaded planets, a living central sphere, an asteroid belt and comet trails.
- **Noctiluca:** an aquarium with a central reflective boid school, mantas, sharks, jellyfish, surface light rays, rising bubbles and swaying plants. The music changes motion and illumination without resetting their paths.
- **Afterglow:** replaces Glasshouse with an endless synthwave highway, audio-sculpted mountain grids, sunset, skyline, neon windows, passing palms and frequency-lit roadside markers. Saved Glasshouse selections migrate automatically.
- Removed the manual ribbon-shape selector. The expanded shape collection remains in automatic song-driven rotation.

The changes use the existing musical analysis. No extra media downloads or analysis models are needed. Mobile keeps a smaller scene population and its existing adaptive quality settings.

This is a substantial development revision, not a claim that the new art directions have reached the original's polish. The aquarium is deliberately stylized. Physical Android performance and sustained thermal behavior still require device testing.

## Verification

Passed 480 shared regression tests, isolated desktop/phone interface checks, GPU shader and context-recovery checks, and separate bass/melody/percussion response checks for all four directions. Startup, Constellation, UI and rapid-skip smoke checks passed. Android native tests and lint passed (zero errors; nine existing warnings). The extracted Windows build reaches the empty-library welcome screen. Both packaged startup module graphs and matching Android signing identity passed verification. Terrain silhouette changes, boid pause/resume, frame-rate independence and sustained bounds are tested. Public updater checks are performed after publication. Tests use isolated data; no physical Android-device test is claimed. The ordinary release channel and live website remain unchanged.
