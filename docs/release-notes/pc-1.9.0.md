# Resonance 1.9.0 — A calmer Constellation

Listening modes and global navigation keep their positions when switching views. Desktop audio, Visuals and Immerse occupy the left contextual slot; Visualizer, Constellation and Music only sit in the middle; Library, Settings and Fullscreen stay on the right. Hidden contextual controls retain their space and are excluded from keyboard navigation. Smaller windows use a fixed second contextual row.

Constellation has one compact navigation strip and one translucent information rail. Search, genre exploration, journeys and map options replace the rail temporarily instead of stacking panels over each other. The playing song's details return when a tool closes. Artist and genre links, related songs, full Behind the sound details and journey options remain available. Map captions and group buttons share collision detection and stay outside interface regions.

The Milky Way uses a detailed baked texture with a display-resolution projection, without the focus blur or low-resolution moving projection on supported graphics. Three non-interactive layers of dot stars add real depth parallax when orbiting and panning. Rendering is capped for phones and stops when leaving the view; a CPU fallback remains available if WebGL is unavailable.

Constellation has its own preparation screen. Returning to Visualizer waits behind a neutral transition until graphics are ready, without showing Music only. A hidden loading spinner no longer changes mode-button widths.

Validation: 261 JavaScript tests, 95 Android JVM tests, Android build/lint checks, desktop and phone browser flows, clean Windows startup and extracted ZIP/APK startup dependencies. No physical S22+ test was performed. Existing music and preferences are preserved.
