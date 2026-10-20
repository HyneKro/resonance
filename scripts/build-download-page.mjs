import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectRelease } from '../electron/github-releases.cjs';
import { brandMarkup } from '../public/brand.js';

const root = fileURLToPath(new URL('../', import.meta.url));
export const SITE_MEDIA = Object.freeze(['visualizer.jpg', 'constellation.jpg', 'music-only.jpg', 'listening-path.jpg', 'library.jpg', 'wordmark.svg']);
const api = 'https://api.github.com/repos/HyneKro/resonance/releases';

export async function readReleases({ fetchImpl = fetch, token = '' } = {}) {
  const rows = [];
  for (let page = 1; page <= 100; page++) {
    const response = await fetchImpl(`${api}?per_page=100&page=${page}`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Resonance-Download-Page', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(30000), redirect: 'error'
    });
    if (!response.ok) throw new Error(`Release lookup failed (HTTP ${response.status}); the existing page must remain published.`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error('Unexpected GitHub release response.');
    rows.push(...data);
    if (data.length < 100) return rows;
  }
  throw new Error('Release pagination limit reached; refusing a potentially outdated page.');
}

export function latestDownloads(releases) {
  const pc = selectRelease(releases, '0.0.0', 'pc');
  const android = selectRelease(releases, '0.0.0', 'android');
  if (!pc || !android) throw new Error('Both a verified Windows and Android release are required.');
  return { pc, android };
}

const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function renderPage(template, { pc, android }) {
  const values = { BRAND: brandMarkup('download'), FOOTER_BRAND: brandMarkup('footer') };
  for (const [platform, release] of Object.entries({ PC: pc, ANDROID: android })) {
    values[`${platform}_URL`] = escape(release.url);
    values[`${platform}_VERSION`] = escape(release.version);
    values[`${platform}_SIZE`] = `${Math.round(release.bytes / 1e6)} MB`;
    values[`${platform}_NOTES`] = escape(release.page);
  }
  values.ANDROID_BADGE = android.version.includes('-') ? '<small>PREVIEW</small>' : '';
  return template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown page placeholder: ${key}`);
    return values[key];
  });
}

async function build() {
  const latest = latestDownloads(await readReleases({ token: process.env.GH_TOKEN || '' }));
  const out = path.join(root, 'download-page/dist');
  await fs.mkdir(out, { recursive: true });
  for (const name of ['index.html', 'guide.html']) {
    const html = renderPage(await fs.readFile(path.join(root, 'download-page', name), 'utf8'), latest);
    await fs.writeFile(path.join(out, name), html);
  }
  // Only reviewed public media belongs in the deployed artifact.
  await fs.mkdir(path.join(out, 'media'), { recursive: true });
  for (const name of SITE_MEDIA) await fs.copyFile(path.join(root, 'download-page/media', name), path.join(out, 'media', name));
  await fs.copyFile(path.join(root, 'download-page/style.css'), path.join(out, 'style.css'));
  await fs.copyFile(path.join(root, 'public/icon.svg'), path.join(out, 'icon.svg'));
  await fs.writeFile(path.join(out, '.nojekyll'), '');
  await fs.writeFile(path.join(out, 'downloads.json'), JSON.stringify({ pc: latest.pc, android: latest.android }, (key, value) => key === 'notes' ? undefined : value, 2) + '\n');
  console.log(JSON.stringify({ directory: out, pc: latest.pc.version, android: latest.android.version }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
