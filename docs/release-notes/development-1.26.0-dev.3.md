# Flux: a living spectrogram

Windows **1.26.0-dev.3** · Android **0.26.0-dev.3** (versionCode 69). Development channel only.

Choose **Visuals → Style → Art direction → Flux**. Resonance remains the default, and the five existing directions remain available.

Flux turns recent frequency history into a luminous landscape: flowing filaments, scattered debris, a mirrored undercurrent and fine digital columns. Low frequencies sit on the left and high frequencies on the right; older sound recedes into depth. Cover colors tint the material, while bright crests move toward pale light. The existing particle color and frequency-light controls remain available.

Bass lifts the main ridge, melody adds finer bends and percussion lifts debris. A short, fixed-size memory buffer reuses the existing audio analysis. There are no extra downloads, models or audio recordings. History stops while paused or frozen, clears for another song and never catches up through a long hidden-window gap. The phone uses fewer filaments and particles.

This is an artistic frequency display, not a calibrated analyzer. Automated graphics and compact-layout checks do not replace sustained testing on a physical Android device. The approved release channel and website remain unchanged.

## Verification

Passed 483 shared tests and 134 Android native tests. Android lint reports zero errors and nine existing warnings. Hidden desktop and phone-layout checks cover selecting all six directions, saving the setting and compact layouts. GPU checks cover frequency order, silence, independent musical roles, pause stability and graphics-context recovery. Both extracted startup module graphs pass, the clean Windows build reaches its welcome screen, and Android retains the existing package ID and signing identity.
