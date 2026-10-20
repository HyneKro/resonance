# Sharing Resonance and publishing updates

The source and releases at https://github.com/HyneKro/resonance are public, by the owner's choice. Anyone can download the app without an account. No Cloudflare account or separate update server is needed. **Share https://hynekro.github.io/resonance/**: it has direct PC and Android download buttons, version numbers and installation instructions. GitHub's “Download ZIP” option on the repository is a source archive, not the app.

The download page is published through `.github/workflows/download-page.yml`. Publishing, editing, deleting or unpublishing a release rebuilds the page from the latest valid release for each platform; page-source changes on main and manual workflow runs also deploy it. Windows selects stable releases; Android includes previews. Deployments typically take a few minutes. The page has no client-side API dependency, credentials, analytics or required JavaScript. If release lookup or validation fails, deployment stops and the existing page stays online. See [download-page/README.md](../download-page/README.md).

## Install and update

- **Windows:** download `Resonance-PC-<version>-portable.zip`, extract the complete folder and launch `Resonance.exe`. Starting with 1.1.4, Settings → App updates checks GitHub and downloads newer builds automatically. Choose **Restart & update** when ready. Installing retains music, playlists, settings and the existing `data` folder, with rollback if replacing application files fails. Older versions can use **Install a portable update…** to install the new ZIP once and gain online updates.
- Windows also shows the Resonance icon in the notification area while the app runs. Click it to reopen the player; right-click for **Open Resonance**, **Hide window**, or **Quit Resonance**. Hide keeps playback running. Quit saves the playback position and exits; the window's close button still exits normally.
- Starting with 1.24.0, installed Windows apps clean their own `.updates` folder after launch. Completed extracted payloads and older successful update folders are removed; one latest rollback backup remains. Active installers, pending/failed updates, unknown files and redirected/personal-data folders are preserved. Cleanup runs in a hidden background helper, does not stop playback, and records its result in `.updates/cleanup.json`. Cancelled preparations are also cleaned. This is independent of workspace release retention below.
- **Android:** download `Resonance-Android-<version>.apk` and install it over the existing app. Starting with 0.1.12, Settings → App updates checks GitHub and downloads newer APKs on unmetered Wi-Fi. Android's Download Manager continues downloads when the screen is off. Tap **Install update**, allow Resonance to install apps if Android requests it, then confirm the system installer. Never uninstall to update: uninstalling deletes private app music and data. The published preview currently supports ARM64 devices.
- A persistent update-ready arrow appears beside the main controls when a verified update is downloaded. It opens App updates; it does not install without your action.
- Automatic checks normally happen after launch and every six hours. A queued update stays eligible for checks every 30 minutes; after an installation failure, checks recur every five minutes. Timers only contact GitHub when due. Both automatic checks and downloads can be disabled. **Check for updates** remains available with a downloaded package on both platforms; Android's manual **Download update** may use mobile data.
- Before installation, the app checks for a newer release. A replacement is downloaded according to the saved preferences (automatic Android downloads remain Wi-Fi-only) and gets its own ready state; it never triggers a silent restart/install. A failed package triggers one immediate recovery lookup and is not automatically retried, even after reopening. Offline checks keep an already verified package usable. No version is installed during listening without a restart/install action.
- An offline connection, cancelled download or unavailable GitHub service leaves the current installation usable. Cancelling a download does not delete music. Manual downloads from GitHub remain available.

## Verification and privacy

Clients read public GitHub release metadata without a token. Checks share normal connection information with GitHub, not library contents. They select their platform's versioned asset, skip drafts and downgrades, and require the expected size and GitHub SHA-256 digest. Windows additionally verifies the archive's per-file manifest and stages an update inside its own portable directory. Android checks the package ID, versionCode, versionName and installed signing certificate before offering installation. The checksum detects damaged or substituted downloads; the repository account remains the trust source for releases.

Personal music, library databases, cache, local configuration, signing keys, downloaded tools, build folders and checkpoints are excluded from source control. Use `npm run audit:repository` before pushing; `node scripts/audit-repository.mjs --history` also checks committed history. This is an additional check, not a guarantee. Review files before publication. Signing keys stay private and must be backed up independently.

## Develop, test, then approve

`development` is the working branch; `main` is the live source. Push reviewed development commits to the working branch and prepare local Windows/Android builds for testing. Keep the installed Windows app separate from the test portable folder and use isolated test data by default. Never include a personal library in a shared test build.

