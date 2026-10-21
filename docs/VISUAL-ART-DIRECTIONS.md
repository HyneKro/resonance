# Visual art directions

Development trial for Windows 1.26.0-dev.4 and Android 0.26.0-dev.4. Open **Visuals → Style → Art direction**. Resonance remains the default; resetting the setting returns to it.

| Direction | Composition | Musical behavior |
| --- | --- | --- |
| Resonance | The original living ribbon and flowing atmosphere | Existing track character, phrasing and frequency lights |
| Noctiluca | A central reflective fish flock, gliding mantas, sharks and luminous jellyfish, surface rays and rising bubbles | Smoothly integrated swimming speed; bass opens bells and wings; melody lights tendrils and bodies; percussion accents fish and plankton |
| Afterglow | An endless neon highway between three-dimensional mountain grids, under a striped sunset and layered skyline | Bass raises broad terrain ridges, melody adds smaller ripples; percussion stretches buildings; spectrum lanes illuminate windows and passing roadside markers |
| Orrery | A brass astronomical instrument, rotating clockwork, tilted orbital rings, planets, asteroids and comets | Bass expands orbits and the central body; melody tilts planes and lights comet tails; percussion catches the belt and metal |
| Contour | Textured paper, four intersecting brush circles, a vermilion center and fine contour echoes | Bass opens the geometric form; melody shifts the intersections and traces fine contours; percussion changes brush pressure and scatters restrained ink accents |
| Flux | Luminous spectral filaments, a receding history sheet, current-borne debris and fine digital columns | Frequency increases from left to right; recent samples recede in depth. Bass lifts the ridge, melody bends fine filaments and percussion lifts debris. |

| Aerial | A pale studio with porcelain, pearl, polished metal and frosted glass spheres, soft shadows and an asymmetric scale hierarchy | Bass changes buoyancy, percussion imparts small impulses, and melody shifts the drift and surface light. Larger spheres have greater inertia. |

Aerial has a bounded physical world of 24 spheres on desktop and 16 on mobile. Fixed steps and interpolated positions keep movement consistent across display refresh rates. Slow changes in weight bring floating and settling phases; collisions transfer motion according to size. Inactive scenes suspend their simulation, long gaps are discarded, and frozen or reduced-motion clocks hold the positions still. Analytic surfaces keep the silhouettes round without dense meshes. The glass material is stylized frosted transmission, not a full refraction simulation. The original reference guided the warm studio, soft lighting and broad negative space.

Flux keeps approximately 4.2 seconds of the existing 48-band analysis in a 6 KB memory buffer. It is an artistic spectrogram, not a calibrated measurement display. No audio is recorded or uploaded, and no model is installed. History stops while paused or frozen, clears for a different song, and does no hidden catch-up. Silence drains the existing trail instead of inventing new peaks. Reduced motion holds the history and flowing motion still. Mobile uses fewer traces and particles; the existing adaptive resolution remains in place.

Afterglow replaces Glasshouse. A saved Glasshouse selection opens Afterglow automatically. No artwork or additional audio analysis is downloaded. The aquarium uses local boid separation, alignment and cohesion for its central school; larger animals follow continuous procedural paths. It is a stylized scene rather than a biological simulation.

The directions share playback, musical analysis, cover colors, reduced motion and frequency-light settings. Materials interpret those inputs differently: Contour absorbs light as ink; the neon drive remaps artwork colors toward saturated neon. Scenic backgrounds stay composed while the existing camera moves the foreground geometry.

Switching fades out the current composition before revealing the next. Repeated choices settle on the last selection. A settings transfer includes the selected art direction; device-specific rendering quality remains local.

## Automatic ribbon forms

The manual Ribbon shape picker has been removed on both platforms. Old manual choices are discarded on loading settings. Shapes continue to follow saved track character and musical chapters, including **Lorenz butterfly, Rössler current, Figure-eight knot, Cinquefoil weave, Hopf garland, and Enneper flower**, alongside the existing Möbius current and other forms.

These are musical sculptures inspired by mathematical forms, not scientific visualizations. Attractor trajectories are integrated once during preparation; live frames sample the cached curves on the GPU.

## Review and safeguards

The owner judged the first four alternatives substantially below the original. That feedback supersedes the earlier optimistic assessment. This revision changes the scene concepts, geometry and musical behavior rather than simply adjusting brightness. Internal render reviews corrected closed manta-wing tips, excessive comet highlights, correlated ink-drop trails and overly regular aquarium placement. The owner’s later geometric reference redirected Contour toward intersecting circles, open paper and a red center, replacing the literal landscape and bamboo. Later brush references inform pressure variations, bristle trails and pale edge washes. Orrery adds engraved metal bands, smooth planetary shading and fine astronomical drafting.

Review criteria are distinct art direction, recognizable silhouettes, layered composition, continuous motion, musical correspondence, safe switching, accessibility and rendering cost. A target rating is not evidence of artistic parity with Resonance. The remaining artistic judgment needs listening across varied recordings, particularly creature movement and whether the geometric Contour composition stays expressive during quieter passages.

Automated checks cover saved-style migration, removal of manual shape choices, rapid switching, reduced motion, continuous travel under changing envelopes, all automatic forms, actual GPU output, independent bass/melody/percussion responses, zero frequency-light input, fixed-frame stability and graphics-context recovery. Isolated Windows and Android interface checks cover persistence, keyboard focus and compact layouts. Full application regression, startup, queue and native Android checks are required before publication.

Rendering reuses the existing canvas and bloom pipeline. Alternate scenes skip the original particle birth/flow simulation. The aquarium has 384 schooling fish on desktop and 160 on mobile, with three mantas, two sharks and four jellyfish. The flock uses fixed steps and interpolated positions, with a spatial grid for local neighbours and reusable storage. Inactive scenes do not simulate hidden fish or catch up after a long pause. Surfaces are bounded analytic meshes with shared depth testing. Motion clocks integrate changes in speed instead of multiplying absolute time by changing audio envelopes, avoiding position jumps on attacks.

Phone quality and adaptive resolution are unchanged. Desktop GPU measurements at phone rendering resolution compare paths but do not establish battery use, heat or sustained frame rate on a physical phone.

## Trial checklist

- Compare quiet acoustic music, dense electronic music, vocals and percussion.
- Watch silhouettes and continuity for several minutes, including quiet-to-loud transitions.
- Switch directions while playing, paused and using desktop audio.
- Adjust Frequency lights intensity/contrast, then reset them.
- Check controls, lyrics and overlays against the pale paper scene.
- On Android, compare sustained smoothness and heat with Resonance.

The approved channel and website remain unchanged until this development batch is approved.
