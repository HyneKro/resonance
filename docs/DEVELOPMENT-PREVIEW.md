# Development preview: discovery and personal setup

This batch is on `development` for testing through a separate development update channel. It is **not an approved live release**. Windows is `1.25.0-dev.3`; Android is `0.25.0-dev.3` (versionCode 60). Regular installations and the main download page stay on the approved versions.

## What to try

1. **Constellation:** the Follow queue / progress controls sit at the top center, with their help text on its own line. Start a queue, enter the map and choose Follow queue. Playing and upcoming labels have stronger contrast; genre, artist and song labels have distinct shapes and category badges. The current link has a brighter progress trace. Song captions are keyboard buttons, and the details panel has fewer competing recommendations.
2. **Settings → Accessibility:** try Comfortable (115%) and Large (130%), then stronger secondary text. The size setting changes interface text, not the visualizer's drawing resolution. Large text and stronger contrast give dialogs a darker backing. Check long titles, portrait/landscape and the screens you use most. Tab/Shift+Tab navigate, Enter/Space activate, arrows change tab sections, and Escape closes or returns. Constellation also offers arrow-key rotation, Shift+arrow panning, +/- zoom and Home.
3. **Music only:** compare several artists and genres. Each recording gets a repeatable composition within its genre family, with different framing, placement and typography. Related local covers can appear in the collage. On desktop, available cached artist/release artwork adds extra layers with source credits; no unrelated photographs are invented. Desktop pointer movement anywhere in the app, including over menus, adds slight depth. The cover is artwork only; use the player for playback. A printed listening ledger shows real play count, listening time and track length. The reduced-motion preference disables the parallax. Phones keep a still composition and use local covers, with no extra image downloading or motion loop.
4. **Library → Smart collections:** Still to discover, Favorites rediscovered, Fresh arrivals and A little interlude are already available and fill themselves from the library. Browse their songs or play all. They live in the library, with no settings entry. You can also create a custom collection from a template, change its rules and preview the matches. Rules combine with AND. Supported rules include genre, artist, keywords, favorites, never played, recently added, not played recently and maximum duration. Empty fields impose no restriction. Play evaluates the current library again; it does not copy files. Saved collections also appear in Constellation's collection selector.
5. **Settings → Transfer settings:** export a file, then import it into a separate installation. Review the counts before applying. Try a second import to confirm that identical edits are skipped. Reconnect playlist links to a destination on the receiving device, then use Playlist downloads.
6. **Activity:** a small header button shows how many background tasks are running, including inside menus. Open it for scans, playlist checks/downloads, artist and genre lookups, artwork, sound analysis and lyrics. Known totals show progress and remaining counts; unknown totals use an indeterminate bar. This does not start a bulk download or lyric search. Lyrics are checked for selected songs. A completed lookup does not imply a match was found.
7. **Listening defaults:** new installations enable loudness leveling and skip silent edges. Existing saved choices remain unchanged. Menu notifications now remain inside the dialog and blank notices are ignored.

## Transfer scope and safeguards

The versioned JSON contains shared playback/visual/accessibility preferences, EQ, smart-collection definitions, online playlist links, favorites, manually chosen metadata, saved start/end cuts and lyric offsets. It does not contain audio, artwork, measured audio profiles, lyrics text, credentials, cookies, device identifiers or local filesystem paths. Device-specific output delay, display performance and floating-window placement remain local.

The file still reveals song names, preferences and playlist links. Treat it as a private personal file; do not commit it to the repository.

Recordings are matched by provider identity and compatible duration. Without a provider identity, matching requires a unique title/artist match with compatible duration. Different uploads and ambiguous duplicates remain pending. Existing custom song edits are protected unless the import preview's replacement option is explicitly selected. Unrelated data stays in place. Metadata changes can be undone individually from the song's details.

Pending edits persist across restart and are checked when recordings are added. The transfer screen also has **Check matches now**. A playlist link is retained until it is connected on this device; importing does not begin downloading music. Imported smart collections merge by their saved IDs. The file limit is 8 MB, 20,000 song entries and 200 playlist links.

This first iteration does not move audio files, local folder connections, playback history, the active queue, or manually assembled local playlists. There is no background device-to-device connection. It transfers the listening cuts currently supported by Resonance; it does not add an interior mute-region editor.

## Test installation

Install this channel-aware build once manually. In an existing Windows dev installation, use Settings → App updates → **Install a downloaded ZIP…**. Android users can install the APK over the current app. Future dev builds arrive through the normal updater; the update screen identifies the Development channel. Switching back to the approved channel requires manually installing a later approved build.

Extract the Windows development ZIP into its own folder. It starts with a separate, empty portable data folder. Keep the ordinary installation intact; do not extract this preview over it. Import a settings export and connect music folders if you want to try your own collection.

The Android APK retains the existing package ID and signing certificate. Installing it **updates the installed app**, preserving its data; it is not a side-by-side installation. The next approved APK must use a versionCode above 60. Do not uninstall to return to a release, since uninstalling removes private app data.

Automated checks and desktop simulations do not establish physical-phone performance, Android file-picker behavior or screen-reader usability. Those still need device testing before release approval.
