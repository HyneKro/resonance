# Constellation

Constellation is a listening mode alongside Visualizer and Music only. Select it from the main mode switch; the ordinary player remains available. Switching back restores the chosen listening view directly. The normal visualizer and scene mascot are suspended while the map is active.

## Explore and play

Each available local song is a star in a perspective-projected 3D map. Tap a song star to play immediately. A song already on the upcoming path keeps the queue; another star starts a selection with related songs behind it. The details panel follows the playing song and offers artist/genre navigation, recording details and discovery suggestions.

On PC, drag to orbit, right-drag to pan and scroll to zoom, including over map markers. Mobile uses touch gestures. Genre and artist markers focus a group; All music returns to the overview. The breadcrumb trail and Back/Forward buttons preserve navigation history. Find playing restores the current song's hierarchy. Search offers direct access to matching songs. Keyboard navigation is available; decorative background stars are not interactive songs.

Genre families form colored regions, while artist credits drive artist connections. Unknown genres remain unknown. Floating labels stay anchored to their stars; dense views can omit some labels for readability. The details panel and search remain alternatives to selecting a small star.

## The listening path

The live path represents the actual upcoming queue, including its current ordering. Numbered stars mark upcoming songs; light travels along the link from the playing song toward the next. Progress follows playback time, including pause and seeking. With no next song, the progress indication stays at the current star.

Follow queue frames the path. Manual camera input stops following so exploration retains control. The upcoming panel offers a readable list and queue actions. Discovery suggestions explain their available clues and can be played now or inserted next. These are local collection recommendations, not access to a streaming catalogue.

## Journeys

Choose a starting song, optional destination and up to five pinned stops, an approximate duration, a direction and Familiar ↔ Explore balance. Build journey produces a preview from available local songs, avoiding duplicates. The requested length is approximate because songs are kept whole.

Review the route, reorder songs, remove them or choose alternatives. Pinned stops are protected from automatic replacement. Changed criteria require a rebuild. Play now starts at the first song; Play after current replaces the upcoming queue while preserving playback position and state. These actions are at the top of the preview. Shuffle and repeat-one are disabled for the journey. Save the result as an ordinary playlist if wanted.

## Data and performance

Genre, artist and saved sound-profile clues influence placement and relationships. Measurements describe energy and texture; they do not identify every instrument or prove a genre or mood. Catalogue estimates remain labeled. Personal corrections take priority. The map menu includes missing-genre research and sound-data preparation; no audio is uploaded by local analysis.

Preparation processes one file at a time and stops requesting work when the view closes or preparation pauses. On Android, bulk sound preparation requires a connected charger. Refine map can rebuild positions from updated data. Saved positions are local; bookmarks are no longer exposed as a user navigation feature.

The scene uses perspective-projected 3D coordinates, cached textures, depth-aware picking and bounded draw work. Mobile uses reduced detail and frame-rate defaults. Hidden maps stop their animation; Android also suspends the main visualizer's analysis polling. No extra audio decoder is created to browse the map.

## Verification

Automated checks cover projection, queue progression, artist links, navigation, anchored labels, gestures, journeys, responsive layouts, disposal and large synthetic collections. Local timings and browser fixtures are not physical-device performance guarantees. See the relevant [release notes](release-notes/) and the illustrated [feature guide](https://hynekro.github.io/resonance/guide.html#constellation).
