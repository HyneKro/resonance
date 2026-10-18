# Mascots for your listening space

Visuals → Extras now has a Mascot switch and searchable Appearance menu. Keep Sona, or choose Hatsune Miku, Kirby, Frieren, 2B, Neco-Arc, Minecraft Creeper, Jinx, Vi, Jayce, Heimerdinger, Ekko, Son Goku, Tony Tony Chopper, Gojo, Rem, Sailor Moon, Totoro, Saitama, Asuka, Guts, Sasuke, Naruto, Monkey D. Luffy, Astro Boy, Megumin, Zero Two, Fern, Aang or Sung Jin Woo.

Each guest has illustrated listening and dancing loops, idle/blink, sleep, greeting, pickup, held and landing poses. Calm and energetic characters have different fixed animation pacing; loops play three full times before changing. Music does not accelerate or stretch them. Sona's original artwork, routines and theme colours are preserved; guests keep their own colours. The mascot remains off by default.

Your selection is saved locally, resets to Sona with its reset arrow, and follows you into the floating desktop companion with its music controls. Switching waits for the new artwork to load. Only the active atlas and bounded frame caches are held in memory. Sprite preparation now follows real gaps between poses to avoid clipped heads or neighboring-frame fragments.

Shrek, Gengar, Pikachu and Team Rocket Meowth are not included because their artwork could not be generated. No placeholders appear in the menu.

Validation: 298 automated tests; PC and Android frontend selection/search/reset/persistence checks; full atlas pose rendering and visual contact-sheet review; real visualizer pickup/move/drop; floating-window appearance and media-command checks. Both final distributables contain the tested assets and complete startup module graphs. A clean extracted Windows build reached the empty-library welcome screen. Android also passed 105 JVM tests, APK/device-test compilation and lint. Physical S22+ testing was not available. Existing music, settings and the approved checkpoint are preserved.
