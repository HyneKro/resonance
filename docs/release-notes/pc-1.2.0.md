# Resonance PC 1.2.0 · a song's own motion

Track character now uses a locally measured audio map alongside the existing theme, genre and live-frequency response. Longer energy/texture chapters evolve related particle forms; quieter passages and stronger sections change the sculpture's openness, detail, glow and fluid intensity. Movement remains bounded and smooth, without extra camera travel or changes to Sona's timing or the live beat estimate.

- **Sound → A smoother listen:** optional loudness leveling toward −16 LUFS, preserving dynamics with measured true-peak headroom and a +6 dB boost cap. Unanalyzed tracks retain their original level until analysis finishes.
- **Skip silent edges:** optional skipping of measured leading/trailing silence. Pauses inside songs remain intact.
- **Behind the sound → Listening edit & song analysis:** see the saved energy map and loudness, refresh analysis, preview and save start/end markers, or reset to the original range. Spoken video intros/outros can be marked manually; automatic speech-versus-singing removal is not included. Audio files are never rewritten.
- **Experimental crossfade:** 1–8 seconds, off initially. Repeat-one, long mixes and consecutive songs with the same album label retain their original transitions. Pause, seek and manual track changes cancel an overlap.
- **Library review:** find missing/uncertain details, compare current and proposed recording metadata, select individual fields, protect manual corrections and undo the last edit without losing favorites or listening history.

Analysis is serial, cached locally and never uploads audio. Music only avoids new decoding unless leveling or silence skipping needs it. All new playback processing starts off; existing preferences and files are retained.

Validation: 195 desktop regression tests, real FFmpeg loudness/silence fixtures, playback transition and metadata-undo checks, and an isolated UI/visualizer check. The extracted portable's frontend dependency graph and empty-library startup are checked before publication. Android 0.2.0-preview is the companion release; crossfade remains PC-only.

Download and extract the complete ZIP, or use Settings → App updates → Restart & update. Keep your existing data folder. [Simple download page](https://hynekro.github.io/resonance/).
