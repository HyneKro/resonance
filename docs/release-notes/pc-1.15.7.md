# Resonance 1.15.7

Guest mascots now use Sona's animation timing, accents, interaction states and complete three-cycle dances. Their existing drawings are mapped to the same pose slots, replacing the separate speed settings and long reversing sequences that made their movements uneven.

- Waves keep a consistent raised hand, including corrections for Vi, Ekko and Naruto. Creeper keeps an armless sway.
- Pickup holds the suspended drawing until release; landing returns to the resting pose without flashing to standing mid-carry.
- Whole-sprite alignment uses stable face templates instead of following the changing outline of hands and hair. Sona's artwork, timing and approved offsets stay unchanged.
- The original artwork and previous animation setup are preserved locally for rollback. This update rearranges existing sprites; it does not introduce redrawn characters or synthetic in-between frames.

Validation: 357 JavaScript tests; all 30 appearances rendered with bounded caches and identical poses after cache eviction; desktop/mobile selection, reset and persistence checks; floating mascot rendering and media commands. Clean portable startup and packaged module-graph checks passed. Android receives the same animation modules.
