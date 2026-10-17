# Private development and releases

Resonance's source repository is private. A repository link alone does not grant access. Friends who only need the app do not need source access.

## Version control

The repository includes Windows and Android source, illustrated assets, build scripts and synthetic tests. `.gitignore` excludes music, library databases, caches, local configuration, signing keys, downloaded tools, build folders, previous releases, screenshots and checkpoints. The approved local checkpoint is preserved on the original development machine; it is not part of Git history.

Before committing, run `npm run audit:repository`. This checks the staged files for excluded data and likely credentials without printing secret values. It is an additional check, not a guarantee that arbitrary files are safe to publish. Review the changed files before pushing.

Typical update:

```powershell
git status
git add <changed-source-files>
npm run audit:repository
npm test
git commit -m "Describe the change"
git push
```

Git stores source history. Compiled portable ZIPs and APKs belong in GitHub Releases, not in Git commits. Releases in this private repository also require authorized GitHub access.

## Publishing a build

1. Build and test the appropriate platform. Windows: `npm run package` then `npm run share`. Android: follow `android/README.md`, keeping the same signing key and increasing versionCode.
2. Use a clean, unused Windows portable ZIP. Never upload a used app folder or its data. Verify Android updates use the existing certificate; a different key will not update installed copies.
3. Create a release with a platform-specific tag (`pc-v1.1.3`, `android-v0.1.11-preview`), attach the tested ZIP/APK and a SHA-256 checksum file, then write short release notes. Keep releases as drafts until verification is complete.
4. A source push does not publish a binary or trigger app updates. Publish only a tested build.

Signing keys stay outside the repository. This matters even for a private repository. Back up the original Android signing key privately; do not recreate it for every build or move it into Git.

## Friends without GitHub accounts

The selected distribution model is private download links, with no GitHub login for friends. GitHub does not offer an unlisted, link-only private repository. A separate distribution endpoint is required to serve private releases to those friends. Cloudflare is one option, not a requirement; another suitable host works too.

Suggested arrangement:

- Keep source code and release archives in private GitHub storage.
- A small server checks a unique, revocable invitation for each friend, then serves only approved releases and their version/hash metadata. Its GitHub access is limited to release contents and stays on the server.
- Friends receive app access only; never place the owner's GitHub credentials in the app. Anyone holding a bearer invitation can share it, so use individually revocable links if that matters.
- Each app periodically checks its platform's feed, verifies the downloaded file and offers the update. Windows can reuse its existing staged ZIP installer and rollback. Android should use the normal signed APK installation flow, which may require user confirmation.

No update server has been deployed and automatic online app updates are not enabled by the repository setup. Choosing/connecting a host and integrating authenticated checks in both clients are the next steps. Existing Windows ZIP updates and Android install-over updates continue to work.

## External build tools

`tools/` is intentionally excluded. Windows downloads need official yt-dlp, Node, ffmpeg and ffprobe binaries in that directory. Existing development machines already have them; a fresh checkout must supply them separately. Generated sprite atlases are included; optional sprite rebuilding needs `sharp` (or `RESONANCE_SHARP_PATH`) and the original local artwork inputs.
