# Resonance 1.15.3 · Mascot movement cleanup

All 29 guest appearances have reviewed dance sequences: clearer steps, waves and turns, fewer stray blinks, and returns through the approach poses instead of sudden direction changes. Frame holds now use whole presentation ticks, retaining each character's overall pace when unsuitable drawings are removed. Measured horizontal alignment reduces the sideways jumps caused by registering drawings against a lifted foot.

Guest greetings and idle blinks are shorter and more deliberate. Pickup settles into a suspended pose instead of flashing back to standing; landing begins from that same suspended drawing. Sona's shoulder groove and sway have been cleaned up while retaining her other approved dance sequences. Designs and source artwork are preserved, with a private backup of the previous animation setup.

Animations retain constant speed, unchanged proportions and at least three complete cycles before switching routines. The same fixes apply to the floating desktop mascot. This is a pose-order, timing and alignment cleanup, not a newly drawn set of sprites.

Validation: all 328 JavaScript tests pass, including full reviewed sequences at 24/120 Hz, irregular presentation intervals, three-cycle changes, pickup/landing continuity, brief blinks and matching Android assets. All 30 appearances render without silhouette clipping; isolated PC/mobile picker, persistence, reset, carry and floating-window controls pass. Clean portable startup and both extracted distribution module graphs pass. Android device performance was not physically tested.
