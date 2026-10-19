# Windows 1.16.0 — everyday polish

- Clearer reading panels, library typography and long-title layouts; decorative music-only text no longer competes with menus.
- Empty searches offer a way back. An unavailable library offers source recovery rather than pretending the collection is empty.
- Back, refresh and reset preserve your place. Metadata edits keep their text and cursor while background work finishes; repeated saves submit once, with visible progress.
- Notifications remain visible inside dialogs and repeated messages are combined. Late playlist operations no longer close another menu.
- Constellation releases unused label buttons while exploring, avoiding growth over long sessions. Existing music, visual effects and authored mascot motions are preserved.
- Updated help and setup documentation. The isolated polish runner's closed-pipe error is fixed; it no longer generates repeated Electron dialogs.

Validation: 357 regression tests, 50 PC/phone screen previews, 31 behavior checks, restored-session startup and a 3,000-song Constellation probe. Clean portable startup and the complete packaged frontend dependency graph were checked. Android is released alongside this version. Physical Android and multi-hour tests on other hardware remain outstanding; see docs/POLISH-REVIEW.md for the candid 9.1/10 assessment.

Install through Restart & update, or extract the full portable ZIP. Keep your existing data folder. No uninstall is needed.
