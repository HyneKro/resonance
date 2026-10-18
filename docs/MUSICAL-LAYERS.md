# Musical layers and listening editions

## Visual response

The visual analyzer now estimates sustained and percussive energy separately across 48 frequency lanes. A short causal history and neighboring-frequency medians produce complementary masks. Sustained strands follow the harmonic estimate; smaller attacks and bright particles follow the percussive estimate. Existing low-frequency, rhythm, loudness and Track Character controls remain in place.

These are lightweight **visual approximations**, not isolated instrument stems. Voice/lead activity cannot reliably distinguish a singer from a synth or guitar occupying the same frequencies. The app does not generate vocals/drums/bass audio files, download separation models, upload audio, or alter playback samples. Dense mixes and sustained percussion can overlap between the estimates. This shared interface can support a more capable offline separator in a later version.

The temporal masks use bounded arrays and a 50 Hz history. Their visual envelopes have separate attack/release timing; both estimates travel through the existing Bluetooth visual-delay buffer. Music Only stops live visual analysis as before. The median-mask approach is informed by [harmonic-percussive separation](https://librosa.org/doc/main/auto_tutorials/03-advanced/plot_hprss.html), adapted here to a causal, compressed visual spectrum rather than audio reconstruction.

## Music Only

Listening editions combine the saved cover and optional researched artwork with static line compositions, typography and colors. Contour, pulse and orbit families are selected from genre and a repeatable track seed. The line drawing is decorative, not a claimed recording waveform. It is generated only when the track/artwork changes, with no canvas frame loop or continuously animated wallpaper. Small source images are kept at modest sizes instead of being enlarged across the whole screen.

## Sona

The revised generated sprite sheet retains 13 rows and eight poses per row. Headphone pieces, outfit and hair silhouette are kept consistent; the app's clef is applied to the visible earcup. Registration uses the feet as a stable anchor and one scale per routine, avoiding per-frame resizing. Hair follows quantized theme colors so tiny palette changes do not recreate every tinted frame.

Animation speed remains fixed, with a 12-pose-per-second ceiling, 24 redraws per second and three complete cycles before a routine change. No music-driven stretch, squash or acceleration has been reintroduced. Blink holds are matched to the new drawings. The prior Music Only sources and Sona artwork are retained in the owner's private design checkpoint, outside release cleanup; the preceding published app also remains available for rollback.

## Unavailable downloads

Only a genuinely unavailable original triggers a last-resort search. At most five public YouTube results are considered and at most two closely matching recordings attempted. Automatic candidates must match the known artist, title words, version indicators and duration. Unknown artist/duration, long mixes and ambiguous variants are left for manual review. A 403/format error alone does not trigger replacement. Rate limits, bot checks, temporary errors and connection/storage failures stop extra requests and preserve remaining work.

The replacement's actual video ID and source are saved, alongside the original playlist video ID, so later playlist checks recognize the saved replacement. Song details disclose the substitution. This cannot recover every unavailable recording or guarantee equivalence between uploads; no protected stream is bypassed and no alternate provider is scraped.
