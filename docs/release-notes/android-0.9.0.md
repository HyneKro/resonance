# Resonance Android 0.9.0 preview — A calmer Constellation

Listening-mode buttons stay in place, with contextual Visualizer controls hidden without moving navigation. Constellation uses a compact toolbar and a single information area: search, genre exploration, journeys and map options appear one at a time. Closing a tool restores the song details. Captions and group labels avoid each other and the controls; Explore keeps all genre groups accessible when labels are crowded.

The sky has a sharper Milky Way projection, no focus blur and three non-interactive dot-star layers with depth parallax. Phone texture resolution and star counts are lower than desktop; rendering stops outside Constellation. Opening the map and returning to Visualizer have their own loading feedback, without briefly displaying Music only.

Validation: 261 shared JavaScript tests, 95 Android JVM tests, build/lint, phone-layout browser flow with a simulated native bridge, and extracted APK startup dependency checks. Physical S22+ testing remains necessary.

ARM64, package `music.resonance.mobile`, versionCode 27, unchanged signing certificate. Install over the existing app to keep music and settings.
