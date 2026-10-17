# Resonance PC 1.2.2

Track Character now selects each song's saved identity and opening chapter together. The outgoing scene remains stable while that lookup finishes; late artwork or metadata cannot reshuffle the current song. First-time audio analysis gradually adds energy and texture, keeping the initial silhouette until a real chapter change. Seeking still settles into the destination chapter smoothly.

Includes the 1.2.1 loudness fix: a measured song starts at its saved gain, and analysis finishing during playback cannot change its level. Unmeasured songs retain their original level for that listen. Silence markers, listening edits, crossfade and the analysis-before-gain audio response are preserved.

**Windows update repair:** the previous helper launch could exit silently without applying the downloaded update. The new launcher confirms that an independent hidden helper is running before the app exits, bypasses the normal window-close delay after saving playback, verifies the installed version, and opens the updated app automatically. Startup failures are reported before closing the app.

If Restart & update on 1.2.0 or 1.2.1 leaves the old version running, close Resonance and extract this complete portable ZIP over the existing installation once. Keep the existing `data` folder; do not delete or uninstall the old folder. Later in-app updates use the repaired launcher. A fresh installation can simply extract the ZIP into a new folder.

Validation: automated source regressions, offline Web Audio first-sample gain checks through actual controller handoffs in both playback modes, 832 rendered transition frames, and Windows helper launch/install/relaunch tests with data preservation and rollback. The clean extracted release's startup module graph and empty-library welcome screen are checked before publication. The rendered test uses synthetic audio features; this is not a guarantee for every recording or graphics device.
