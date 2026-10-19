# Resonance 1.21.0 — Follow the music through your sky

Constellation now draws your actual listening queue. A light travels along the connection from the playing star to the next using the song's playback position. The next four songs form a numbered path. Pause, seeking, shuffle, silent-edge edits and track changes stay tied to the player. Repeat-one shows progress around the current star.

- **Follow queue** gently frames the upcoming stars and follows queue changes. Dragging, panning or zooming returns camera control to you. The path's status button opens the upcoming list; selecting a queued song preserves the queue.
- **Follow your curiosity** offers nearby music, less-played discoveries and a different genre direction, with a short explanation for each. Play immediately or add a discovery next without interrupting the current song. Refresh for other choices; Explore also offers Surprise me. Suggestions use your local library and available sound profiles.
- Planned journeys have a separate dashed preview and a **See route in the sky** action. Playing a journey switches back to the live path. Queue connections stay in world space even when their endpoints leave the viewport.
- Queue labels take priority over genre labels while following. Search, artist links, navigation history and the overview remain available.
- **Visuals → Motion → Frequency lights** now has independent spectrum intensity and contrast controls. Defaults are intensity **1.50** and contrast **2.60**, increasing peak brightness and separating strong notes more clearly. Intensity 0 hides this layer; silence still emits no light.

## Verification and self-review

The focused review covers queue accuracy, timeline geometry, pause/seek/repeat behavior, discovery explanations, camera ownership, keyboard access, clean startup, responsive layouts and regression checks. Local 3,000-song rendering: approximately 60 FPS; live-path draw time 1.8 ms median / 2.6 ms p95 on this development PC. This is a local measurement, not a frame-rate guarantee for every machine.

Self-assessment: **9.5/10 for the exercised discovery flow**, a subjective implementation review rather than an independent rating. Remaining limits: recommendations depend on your metadata and saved analysis; dense or very short viewports may omit some floating labels to avoid overlap, with the complete upcoming list available from the path control. Physical Android performance and long-session battery use still need device testing.

The existing approved checkpoint, saved library and update behavior are preserved.

Release checks: **393 shared tests**, **124 Android unit tests**, both ABI builds and instrumentation-test compilation passed. Android lint: **0 errors**, 9 existing warnings. Both extracted distributables passed the full nested startup-module check. A clean, empty-library Windows extraction reached the welcome screen with no renderer errors. The isolated desktop/phone UI checks passed, including saved spectrum controls and native queue order. Repository audit: 672 files, no reported issues.
