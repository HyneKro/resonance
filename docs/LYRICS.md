# Lyrics and word highlighting

Resonance keeps its existing lyrics lookup, embedded/sidecar lyrics, saved results, and the Lyrics button in Visualizer. Timed lyrics animate with playback; text-only lyrics remain readable in Behind the sound. Availability and timing accuracy depend on the recording and source.

When actual word timestamps include start and end times, each word fills smoothly from left to right as it is sung. The fill follows the playback position, including pause, seek, playback speed, per-song offset and Bluetooth visual delay. It stops rendering when Dynamic Lyrics is hidden. Line-only lyrics stay unfilled: line durations are never used to invent word timestamps. Word-start-only timestamps light words at their onset without inventing their duration.

Behind the sound → Lyrics timing shows which timing is available. Earlier/Later adjusts the saved offset for this song; Reset offset and Restore original remain available. Timed lyrics can be imported or exported as local files. Existing supported LRC, enhanced LRC, JSON and YAML formats are preserved.

The optional audio-analysis/model-download tool has been removed. Resonance no longer downloads a recognition model, transcribes recordings or generates timing proposals. Already-saved lyrics and accepted word timings remain usable. Previously downloaded model files in personal app data are left untouched and unused.

Both PC and Android use the same highlight renderer. The frame loop updates only visible timed words and uses the player's clock; there is no background audio-analysis job. Android's native player supplies its playback position, with the existing visual-sync compensation.
