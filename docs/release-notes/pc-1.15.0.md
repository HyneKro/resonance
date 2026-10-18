# Resonance 1.15.0 · More life for every mascot

Every guest mascot now has eight dance and listening routines instead of two, with twelve illustrated poses per loop. Idle, sleep, greetings, pickup, carrying and landing also have additional drawings. Sona keeps her established artwork and animations.

The sprite player presents up to twelve drawn poses per second, with 24 Hz redraws for carrying and small movements. Each routine completes three loops before switching, and music tempo or loudness never accelerates or stretches the character. Your selected appearance and placement are retained, including the floating desktop companion.

The previous artwork is preserved in source history and a local design backup. Only the chosen character is decoded; frame and painting caches remain bounded.

Validation: 299 automated tests pass. All 30 appearances were rendered in the PC and mobile layouts, including every guest pose, selection/reset/persistence and delayed or failed image loads. Floating desktop controls pass. The extracted Windows and Android startup module graphs pass, and a clean Windows installation reaches the empty-library welcome screen without console errors. Android's 105 JVM tests and lint pass (9 warnings, no errors). Physical S22+ animation performance has not been tested.
