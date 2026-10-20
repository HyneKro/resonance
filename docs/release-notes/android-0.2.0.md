# Resonance Android 0.2.0 preview · song maps and a smoother listen

- Track character now follows a saved local audio map as well as live frequencies and genre/theme cues. Measured energy/texture chapters evolve related particle forms, detail and intensity smoothly. Phone graphics defaults, Sona timing and the live beat estimate are retained.
- Settings → **A smoother listen** adds optional loudness leveling toward −16 LUFS with true-peak headroom, preserving the song's dynamics. Optional **Skip silent edges** skips only measured beginning/end silence.
- **Behind the sound → Listening edit & song analysis** shows the song map and loudness. Save and preview start/end markers for spoken video intros/outros, use the silence suggestion, or reset. The original audio file is untouched; automatic spoken-passage detection is not included.
- **Library review** collects missing/uncertain details. Recording matches compare current/proposed fields; choose what to keep and undo the last metadata edit. Manual corrections remain protected.

New audio processing starts off. Saved gain and cuts run in the native player, including screen-off playback. Analysis runs one file at a time on the device. Linked-folder files can require a temporary copy, limited to 512 MB and available space, removed afterward. No audio is uploaded. Crossfade is currently a PC-only experiment.

Validation: 68 native unit tests pass, including the actual Media3 audio-buffer pipeline, plus Android build/lint and shared frontend tests. The APK's extracted frontend dependencies and retained signing certificate are checked before publication. This release has not been physically tested on an Android testing device.

Install this ARM64 APK **over the existing app**, without uninstalling. Music, playlists, settings and folder access are retained. Android requires system confirmation to install updates. [Simple download page](https://hynekro.github.io/resonance/).
