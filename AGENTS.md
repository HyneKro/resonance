# Resonance project instructions

## Standing release requirement

The owner requested on 2026-10-17 that every future application version be published on GitHub for **both Windows and Android**, so friends receive it through the in-app updater. Treat building, verifying and publishing both platforms as part of completing a new app release, unless the owner explicitly narrows that release's scope. Routine publication of tested releases to the public `HyneKro/resonance` repository is already authorized; do not ask for the same permission again.

- Finish and test the requested changes before releasing. Group intermediate edits into a completed release; do not publish every work-in-progress change.
- Apply relevant shared changes to both runtimes while preserving platform-specific behavior and mobile performance defaults.
- Increase each platform's version beyond its latest published version. Windows and Android have independent version numbers. Also increase Android's versionCode and retain the existing package ID and signing certificate so installation updates the existing app without uninstalling it.
- Build a clean Windows portable ZIP and an Android ARM64 APK. Run the applicable automated checks and build/lint checks described in [docs/SHARING.md](docs/SHARING.md) and [android/README.md](android/README.md). State any physical-device testing limitations accurately.
- Before publication, run `tests/frontend-assets.test.mjs` against the extracted distributables using `RESONANCE_TEST_APP_ROOT` (Windows `resources/app`) and `RESONANCE_TEST_ANDROID_ASSETS` (APK `assets/web`). Follow the complete startup module graph, including nested imports, rather than checking only top-level scripts. Verify that a clean, empty-library Windows installation reaches the welcome screen.
- Review and audit the source, then commit and push it. Publish the corresponding tested artifacts to GitHub Releases; a source push or a local build alone does not deliver an app update.
- Follow the exact platform tag and asset filename conventions in the sharing guide. Upload drafts first, compare the uploaded asset size and SHA-256 digest to the local artifact, then publish both releases. Set the Windows stable release as Latest; keep Android preview releases as prereleases with Latest disabled. Never replace a published version's binary with different contents.
- Verify unauthenticated release discovery and download access for both platforms, including that the updater selects the new version for an older installation and does not offer the current version again. Provide both published release links in the delivery message.
- The public download page is https://hynekro.github.io/resonance/. Release events refresh it automatically through `.github/workflows/download-page.yml`. Verify that deployment succeeds and both download buttons show the new versions before calling a release complete. Preserve this automatic refresh when modifying publishing tools; automation-created release events using GitHub's default GITHUB_TOKEN may require an explicit workflow dispatch.
- If a build, check or publication fails, resolve it when possible. Otherwise report the specific blocker and which platform remains unpublished; never claim both shipped or silently leave a release as a draft.

Documentation-only, download-page-only and project-instruction changes do not require new app versions or duplicate binary releases. This is a release workflow for future work, not a scheduled background publishing task.

## Protect existing installations and private data

- Preserve the approved local checkpoint, current music, playlists, settings and signing identity. Do not stop the owner's running music app merely to package a release; use the staging runtime when needed.
- Never commit or publish personal music, library databases, caches, local configuration, cookies, credentials, signing keys, local tool installations or a used portable folder's data. Share only clean distributable builds. Do not embed GitHub credentials in either app.
- Updates must preserve user data. Windows installation waits for the user's restart action; Android installation uses the system confirmation. Do not promise silent installation on Android.

See [docs/SHARING.md](docs/SHARING.md) for the current build, publishing and update process.
