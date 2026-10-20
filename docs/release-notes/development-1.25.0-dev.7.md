# Development preview: reliable rapid Play/Pause

Windows 1.25.0-dev.7 · Android 0.25.0-dev.7 (versionCode 64).

- Rapid Play/Pause no longer shows Chromium's interrupted-play error or its Google help link. Pause cancels the previous playback intent immediately, including when the audio is still starting.
- An older Play request finishing or failing cannot reset the controls after a newer action. Windows media controls use the same cancellation path; a repeated system Play command does not cancel an already pending start.
- Genuine playback problems still receive a short explanation. Unavailable audio retains the existing queue recovery. Android keeps its native playback behavior.

The regression check uses a 2,600-song synthetic library, real Chromium Play/Pause interruptions, delayed media promises, rapid skips, loudness preparation and recovery from actual playback failure categories.

Validation passed: 464 JavaScript tests, 134 Android unit tests, Android lint/build, desktop and phone-layout checks, both extracted startup module graphs, and a clean Windows welcome-screen launch. The Android signing certificate is unchanged. No physical-phone test was performed.

These are development prereleases for testing. The approved main branch, ordinary updater channel and public download buttons are unchanged. Automated checks do not replace testing on a physical Android device.
