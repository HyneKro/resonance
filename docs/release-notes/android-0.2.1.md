Resonance Android 0.2.1-preview — steadier listening

- Loudness leveling uses one saved gain per play. A newly finished analysis waits for the next play, avoiding a mid-song volume change. Explicit toggles still apply smoothly. Frequency analysis is taken before leveling, so the visuals retain their musical response.
- Track Character smoothly blends saved analysis through track changes and seeks. Chapter changes wait for scrubbing to settle, and background deformation is more restrained.
- The player timeline marks skipped intros and outros with hatching and exact time ranges. Saved listening edits take priority over automatic silent-edge skipping.

Install over the existing app to keep downloads, playlists and settings. ARM64 build. Package identity and signing certificate are unchanged.

Validation: native unit tests and Android lint/build; shared regression tests; phone-layout browser preview and packaged asset-graph checks. This build has not been tested on a physical Android device. Crossfade remains PC-only.
