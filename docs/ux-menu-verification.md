# Menu overhaul verification · PC 1.3.0 / Android 0.3.0

## Scope

Settings are grouped by task, with matching names on both platforms. Existing preferences, playback, sources, downloads and visual algorithms are retained. Navigation stores the previous controls rather than rebuilding unfinished forms. The trail is bounded to twelve panels and is discarded on close.

## Checks completed

- 218 JavaScript tests, including actual-path Back navigation, redraws, ancestor returns, distinct song contexts and bounded history.
- Android build, instrumented test compilation, 74 JVM tests and lint (0 errors, 17 warnings). The ARM64 APK has versionCode 19 and the same signing certificate as 0.2.3.
- Both extracted distributables pass the complete startup dependency graph checks. The clean extracted Windows build reaches the empty-library welcome and Add music choices.
- Desktop: Settings categories, visual tabs, playback/audio sync, song details/lyrics/listening edit, Add music and nested Back. Update controls mount in their new destination with a simulated desktop bridge.
- Android at 412 CSS pixels: Settings, audio sync, storage, update controls, visual groups, library search, song details, queue/history and Add music → playlist setup. Returning from Add to playlist preserves the selected Edit details tab and an unfinished album field.
- Mobile Reset view and Reset Rail speed keep the scrolled Motion tab in place; exact values (1.21 / 0.81 / 2.55 / 2.22) match their controls.
- Direct desktop and mobile previews report no application console errors. The iframe preview harness intermittently reported a browser observation error on reload; this did not recur in the direct mobile preview.

## Limits

Browser previews use isolated library data and simulated native actions. No physical Android device was available; notification playback, OS folder pickers and APK installation were not exercised on a phone. Native playback and download code is unchanged in this release.
