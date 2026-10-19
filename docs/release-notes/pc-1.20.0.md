# Resonance 1.20.0 — Light in the ribbon

- Add a new emissive spectrum particle layer on the ribbon's exact surface. Each frequency range lights its own particles in response to the sound, with a quick attack and a soft release.
- Mirror the spectrum and sampled background palette around the shape: bass meets bass and treble meets treble, with no color seam. The new layer adds no random lifetime flicker or extra deformation.
- Fade this layer completely out during silence or pause. It follows Bluetooth visual delay, camera movement and Track character, with fewer particles on phones and low-power settings.
- Keep Musical reactivity as the only response and remove the Classic/Musical dropdown. Older saved Classic choices migrate automatically; the previous source checkpoint remains available in Git history.

Verified with 386 shared regressions, generated offline audio, actual GPU frequency/color/geometry checks, desktop and phone-size interface checks, complete extracted startup graphs and a clean empty-library Windows launch. Playback audio, loudness leveling and mascot speed are unchanged. The spectrum uses the existing analyzer, not isolated instrument stems. Physical-phone performance still needs device feedback.