The owner must explicitly confirm the current changes before merging or pushing them to `main`, publishing ordinary app releases, or changing the live website. This approval step replaces the earlier automatic-publication instruction. Prepare the changes and test builds first so the owner can approve a concrete result. Implementation requests and requests for test builds do not authorize a live release.

The owner authorized a separate development update channel on 2026-10-20. Tested development builds are now published to that channel on both platforms. They must never use ordinary release tags: Android clients also discover prereleases, so a prerelease flag alone does not isolate test builds. Explain whether an Android test APK will update the existing installation; retain signing identity and user data.

Once the tested batch is approved, integrate it into `main` and follow the two-platform release process below. Approval applies to that batch, not all future changes. Development-branch pushes do not deploy the website; its push trigger remains restricted to `main`.

### Development updates

An installed `-dev.N` version checks only tags named `development-pc-v<version>` or `development-android-v<version>`. Ordinary clients and the public download page use only `pc-v` / `android-v` tags. Both development releases must be GitHub prereleases with Latest disabled. They are public downloads, but never offered to ordinary installations.

Starting with Windows `1.25.0-dev.3` and Android `0.25.0-dev.3`, Settings → App updates shows **Development channel · test builds**. Install this build once manually: Windows can use **Install a downloaded ZIP…** in the existing development app, preserving its portable data. Android installs the APK over the existing app with the same signing certificate; do not uninstall. Subsequent development builds use normal checks, downloads and the restart/install button. Source-folder runs are still updated through source code.

The installed version determines the channel; a settings import cannot change it. Cached packages from another channel are rejected. Automatic updates never switch channels. To return to the approved channel, install a later approved ZIP/APK manually; Android's versionCode must exceed every previously distributed build, including development builds.

After tests and clean builds, commit and push `development`, then upload both drafts:

```powershell
./scripts/publish-release.ps1 -Channel development -Platform pc -File releases/Resonance-PC-1.25.0-dev.3-portable.zip -Notes docs/release-notes/development-1.25.0-dev.3.md
./scripts/publish-release.ps1 -Channel development -Platform android -File android/releases/Resonance-Android-0.25.0-dev.3.apk -Notes docs/release-notes/development-1.25.0-dev.3.md
```

Verify both remote digests, sizes and source tags, then publish both drafts with `--latest=false`. Verify anonymous discovery from an older dev version, no repeat offer for the current build, and rejection by ordinary/legacy clients. The download-page workflow skips development release events; an older workflow may rebuild unchanged page source from `main`, but its download selector must still ignore development tags. Confirm the live PC/Android buttons have not changed.

Run `npm run release:finish` after both publications. It detects the channel from both source versions, verifies that channel's artifacts and the ordinary website links, and prunes only published artifacts in the active channel. The other channel's current/rollback archives remain protected. Local-only unpublished previews remain for review rather than being deleted blindly.

## Publishing an approved version

**Standing owner instruction:** every approved application release includes both Windows and Android builds published here, unless the owner explicitly requests a narrower release. Once the owner approves the current batch, finish publication without asking again. See [AGENTS.md](../AGENTS.md). Documentation-only changes do not need an app version bump or binary release, but live publication still follows the approval step above.

1. Increase both platform versions beyond their latest published versions; their numbering remains independent. For Android also increase versionCode and preserve the original signing key. Update `android/tools/build.ps1`'s output name.
2. Test and build both platforms. Windows: `npm test`, `npm run package`, then `npm run share`. Android: follow `android/README.md` and run the build/unit/lint checks. Copy the clean Windows ZIP to its versioned filename. To leave a running desktop installation untouched, use `node scripts/package.mjs --stage-only`, then set `RESONANCE_RUNTIME_DIR` to `desktop-staging/Resonance-win32-x64` when sharing.
3. Commit and push the approved, reviewed source to `main`. A source push alone does not create an app update. The ordinary release channel refuses uploads from other branches; the explicit development channel requires `development`. `-ValidateOnly` checks without uploading.
4. Upload a draft release with the helper, using platform-specific tags and tested artifacts:

```powershell
./scripts/publish-release.ps1 -Platform pc -File releases/Resonance-PC-1.1.4-portable.zip -Notes docs/release-notes/pc-1.1.4.md
./scripts/publish-release.ps1 -Platform android -File android/releases/Resonance-Android-0.1.12-preview.apk -Notes docs/release-notes/android-0.1.12.md
```

