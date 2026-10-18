# Mascot appearances

Visuals → Extras → Mascot enables the companion. Appearance offers Sona and 29 guest characters. PC has a searchable menu; Android uses its native selection menu. The setting is saved locally, applies to the floating PC companion too, and its reset arrow restores Sona. The companion remains off by default.

Sona retains her original artwork, theme colours and eight routines. Each guest has two illustrated eight-pose loops (listening and dancing), plus idle, blink, sleep, greeting, pickup, held and landing poses. Fixed per-character pacing gives calmer characters a slower sway and energetic characters a quicker dance. Each loop runs three complete times before changing. Song tempo and loudness do not speed up or stretch the sprites. Guest palettes retain their recognizable colours.

Click/tap to greet, hold or drag to pick up, then release to land. Existing keyboard placement, scroll volume and right-drag music gestures remain available. Only the selected atlas is loaded, and painting caches stay bounded. Failed or late image loads cannot erase or replace a newer selection. Invalid saved IDs fall back to Sona.

## Artwork and regeneration

Runtime assets are in `public/companions/` and mirrored in `android/shared/companions/`. Each is a transparent 640 × 960 WebP containing 24 square 160-pixel cells. Sona continues to use `sona-motions.webp`. The original Sona assets are unchanged.

The guest illustrations were made with the built-in image generation tool. The prompt set is in [artwork/mascot-prompts.json](artwork/mascot-prompts.json). Original generated PNGs and the local manifest are retained under `.private/companion-appearances/`, outside public source history. The four unsuccessful requests (Shrek, Gengar, Pikachu and Team Rocket Meowth) are not selectable or bundled.

`scripts/pack-companion-appearances.mjs` reads that local manifest. Set `RESONANCE_SHARP_PATH` to a local Sharp module when necessary. It finds gutters between whole painted figures, registers their feet once, retains one common scale per character and packs the atlas. It does not synthesize body parts or deform sprites. Copy the resulting assets to Android after regenerating. Source descriptions/paths in the private manifest are not shipped.

## Verification

`tests/companion-appearances.test.mjs` covers bundled asset parity, preference persistence and validation, complete three-cycle routines and interaction states. `tests/mascot-ui-check.cjs` runs both real frontends in an isolated Electron profile, renders every pose, exercises selection/search/reset/persistence, checks late/failed image handling and writes a roster contact sheet. Android's native bridge is simulated in that UI test; it is not a physical-device performance test.
