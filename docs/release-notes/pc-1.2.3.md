# Resonance PC 1.2.3

Loudness leveling now prepares the library locally instead of leaving most first-time listens at their original volume. It still applies one fixed correction per song toward −16 LUFS, preserving each recording's quiet and loud passages.

- Missing measurements are saved in the background, one file at a time. The chosen song takes priority; upcoming queued songs are prepared ahead of playback.
- An unmeasured song shows **Matching song loudness** before it starts. You can cancel by pausing or choosing another song, or explicitly choose **Play original level**. A failed measurement stays visible with that choice instead of silently playing louder audio.
- Settings shows the number of songs measured. Turning leveling off stops the library preparation; original music files are never changed or uploaded.
- Quiet masters can use more than the former 6 dB boost when their measured peaks allow it. True-peak headroom is preserved; highly dynamic recordings can remain quieter to avoid clipping. No compressor or within-song automatic volume control is added.

Validation includes cached and first-listen gain, analysis priority/cancellation/cache reuse, explicit bypass, independent FFmpeg measurements of recordings roughly 30 dB apart, offline rendered audio, clean portable startup, artifact integrity and Android checks. The corrected test outputs agree within 0.12 dB. Existing data and the repaired 1.2.2 updater are preserved.