The helper confirms the destination repository, checks the clean Windows configuration and archive, writes `SHA256SUMS.txt`, and uploads the artifact and checksum. It refuses to overwrite an existing release. Independently confirm Android's signing certificate and versionCode. Compare GitHub's uploaded asset size and SHA-256 digest with the local artifact before publishing. Leave `-Publish` off so both drafts can be reviewed before publication. The helper also compares the uploaded size and SHA-256 before its optional publication switch can run.

Before any PC upload (including `-ValidateOnly`), the helper also stages the complete ZIP through the frozen 1.22.0 updater in `tests/fixtures/updater/`. This checks compatibility with already-installed apps, all manifest paths and every extracted file hash. Run it independently with `node scripts/verify-portable-update.mjs <zip>`. Keep native helpers under `resources/app/electron/`; older updaters allow only `.mjs` and `.json` at the application root. Do not relax the frozen validator to make a release pass.

5. After both uploads pass verification, publish both drafts. Set Windows as a stable release and Latest; keep Android preview as a prerelease with Latest disabled. Drafts are ignored by app update checks, so leaving drafts is not a completed release.
6. Verify public download access and platform-specific updater discovery without credentials. An older installed version should find the corresponding new release; the current version should not offer itself again. Wait for the download-page workflow to succeed and verify both buttons on https://hynekro.github.io/resonance/ show the new versions. Return the shareable download-page link and both published release links. Report any remaining build or publication blocker explicitly.
7. Complete the release with `npm run release:finish`. This is the mandatory local cleanup step, after successful publication and verification of **both** platforms. Do not run it early during packaging or draft uploads. `npm run release:cleanup` previews the plan without deleting files. Release-tooling-only changes do not require app builds or new binary versions.

Keep the exact platform tag and asset filename conventions shown above. Do not overwrite a published artifact with changed contents; ship a new version instead.

Never upload a used portable folder or its `data` directory. Send only the original clean ZIP. Do not include an owner's GitHub token, password or signing key in an app, repository or release.

## Local retention after releases

Keep the two newest published versions independently for PC and Android in each channel: the current versioned ZIP/APK and one previous version for rollback. The approved `CHECKPOINT.json` snapshot remains separate and is never pruned. Git history and GitHub Releases are unchanged, so older source and downloads remain available online. This policy starts with the files currently present; it does not automatically download versions removed by the earlier one-time cleanup.

`release:finish` first verifies that the source versions match the newest public platform releases, their local files match GitHub's SHA-256 digests and sizes, downloads are anonymously reachable, and the public page links to both ordinary releases (development builds never replace those buttons). Missing artifacts, an incomplete release or a stale/unavailable page stop cleanup. The underlying PowerShell remover validates the complete plan before deletion, rejects paths outside the project or through filesystem links, protects tracked source and checkpoint paths, checks retained hashes again, and skips running installations or folders containing user data/signing material. Skipped files are reported for review; do not force-delete them or stop the owner's app.

Cleanup removes older published versioned archives/checksum folders, redundant timestamped ZIPs, obsolete clean Windows extractions, staging output, Android build output, and recognized disposable test fixtures. It retains the latest clean Windows extraction and updates `releases/latest.json` to its versioned ZIP. Unpublished or unrecognized build files are left for investigation. SDKs, Gradle caches, emulator data, the installed `desktop-build`, personal library/settings, original skybox assets, original Sona artwork and design backups stay untouched.

Put new release-specific extracted apps and temporary verification profiles under **`test-output/release-work/`**, so they are removed after release. Save reusable artwork or other source inputs elsewhere; never put them in this disposable directory. Keep concise verification findings in the release notes before cleanup. The latest cleanup plan/result are saved locally in `.private/release-cleanup/` and overwritten on the next run rather than accumulating reports. This is a local release-completion step, not a scheduled task or a GitHub-hosted cleanup job.

## Local development

Git tracks source history. Generated ZIPs/APKs are stored in GitHub Releases, not commits. The original approved checkpoint remains local and unchanged. A fresh source checkout starts with no personal music sources. Optional Windows download tools in `tools/` must be obtained from their official providers. Generated Sona sprites are included; rebuilding them also needs the original artwork inputs and `sharp` (or `RESONANCE_SHARP_PATH`).
