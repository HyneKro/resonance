# Lyric timing and word highlighting

Open a song's **Behind the sound → Lyrics → Timing & word highlighting**.

- **Earlier / Later** moves that song's lyrics by 0.2 seconds. The adjustment is saved for the recording and also affects the Visualizer. Reset offset returns to zero.
- Provider word timing and enhanced LRC appear as a gradual fill across the current line. Seeking, pauses, instrumental blanks and Bluetooth visual delay use the playback clock. Missing word ends are not given invented durations.
- **Import lyrics** accepts text, LRC and Lyricsfile JSON/YAML, up to 256 KB. **Export timed lyrics** writes a portable Lyricsfile with the current adjustment included. Copy that file to Android and import it for the same recording. This is manual transfer, not library sync.
- **Restore original** removes local timing improvements and offsets without changing the original provider result.

## Optional Windows analysis

Choose **Download local tool · 200 MB** once, then **Check timing from audio** for an available recording under 20 minutes. The tool compares existing lyrics with locally recognized words. It can align untimed lyrics, correct a consistent recording offset, or add estimated word timing to clear lines.

The model is optional and stored in the app's data folder. Installation verifies fixed SHA-256 digests for the official whisper.cpp b5454 CPU package and multilingual small-q5_1 model. Audio stays on the computer. One job runs at a time in a separate, below-normal-priority process with at most two recognition threads. A bounded second pass tries to recover vocals initially classified as music. This is not zero-cost: a song can take several minutes, depending on the CPU and whether the second pass is needed. Cancel is available, and closing Resonance stops the work.

Results are proposals. Preview them against playback, then choose **Keep these timings**. Existing lyrics and words are never replaced by recognized text. Low-coverage or inconsistent matches are rejected; partial matches may enrich already timed lyrics only when distributed anchors agree with the existing timings. Changes to the file, imported lyrics or manual offset during analysis invalidate the proposal.

This is an experimental recognition-assisted alignment, not a guarantee of exact sung-word boundaries. Repeated choruses, backing vocals, dense mixes, languages and alternate versions can confuse it. Real-song testing included successful alignment and deliberately rejected uncertain results. The app does not manufacture complete timing from a weak match.

Songs with no known lyrics still need a provider result or a user import. Automatic transcription of missing lyrics is a later phase.

## Android

Android supports provider word timing, offsets, import/export and restoration. It performs no heavy recognition or audio decoding for this feature, protecting playback and Visualizer/Constellation performance. Native file I/O runs off the activity thread.

Dependencies and notices: the app's **Lyrics tool credits**, `public/licenses/`, and `android/web/licenses/`.
