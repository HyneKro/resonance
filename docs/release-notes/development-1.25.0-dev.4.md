# Development preview: a quieter interface and layered artwork

Windows **1.25.0-dev.4** · Android **0.25.0-dev.4** (versionCode 61).

This is a development-channel update for testing. Approved installations and the public download page remain on their current versions.

## Changes

- Activity is a small icon that appears only while work is running. Open it for task counts and progress; a panel already open stays readable when the work finishes. Android now correctly finishes activity tracking after successful requests, errors and timeouts.
- Music only adapts to the space between the header and player without an internal scrollbar. Short layouts move listening stats into a background plane. Song titles, artists and the details action keep their foreground space; unusually long names shorten visually and remain available in song details.
- Artwork credits open in a separate panel instead of stretching the composition.
- Desktop parallax gives the cover, disc, surrounding pictures, print and background different travel distances and easing. Movement follows the pointer across the app, including menus. Reduced motion keeps the artwork still; phones retain a static composition.

## Try it

On Windows 1.25.0-dev.3 or Android 0.25.0-dev.3, use **Settings → App updates → Check for updates**, then the usual restart/install action. Android still asks for system installation confirmation. Earlier builds need the one-time development-channel ZIP/APK installation described in the development preview guide.

Try resizing Music only, using long titles with Large text, moving the pointer over menus, and opening Activity during a library task. Music, playlists and saved preferences are preserved.

## Verification

Automated shared regressions, Android unit/lint checks, desktop and phone layout previews, request-completion tests, independent parallax/reduced-motion checks, and extracted-distributable startup/module checks. Layout coverage includes short desktop windows, phone portrait and landscape, long names and enlarged text. Android previews are browser simulations; no physical-phone testing is claimed.
