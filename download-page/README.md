# Public download page

Share **https://hynekro.github.io/resonance/**. The two buttons download the latest published Windows ZIP and Android APK directly from GitHub Releases, without a GitHub account.

## Automatic updates

The `Publish download page` Actions workflow runs on release publication/edit/removal, relevant source changes on `main`, and manual dispatch. It reads the complete release list and uses the same version and asset validation as the Windows updater, separately for PC and Android. Preview releases are included for Android only. It checks out `main` explicitly so a release pointing at an older app tag cannot restore old website source.

After tests pass, the build writes ordinary HTML, CSS, the existing app icon and a small `downloads.json` manifest into ignored `download-page/dist/`. GitHub Pages receives only that directory, not the repository or any music. The page works with JavaScript disabled, avoids per-visitor GitHub API limits and makes no analytics requests. Version links refresh after the deployment completes, normally within a few minutes of a release.

If fetching releases fails or either platform has no valid release asset, the build fails and leaves the previous website intact. Check the workflow result as part of publishing each app release. For releases created with the default Actions `GITHUB_TOKEN`, explicitly dispatch this workflow if GitHub suppresses the release-triggered workflow; releases published with the existing owner-authenticated CLI trigger it normally.

## Local checks

```powershell
node --test tests/download-page.test.mjs
node scripts/build-download-page.mjs
```

Serve `download-page/dist/` with a local static server for visual checks. No package installation is needed. The builder uses the public API locally; `GH_TOKEN` is optional for authenticated rate limits and is never written into the page. In Actions it receives GitHub's short-lived read-only token. Upload and deploy use the standard Pages permissions, with no permanent deployment credentials.

The HTML and CSS sources are here; `scripts/build-download-page.mjs` embeds the established wordmark and draws a decorative SVG sculpture. Keep the buttons prominent, phone layout usable and app branding unchanged. Website-only edits do not require new APKs or Windows binaries.
