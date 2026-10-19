# Musical response

Visuals → Motion → Reactivity offers **Musical** (the default) and **Classic**. Switching blends smoothly. Classic settles to the unmodified 1.18.0 conductor output; it retains the previous track-character and live-audio behavior. The source baseline is tagged `checkpoint-audio-reactivity-1.18.0` at `bfd54bf`. The 1.18.0 Windows and 0.18.0-preview Android releases remain available for a full rollback. The original approved project checkpoint is unchanged.

Musical adds a lightweight visual layer after the existing analyzer, Bluetooth delay and conductor:

- Sustained notes resist small fluctuations while pronounced new notes respond quickly.
- Steady broadband energy has less influence on percussion lights. Fresh attacks retain their detail; crowded high-frequency flashes are slightly restrained.
- Slow measured energy changes guide a small expansion/contraction of the sculpture and atmosphere. A release needs a real low-frequency attack and an energy rise across several bands, rather than a metronome pulse or isolated high note.
- With Track character enabled and saved local sound analysis available, a short lookahead gently gathers the scene before a sustained energy rise. Several samples and a held tail must support the rise; an isolated loud peak does not qualify. No new analysis jobs or model downloads are started by this layer.

These are energy, spectral and attack estimates, not instrument recognition, vocal isolation, semantic verse/chorus detection or separated stems. Live desktop/phone capture has no lookahead. The visual clock, geometry identity, shaders, audio samples, playback gain and loudness leveling are unchanged. The feature does not alter mascot animation speeds. It adds no rendering pass and shares the same small implementation on Windows and Android.

Pause, seek, track/source change and resume discard stale evidence and suppress false arrivals while rendered envelopes settle. Predictions use the effective visual delay. Reduced motion bypasses the new layer; freezing holds its output. Track character controls saved-profile anticipation, while the Reactivity selector independently controls live detail refinement.

## Verification

`node --test tests/musical-response.test.mjs` covers Classic restoration, note detail/noise, sustained percussion versus fresh attacks, false predictions, startup/pause/seeks, broad arrivals, variable frame rates, freeze/reduced motion and delayed transients.

`tests/musical-response-ui-check.cjs` runs in an isolated, hidden Electron window with a private test library. It checks the PC/phone selector and persistence, the actual PC renderer integration, compact phone layout and GPU frames. It also runs `tests/musical-response-audio.js`: 22 seconds of deterministic generated stereo pads, melodic notes, drums, a quiet break, build and release through the real three-window Web Audio analyzer and shared visual pipeline. No test audio is played aloud.

On the development PC, the generated-audio pass returned identical stereo samples, about 46% less harmonic total variation and the same peak percussion response as Classic. The new layer's measured 95th-percentile update time was approximately 0.1 ms. These measurements describe this fixture and machine, not an overall FPS or perceptual-quality guarantee. Real-song preference, Bluetooth hardware timing and S22+ heat/battery behavior still need listening/device feedback.
