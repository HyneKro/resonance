# Mascot appearances

Visuals → Extras → Mascot enables the companion. Appearance offers Sona and 29 guest characters. PC has a searchable menu; Android uses its native selection menu. The setting is saved locally, applies to the floating PC companion too, and its reset arrow restores Sona. The companion remains off by default.

Sona and every guest share seven active routines: side sway, head bob, wave, shoulder groove, cheer, soft bounce and a turn. The wide-legged two-step is retired. Sona retains her artwork and theme colours; guests retain their recognizable palettes and reviewed pose selections. Every appearance uses Sona's fixed timing, with up to 12 drawn poses per second and 24 canvas redraws per second. Each loop runs three complete times before changing. Song tempo and loudness do not speed up or stretch the sprites.

Click/tap to greet, hold or drag to pick up, then release to land. Existing keyboard placement, scroll volume and right-drag music gestures remain available. Only the selected atlas is loaded, and painting caches stay bounded. Failed or late image loads cannot erase or replace a newer selection. Invalid saved IDs fall back to Sona.

## Artwork and regeneration

Runtime assets are in `public/companions/` and mirrored in `android/shared/companions/`. Each guest atlas is a transparent 1920 × 1600 WebP containing 120 square 160-pixel cells. The first 96 cells contain eight twelve-pose source dances; the remaining 24 cells are interaction drawings. The retired two-step cells stay reserved so other frame IDs do not shift, but the controller never schedules them. Sona continues to use `sona-motions.webp`. The original Sona assets are unchanged.

The guest illustrations were made with the built-in image generation tool. The prompt set is in [artwork/mascot-prompts.json](artwork/mascot-prompts.json). Original generated PNGs and the local manifest are retained under `.private/companion-appearances/`, outside public source history. The four unsuccessful requests (Shrek, Gengar, Pikachu and Team Rocket Meowth) are not selectable or bundled.

The expanded motion prompts are in [artwork/mascot-motion-prompts.json](artwork/mascot-motion-prompts.json). The original guest assets remain in local `.private/mascot-motion-v2/baseline/` and the 1.14.0 Git history. New source PNGs and individual generation records are in `.private/mascot-motion-v2/`.

`scripts/pack-companion-motion.mjs <character-id>` registers the five source sheets into the expanded atlas. Set `RESONANCE_SHARP_PATH` to a local Sharp module when necessary. It finds transparent gutters between whole painted figures, rejects clipped/opaque cells and aligns their feet once. Neutral poses establish the common scale of each source sheet, so intentional crouches are preserved. It does not synthesize body parts, deform sprites or use optical-flow interpolation. Copy the resulting assets to Android after regenerating. Private source paths are not shipped. `scripts/pack-companion-appearances.mjs` remains available for the earlier 24-pose format.

## Verification

`tests/companion-appearances.test.mjs` covers bundled asset parity, preference persistence and validation, complete three-cycle routines and interaction states. `tests/mascot-ui-check.cjs` runs both real frontends in an isolated Electron profile, renders every pose, exercises selection/search/reset/persistence, checks late/failed image handling and writes a roster contact sheet. Android's native bridge is simulated in that UI test; it is not a physical-device performance test.
