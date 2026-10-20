# Musical response

The Musical response is now the only live response; the old Classic/Musical dropdown has been removed on PC and Android. Existing Classic preferences migrate to Musical. The source baseline remains tagged `checkpoint-audio-reactivity-1.18.0` at `bfd54bf`, and historical GitHub releases remain available for rollback. The original approved project checkpoint is unchanged.

Musical adds a lightweight visual layer after the existing analyzer, Bluetooth delay and conductor:

- Sustained notes resist small fluctuations while pronounced new notes respond quickly.
- Steady broadband energy has less influence on percussion lights. Fresh attacks retain their detail; crowded high-frequency flashes are slightly restrained.
- Slow measured energy changes guide a small expansion/contraction of the sculpture and atmosphere. A release needs a real low-frequency attack and an energy rise across several bands, rather than a metronome pulse or isolated high note.
- With Track character enabled and saved local sound analysis available, a short lookahead gently gathers the scene before a sustained energy rise. Several samples and a held tail must support the rise; an isolated loud peak does not qualify. No new analysis jobs or model downloads are started by this layer.

These are energy, spectral and attack estimates, not instrument recognition, vocal isolation, semantic verse/chorus detection or separated stems. Live desktop/phone capture has no lookahead. The musical refinement preserves the visual clock, geometry identity, audio samples, playback gain and loudness leveling. The feature does not alter mascot animation speeds. It adds no rendering pass and shares the same small implementation on Windows and Android.

Pause, seek, track/source change and resume discard stale evidence and suppress false arrivals while rendered envelopes settle. Predictions use the effective visual delay. Reduced motion bypasses the new layer; freezing holds its output. Track character controls saved-profile anticipation.

## Verification

`node --test tests/musical-response.test.mjs` covers reduced-motion bypass, note detail/noise, sustained percussion versus fresh attacks, false predictions, startup/pause/seeks, broad arrivals, variable frame rates, freeze/reduced motion and delayed transients.

`tests/musical-response-ui-check.cjs` runs in an isolated, hidden Electron window with a private test library. It checks removal of the PC/phone selector and migration from an old Classic preference, the actual PC renderer integration, compact phone layout and GPU frames. It also runs `tests/musical-response-audio.js`: 22 seconds of deterministic generated stereo pads, melodic notes, drums, a quiet break, build and release through the real three-window Web Audio analyzer and shared visual pipeline. No test audio is played aloud.

On the development PC, the generated-audio pass returned identical stereo samples, about 46% less harmonic total variation and the same peak percussion response as Classic. The new layer's measured 95th-percentile update time was approximately 0.1 ms. These measurements describe this fixture and machine, not an overall FPS or perceptual-quality guarantee. Real-song preference, Bluetooth hardware timing and Android-device heat/battery behavior still need listening/device feedback.


## Ribbon spectrum light

A separate seeded particle population overlays the exact ribbon surface (including track character, camera movement, birth-color geometry and topology transitions). It does not add displacement or random lifetimes. Logarithmic bands from 40 Hz to 16 kHz run low → high → low around the surface, so both ends meet without a frequency or color seam. The six smoothed background palette colors follow the same mirrored run.

Each band's absolute compressed spectrum level controls only its light, with a fast attack and a soft release. There is no per-frame normalization, idle emission or beat-triggered flash. The shared delayed analyzer supplies both levels and the silence gate, including Android capture. Pausing or silent input fades the layer completely out; reduced motion slows its light envelope and visual freeze holds it. The ordinary ambient sculpture remains visible when paused.

The layer adds one point draw (about 4,620 / 12,320 / 24,641 particles at eco / adaptive / high detail), reuses existing seed/birth buffers and bloom, and is warmed with the startup scene. A fully dark layer skips its draw. No new full-screen effect, audio processing, stored analysis or dependency is added.

`tests/ribbon-spectrum.test.mjs` covers frequency selectivity, absolute loudness, silence/pause/noise gating, frame rate, freeze/reduced motion and delayed timing. `tests/ribbon-spectrum-render.js` runs real WebGL2 shaders, inspects vertex outputs to verify mirrored color/frequency seams and exact alignment with the original ribbon in every color mode, measures rendered light for isolated frequency bands, and exercises high-detail and rotated phone rendering. The UI check captures these scenes. Physical-device performance and listening remain device checks.
