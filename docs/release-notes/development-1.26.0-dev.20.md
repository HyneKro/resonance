# Contour ink rain on white paper · development test build

Windows **1.26.0-dev.20** · Android **0.26.0-dev.20** (versionCode **86**).

Contour returns to bright, lightly textured white paper. Its main painted gesture stays fully drawn: the 17-second fade and replacement drawings are removed. Live frequencies still bend the brush and colored companion line together, while the fine circle has its own musical response.

Ink now falls onto the paper behind the brush instead of spraying from the gesture:

- Sustained sound feeds a rain of droplets; accents briefly increase the rate. Loudness and bass change impact size, and the track palette gradually tints the colored ink among black drops.
- Falling beads have tapered trails. On landing they spread into irregular stains with eight smaller splash droplets, a faint capillary wash and a darker drying edge.
- Up to 64 drops and their marks remain in flight or drying. Visible marks are never replaced to make room; slots are reused only after the previous stain has disappeared.
- Stains are painted into the paper layer, so the main brush naturally covers them. The colored companion line retains its selective glow, and black ink does not emit light.
- Pause holds the painting and droplets. Silent passages stop new rain while existing drops finish and dry; reduced motion does not advance the rain. A new track starts a clean rain layer and retains gradual palette changes.

## Try it

In a development installation, open **Settings → App updates**, install dev.20 and select **Visuals → Style → Contour**. Compare a quieter section with a loud bass entrance and percussion. Leave it playing beyond 17 seconds to see that the main gesture remains continuous. Try tracks with contrasting cover colors, then pause to inspect the wet marks.

For a separate Windows test, extract the ZIP into a new portable folder. The Android ARM64 APK updates the existing app with its original package and signing identity; confirm the system installer without uninstalling. Ordinary releases, main and live download buttons remain unchanged.

## Verification

All **523 shared tests** pass. CPU checks cover silence, musical density and size, frame-rate consistency, spatial coverage, bounded reuse, pause, seeks, reduced motion and palette continuity. GPU readback verifies falling trajectories, disappearance of airborne beads at impact, creation of landing marks and satellite splashes, and eventual drying. With identical musical inputs, rendered brush frames at 16.99, 17.01, 34.01 and 51.01 seconds are identical; there is no timed fade or redraw.

Desktop, portrait phone and RGBA8 fallback previews render correctly. The paper layer averages about 0.946 on a 0–1 scale with rain present. Colored-line bloom remains visible, and black brushwork has zero emission. All eight art directions pass the shared rendering and graphics-context recovery audit. A 16-second preview uses generated signals and no personal music or library data.

Both Android ABI variants build; **134 Android JVM tests** pass, and lint reports zero errors and nine existing warnings. The ARM64 test APK retains its signing certificate. Both extracted distributables pass the full startup module-graph checks, and the clean Windows package reaches its welcome screen with an empty library.

No physical Android device was tested. Desktop rendering at phone resolution does not establish real-device GPU performance, thermal behavior or driver compatibility.
