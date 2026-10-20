# Resonance PC 1.23.0 — Lyric timing workshop

Open **Behind the sound → Lyrics → Timing & word highlighting**.

- Words fill progressively when the lyric source provides word timing, including enhanced LRC and Lyricsfile. Pauses, backward seeks, blanks and Bluetooth visual delay follow the playback clock.
- Move a song's lyrics earlier or later, reset the offset, and import/export timed lyrics. Originals remain available through Restore original.
- An optional 200 MB Windows tool compares known lyrics against the local audio. It proposes recording-offset corrections, untimed-line alignment and estimated word timing. Preview the result before keeping it.
- Analysis runs one song at a time in a separate process, at below-normal priority with two recognition threads. It is cancellable, capped at recordings under 20 minutes, and never uploads audio. Android can import its exported timing.
- Uncertain matches are rejected. Partial recognition may enrich clear lines while retaining existing timing. File, lyric or offset changes invalidate stale proposals.

This is experimental recognition-assisted alignment. Singing and backing vocals remain difficult; it does not guarantee accurate timing for every song, and it does not yet transcribe songs with no known lyrics. The larger recognition model tested was too expensive for its limited improvement, so it is not bundled.

Validation: 427 JavaScript tests and 128 Android unit tests passed; desktop/phone UI checks covered highlighting, seeks, offsets, saved-state restoration and compact layouts. The actual optional-tool download/extraction and hashes passed. A real 4m39s song produced a proposal in 114 seconds with 85.6% matched words and 13 lines of word highlighting; a difficult recording was rejected after the bounded second pass. These samples are not a broad accuracy benchmark. Both extracted distributables passed the complete frontend dependency check; a clean Windows installation reached the welcome screen without renderer errors. Android build/lint passed with existing warnings. No physical S22+ testing was performed.
