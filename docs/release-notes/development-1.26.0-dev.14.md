# Astra detail and continuity · development test build

Windows **1.26.0-dev.14** · Android **0.26.0-dev.14** (versionCode **80**).

Astra now has a deeper field of orbiting rocks and fragments: 520 mesh asteroids on desktop, 180 on phones, plus finer particles. Sizes, inclinations, tumbling, displacement and emissive veins respond to the music. The sun has an advected convection surface, magnetic dark regions and distance-filtered granulation. Braided prominences carry brighter moving knots, and eruptions include both returning material and a faster escaping stream.

Pause/play and track changes preserve the solar system's orbital phase and existing events. Frequency displacement, lighting, velocity and colors ease between their targets. Paused playback retains a visible, slow ambient drift; explicit visual freeze and reduced motion still hold the simulation. Flare twisting now uses an integrated clock rather than multiplying elapsed time by a changing audio value.

Visuals stays open while the scene is rotated or clicked. A compact “Stays open while you explore” hint makes the behavior visible. Close it with its close button or Visuals toggle; Escape works on desktop, and Android Back remains available. On phones it opens as a shorter non-modal panel, leaving the scene exposed for touch rotation. Other panels keep their existing dismissal and modal behavior.

## Try it

Use **Settings → App updates** in an existing development-channel installation, then select **Visuals → Style → Astra**. Compare a quiet passage with bass-heavy playback, pause and resume, skip between songs with different palettes, and rotate the camera with Visuals still open. Try a closer camera view to see the solar surface and returning fragments.

Windows is a clean portable test ZIP; keep it separate from the installed app when installing manually. Android installs over the existing app with the same package and signing certificate and requires system confirmation. Do not uninstall to update. Ordinary installations and the live download page remain on their approved releases.

## Verification

- 512 shared tests; 134 Android JVM tests; both Android ABI builds and instrumentation-test compilation. Android lint has no errors and nine existing warnings.
- Isolated GPU checks cover all eight scenes, spectrum response, camera depth, context recovery, reduced motion, persistent orbital phase, comet trails, and HDR output. Shader readback confirms bound ejecta returns to the surface while escaping ejecta keeps moving outward.
- Background comparison through the final compositor preserves the dark gradient in the RGBA8 fallback (mean byte difference below 0.08 from the float buffer).
- Desktop mouse drag, scene click, close/toggle/Escape and focus restoration; phone touch orbit with Visuals open, modal Settings, Back navigation, saved controls and compact layout.
- Complete startup module graphs checked in the extracted Windows ZIP and APK; packaged visual and interface assets match the reviewed source. Android package and signing identity verified.
- The extracted Windows app reaches the empty-library welcome screen without startup errors. Navigation, Constellation performance, startup presentation and rapid track-change checks pass. The staged repository audit reports no private/generated files or credential findings.

These are development builds for review. Browser phone previews do not establish physical Android performance, battery use or device-specific graphics behavior; no physical Android device was tested.
