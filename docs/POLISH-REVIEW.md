# Polish review — Windows 1.16.0 / Android 0.16.0-preview

## Assessment

**Before: 8.2/10. After: 9.1/10. Target: 9.9/10.** These are editorial product assessments, not measured scientific scores. The target has not been reached or claimed. The app has a distinctive visual identity and substantial functionality; predictable everyday interactions needed more attention than additional effects.

| Area | Before | After | Evidence and remaining criticism |
| --- | ---: | ---: | --- |
| Readability and navigation | 8.0 | 9.2 | Menus remain legible over cover artwork, long labels fit, empty results offer recovery, and closing Visuals returns keyboard focus. Very small desktop typography still merits wider accessibility testing. |
| Library and metadata | 8.0 | 8.8 | Save operations resist duplicate submission; newer edits and Back state survive asynchronous work. Automatic artist/genre matching remains imperfect; no unverified labels were invented to improve coverage. |
| Playback and reliability | 8.5 | 9.0 | Existing playback, queue, analysis, updater and data-protection regressions pass. This pass deliberately preserves audio gain and authored animation behavior. Physical output/headset and long screen-off tests remain necessary. |
| Visuals and performance | 8.6 | 9.0 | A 3,000-song local Constellation probe runs near 60 FPS. Exploring 1,000 artist labels no longer leaves an accumulating hidden DOM list. This does not prove every GPU, thermal state or large library behaves equally well. |
| Android ergonomics | 8.1 | 9.3 | Compact header, consistent SVG transport icons, reachable Queue, clearer sliders and a separate landscape player column. Actual touch events verify vertical scrolling does not alter EQ, horizontal dragging does, and Reset preserves focus/scroll. Physical-device verification is outstanding. |
| Release and recovery | 8.0 | 9.2 | Clean two-platform packaging, startup dependency checks and public update validation are release gates. A failed diagnostic test exposed fragile test-process logging; supervised file-backed logging prevents that failure from generating repeated native dialogs. |

## Changes made

- Raised the minimum opacity of reading panels and hid decorative record-sleeve text beneath menus. Cover colors and the visualizer remain intact.
- Improved desktop library text, action sizes, long-label containment and empty-library/search recovery.
- Preserved dirty form values, cursor selection, focus and scroll across status refreshes; clean fields still accept newly loaded information.
- Added busy feedback and duplicate-submit protection to metadata/playlist operations. Late responses do not close an unrelated panel. Notifications are bounded, deduplicated and shown above open dialogs.
- Reused only visible Constellation label controls, retaining a focused label until focus moves. Journey artwork, navigation, map data and mascot timing stay unchanged.
- Aligned phone transport icons, touch sizes and portrait/landscape spacing. Kept the existing deliberate sideways slider gesture.
- Replaced outdated README release histories with current getting-started instructions; detailed historical changes remain in Git and release notes.

## Verification

- 357 automated JavaScript regressions passed.
- 111 native Android unit tests passed; ARM64 and x86_64 builds and instrumentation-test compilation succeeded. Android lint: zero errors, nine existing warnings.
- An isolated 180-song fixture toured 50 PC/phone screens at desktop, compact desktop, 412px phone, 360px phone and landscape sizes. No audited container overflow, unnamed visible controls or browser console errors. This is a sampled layout audit, not a complete accessibility certification.
- 31 browser behavior assertions passed, including real metadata/playlist saves, navigation during a pending save, dirty-form preservation, reset behavior, real touch drags, bounded notifications and 1,000-group label churn.
- Restored startup checks verify the intended player is visible and the legacy player never flashes. GPU-context creation can still create a short startup task on this PC; zero-freeze startup on all drivers is not claimed.
- The performance probe measures overview, artist focus and journey rendering for 3,000 synthetic tracks. Results are local, short-session measurements; use `npm run test:polish` to repeat them with supervised test logging.
- Release checks additionally validate the complete frontend graph in the extracted ZIP/APK, a clean empty-library Windows welcome screen, Android signing identity, uploaded hashes, anonymous updater discovery and the public download page.

All fixtures are isolated from the owner's music and current installation. A test-runner EPIPE error caused the reported repeated dialogs during the initial audit; it was not a playback failure in the installed app. The runner now writes directly to persistent files and exits on unexpected errors.

## What would justify 9.9

1. A physical Android device matrix: screen-off listening, update over the previous APK, folder grants, Bluetooth/headset changes, downloads and interruption recovery.
2. Long listening sessions on at least an integrated-GPU Windows machine and the phone, including thermal throttling and repeated mode changes. A short 60 FPS sample is insufficient.
3. User review of difficult artist/genre/alternate-recording matches, with measured false-match rates rather than only a lower Unknown count.
4. A keyboard and assistive-technology audit, plus usability feedback from people who did not build the app.

The next pass should close these evidence gaps and fix concrete failures. More decoration alone would not earn the missing score.
