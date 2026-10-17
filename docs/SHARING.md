# Sharing Resonance and publishing updates

The source and releases at https://github.com/HyneKro/resonance are public, by the owner's choice. Anyone can download the app without an account. No Cloudflare account or separate update server is needed. **Share https://hynekro.github.io/resonance/**: it has direct PC and Android download buttons, version numbers and installation instructions. GitHub's “Download ZIP” option on the repository is a source archive, not the app.

The download page is published through `.github/workflows/download-page.yml`. Publishing, editing, deleting or unpublishing a release rebuilds the page from the latest valid release for each platform; page-source changes on main and manual workflow runs also deploy it. Windows selects stable releases; Android includes previews. Deployments typically take a few minutes. The page has no client-side API dependency, credentials, analytics or required JavaScript. If release lookup or validation fails, deployment stops and the existing page stays online. See [download-page/README.md](../download-page/README.md).

## Install and update

- **Windows:** download `Resonance-PC-<version>-portable.zip`, extract the complete folder and launch `Resonance.exe`. Starting with 1.1.4, Settings → App updates checks GitHub and downloads newer builds automatically. Choose **Restart & update** when ready. Installing retains music, playlists, settings and the existing `data` folder, with rollback if replacing application files fails. Older versions can use **Install a portable update…** to install the new ZIP once and gain online updates.
- **Android:** download `Resonance-Android-<version>.apk` and install it over the existing app. Starting with 0.1.12, Settings → App updates checks GitHub and downloads newer APKs on unmetered Wi-Fi. Android's Download Manager continues downloads when the screen is off. Tap **Install update**, allow Resonance to install apps if Android requests it, then confirm the system installer. Never uninstall to update: uninstalling deletes private app music and data. The published preview currently supports ARM64 devices such as the S22+.
- A persistent update-ready arrow appears beside the main controls when a verified update is downloaded (and in Library on Windows). It opens App updates; it does not install without your action.
- Automatic checks happen 30 seconds after launch and at six-hour intervals while the process is running. Both automatic checks and downloads can be disabled. **Check for updates** works manually; Android's manual **Download update** may use mobile data. No version is installed during listening without a restart/install action.
- An offline connection, cancelled download or unavailable GitHub service leaves the current installation usable. Cancelling a download does not delete music. Manual downloads from GitHub remain available.

## Verification and privacy

Clients read public GitHub release metadata without a token. Checks share normal connection information with GitHub, not library contents. They select their platform's versioned asset, skip drafts and downgrades, and require the expected size and GitHub SHA-256 digest. Windows additionally verifies the archive's per-file manifest and stages an update inside its own portable directory. Android checks the package ID, versionCode, versionName and installed signing certificate before offering installation. The checksum detects damaged or substituted downloads; the repository account remains the trust source for releases.

Personal music, library databases, cache, local configuration, signing keys, downloaded tools, build folders and checkpoints are excluded from source control. Use `npm run audit:repository` before pushing; `node scripts/audit-repository.mjs --history` also checks committed history. This is an additional check, not a guarantee. Review files before publication. Signing keys stay private and must be backed up independently.

## Publishing a new version

**Standing owner instruction:** every new application release includes both Windows and Android builds published here, unless the owner explicitly requests a narrower release. Publication of tested releases is already authorized. See [AGENTS.md](../AGENTS.md). Documentation-only changes do not need an app version bump or binary release.

1. Increase both platform versions beyond their latest published versions; their numbering remains independent. For Android also increase versionCode and preserve the original signing key. Update `android/tools/build.ps1`'s output name.
2. Test and build both platforms. Windows: `npm test`, `npm run package`, then `npm run share`. Android: follow `android/README.md` and run the build/unit/lint checks. Copy the clean Windows ZIP to its versioned filename. To leave a running desktop installation untouched, use `node scripts/package.mjs --stage-only`, then set `RESONANCE_RUNTIME_DIR` to `desktop-staging/Resonance-win32-x64` when sharing.
3. Commit and push the reviewed source. A source push alone does not create an app update.
4. Upload a draft release with the helper, using platform-specific tags and tested artifacts:

```powershell
./scripts/publish-release.ps1 -Platform pc -File releases/Resonance-PC-1.1.4-portable.zip -Notes docs/release-notes/pc-1.1.4.md
./scripts/publish-release.ps1 -Platform android -File android/releases/Resonance-Android-0.1.12-preview.apk -Notes docs/release-notes/android-0.1.12.md
```

The helper confirms the destination repository, checks the clean Windows configuration and archive, writes `SHA256SUMS.txt`, and uploads the artifact and checksum. It refuses to overwrite an existing release. Independently confirm Android's signing certificate and versionCode. Compare GitHub's uploaded asset size and SHA-256 digest with the local artifact before publishing. For this verification workflow, leave `-Publish` off: that switch publishes immediately after uploading, without the separate remote digest review.

5. After both uploads pass verification, publish both drafts. Set Windows as a stable release and Latest; keep Android preview as a prerelease with Latest disabled. Drafts are ignored by app update checks, so leaving drafts is not a completed release.
6. Verify public download access and platform-specific updater discovery without credentials. An older installed version should find the corresponding new release; the current version should not offer itself again. Wait for the download-page workflow to succeed and verify both buttons on https://hynekro.github.io/resonance/ show the new versions. Return the shareable download-page link and both published release links. Report any remaining build or publication blocker explicitly.

Keep the exact platform tag and asset filename conventions shown above. Do not overwrite a published artifact with changed contents; ship a new version instead.

Never upload a used portable folder or its `data` directory. Send only the original clean ZIP. Do not include an owner's GitHub token, password or signing key in an app, repository or release.

## Local development

Git tracks source history. Generated ZIPs/APKs are stored in GitHub Releases, not commits. The original approved checkpoint remains local and unchanged. A fresh source checkout starts with no personal music sources. Optional Windows download tools in `tools/` must be obtained from their official providers. Generated Sona sprites are included; rebuilding them also needs the original artwork inputs and `sharp` (or `RESONANCE_SHARP_PATH`).
