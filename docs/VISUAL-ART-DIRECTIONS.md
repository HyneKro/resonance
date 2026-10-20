# Visual art directions

Development trial for Windows 1.26.0-dev.1 and Android 0.26.0-dev.1. Open **Visuals → Style → Art direction**. Resonance remains the default; resetting this setting returns to it.

| Direction | Composition | Musical behavior |
| --- | --- | --- |
| Resonance | The original ribbon, living particles and flowing atmosphere | Existing response, track character and frequency lights |
| Noctiluca | Translucent bell, luminous tendrils and an underwater haze | Bass expands the bell, melodic envelopes illuminate the tendrils, percussion catches the tissue |
| Glasshouse | Thirteen faceted glass spires above an engraved floor | Separate spectral lanes lift the spires; percussion and high-frequency detail catch their edges |
| Orrery | Nested brass rings, graduations and a luminous center | Low notes expand the rings; different frequency ranges illuminate their scales |
| Contour | A floating terrain study in colored ink on warm paper | Broad energy lifts the landscape; melody and spectrum detail trace its cross-sections |

The directions share playback, musical analysis, cover colors, camera controls, reduced motion and frequency-light settings. They do not restart a song or request additional audio analysis. Their materials deliberately interpret those inputs differently. Contour uses subtractive ink rather than a white glow; its controls retain a dark backing for readability.

Switching fades out the current composition before revealing the next. Repeated choices settle on the last selection. A settings transfer includes the selected direction and ribbon shape; device-specific rendering quality remains local.

## Ribbon forms

In Resonance, **Ribbon shape** can remain **Automatic** or hold any of thirty forms across songs. Automatic still follows the saved track character and musical chapters. The existing Möbius current is now directly selectable.

Six additions extend the collection: **Lorenz butterfly, Rössler current, Figure-eight knot, Cinquefoil weave, Hopf garland, and Enneper flower**. These are musical sculptures inspired by the named mathematical forms, not scientific visualizations. The attractor trajectories are integrated once during preparation; live frames sample the cached curve on the GPU. Surrounding dust is quieter on these forms so their silhouette remains visible.

## Design review and safeguards

The first pass was rejected internally: three directions read as bright wireframes on black, and the crystal arches did not have a convincing silhouette. The second pass introduced translucent surfaces, distinct materials and composed backgrounds. Further review reduced clipped highlights, matched surface and ornament movement, improved the shape selector's width, and added dark control surfaces over Contour.

Review criteria are distinct art direction, readable composition, continuous motion, audible musical correspondence, safe switching, accessibility, and rendering cost. The requested 9.8/10 is a quality target, not a measurable guarantee or a claim of physical-device validation. This trial is intended for comparison against the original with a varied music library.

Automated checks exercise persisted settings, invalid values, reset behavior, rapid style changes, reduced-motion transitions, all thirty shape selections, all 900 shape transitions, deterministic bounded attractors, actual GPU output, silent frequency lights, paused-frame stability and graphics-context recovery. Isolated Windows and Android interface checks cover the selectors and compact phone layout. The full application regression, startup, queue and native Android checks are also required before publication.

Rendering uses the existing canvas and bloom buffers. Alternate directions skip the original particle births and flow simulation; the new analytic surfaces are small. Phone quality and adaptive resolution are unchanged. A desktop GPU benchmark at phone rendering resolution is useful for comparing paths, but does not establish battery life, thermal behavior or sustained frame rate on a physical phone.

## Trial checklist

- Compare a quiet acoustic recording, dense electronic music, vocals, and percussion.
- Switch directions while playing, paused and using desktop audio.
- Try the six new forms with the original camera and with the camera rail.
- Adjust Frequency lights intensity/contrast, then reset them.
- On Android, compare heat and smoothness with Resonance over a longer listening session.

The approved channel and website stay unchanged until this development batch is approved.
