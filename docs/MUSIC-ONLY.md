# Music only — the listening edition

Music only is a cover-led listening screen on Windows and Android. The existing playback dock and top-level navigation remain in their usual places. The artwork is decorative; playback stays in the dock, and Behind the sound opens song details. Windows also previews the next queued song and opens the queue.

Four print treatments follow existing genre metadata: a spectral geometric composition for electronic/general music, a paper sleeve and serif typography for jazz/acoustic/classical, bold poster typography for rock/metal, and a lunar composition for ambient/cinematic music. Cover colors, the artist name, album and year personalize the composition. Missing metadata stays absent. These are designed compositions around available artwork, not generated artist photographs or claimed bespoke paintings for every song.

The main cover is kept intact; wide and square artwork get different frame proportions. Every supporting image is a crop of that same cover. No supplementary artist photographs, adjacent album covers or online artwork searches are used. Small phones switch to a compact horizontal layout. Long titles wrap, then shorten visually when needed; full titles remain in song details. Decorative statistics move into a background plane on short screens, keeping the player and actions reachable without a scrolling composition.

On Windows, slow CSS compositor animations drift each artwork plane at a different speed and depth. There is no mouse tracking, JavaScript frame loop, WebGL renderer, new sound analysis or remote font. Motion pauses when hidden or outside Music only, and both system and app reduced-motion preferences keep the composition still. Android retains the still composition to preserve its performance defaults. The visualizer remains suspended in Music only.

The previous Music only design is recoverable from `pc-v1.23.5` / `android-v0.23.5-preview` and source commit `230aba1e999671174084f79d867bb0785a092ef0`. The approved checkpoint is unchanged.

## Design review

The initial pass had excessive framing around landscape covers and clipped content on compact phones. The revised frame follows artwork proportions, uses measured header/player bounds, and switches small phones to a compact layout. The final checks cover 1600/1280/1024 desktop widths, 412/360 phone widths, short screens and landscape, missing artwork, long titles, empty libraries, details/queue actions and cover-only image sources and automatic/reduced motion.

Remaining limits: style selection depends on genre metadata; a low-resolution or generic video thumbnail cannot become high-quality album art. Automatic artwork composition does not replace a human-made artwork for every recording. Browser layout checks do not establish real-device battery use or typography preferences. Listening feedback remains an important part of the design review.
