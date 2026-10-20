# Public website

Share **https://hynekro.github.io/resonance/**. The homepage offers a visual tour and direct downloads; **[the feature guide](https://hynekro.github.io/resonance/guide.html)** explains controls, limits, platform differences and privacy.

## Automatic release links

`.github/workflows/download-page.yml` runs on release publication/edit/removal, website changes on `main` and manual dispatch. The builder reads the complete release list and uses the same version/asset validation as the updater, independently for Windows and Android. Android previews are included; Windows previews are excluded. The workflow explicitly checks out `main`, even when a release points at an older app tag.

The deployed `download-page/dist/` contains two static HTML pages, CSS, the app icon, an explicit allowlist of reviewed media and `downloads.json`. Downloads, navigation and expandable FAQs work without JavaScript. No visitor-side API requests, analytics, remote fonts or credentials are added. GitHub receives normal hosting/download requests.

Release lookup or missing-platform failures stop the build and leave the previous site online. Verify deployment and both download buttons after each app release. Releases made with the default Actions `GITHUB_TOKEN` may require an explicit workflow dispatch; owner-authenticated CLI release events trigger it normally.

## Public previews and privacy

`scripts/capture-site-previews.cjs` captures actual app views using an isolated, fictional library, original procedural cover artwork and synthetic audio. It uses public source's procedural sky and never reads the installed app or personal library. The temporary library and browser profile stay under ignored `test-output/site-preview/`. Only reviewed JPGs go into `download-page/media/`. The wordmark comes from `public/brand.js`.

Run capture with the local Electron binary through a hidden process and persistent file logging, as with the other UI checks. Do not attach a shell pipe that can close while Electron is still running. Review every screenshot before staging. Do not substitute screenshots from a personal session, purchased standalone textures or private artwork caches.

No personal names, machine paths, playlist links, account identifiers or library statistics belong in site copy. Device models, if relevant, must be described only as testing devices, with accurate physical-test limitations. Public previews are labeled as fictional demos.

## Check and publish

```sh
node --test tests/download-page.test.mjs
node scripts/build-download-page.mjs
```

The builder requires network access to GitHub's public API; optional `GH_TOKEN` is never written into output. `tests/download-page-ui.cjs` exercises the built site at desktop/phone widths, keyboard FAQ use, overflow, images and internal links without a site-script dependency. Run it through a hidden Electron process with persistent logs.

Review and audit staged files, then push to `main`. Wait for the Pages workflow and check the public home page, feature guide and versioned downloads. Website/documentation-only changes do **not** require new app binaries or version bumps. Keep the release-event workflow when changing the site.
