# New worlds for the visualizer

Development trial: **Windows 1.26.0-dev.1** and **Android 0.26.0-dev.1** (versionCode 67). The original Resonance direction stays the default.

Open **Visuals → Style** to try four new directions:

- **Noctiluca** — a luminous deep-sea organism with translucent tissue and flowing tendrils.
- **Glasshouse** — a composition of faceted glass spires, each listening to a different frequency range.
- **Orrery** — nested celestial rings with engraved scales and warm metallic light.
- **Contour** — a musical landscape drawn in ink on warm paper.

They share the existing musical analysis, cover colors, camera, reduced-motion behavior and frequency-light controls. Switching fades between compositions without restarting playback. The original simulation does not continue running invisibly behind another direction.

**Ribbon shape** now lets you keep a chosen form or let the song guide it automatically. Six new forms join the collection: Lorenz butterfly, Rössler current, Figure-eight knot, Cinquefoil weave, Hopf garland and Enneper flower. Möbius current and all existing forms are directly selectable too.

The visual review added material depth, quieter surrounding dust on intricate forms, wider selectors and stronger control contrast over the light Contour background. [Design and testing notes](https://github.com/HyneKro/resonance/blob/development/docs/VISUAL-ART-DIRECTIONS.md) describe the response and remaining trial considerations.

These releases are available only through the development update channel. Windows development installations can use **Restart & update**. Android requires the usual system installation confirmation; the signed APK updates the existing app and preserves its data. Do not uninstall to update. Ordinary releases and the live download page remain unchanged.

Physical Android-device, HDR-display and long-session thermal testing remain unverified; desktop GPU and phone-sized interface checks are not substitutes for those tests.

Verification: 475 JavaScript tests passed; 134 Android unit tests passed; Android lint reported no errors (nine existing warnings). The startup, rapid-skip, general interface and Constellation checks passed. Actual GPU checks covered all four directions, six new forms, frequency-light response, stable paused frames and graphics recovery. Isolated desktop/phone interface checks covered selection, persistence, reset and compact layout. Extracted ZIP/APK startup-module checks and a clean Windows welcome-screen launch passed. Android retains the existing package and signing identity.
