import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectRelease } from '../electron/github-releases.cjs';
import { brandMarkup } from '../public/brand.js';

const root = fileURLToPath(new URL('../', import.meta.url));
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

function sculpture() {
  const curves = Array.from({ length: 56 }, (_, i) => {
    const phase = i / 55;
    const points = Array.from({ length: 181 }, (_, j) => {
      const t = j / 180 * Math.PI * 2;
      const radius = 103 + phase * 60 + 15 * Math.cos(3 * t + phase * 1.4);
      const x = 245 + Math.cos(t) * radius * 1.15 + Math.sin(2 * t) * 14;
      const y = 161 + Math.sin(t) * radius * .64 + Math.cos(2 * t + phase * 1.7) * 21;
      return `${j ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join('');
    return `<path d="${points}Z" opacity="${(.22 + Math.sin(phase * Math.PI) * .5).toFixed(2)}"/>`;
  }).join('');
  const stars = Array.from({ length: 30 }, (_, i) => `<circle cx="${30 + (i * 113) % 440}" cy="${18 + (i * 79) % 280}" r="${i % 7 === 0 ? 1.5 : .7}" opacity="${i % 3 ? '.3' : '.65'}"/>`).join('');
  return `<svg viewBox="0 0 490 335" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="orbit" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#a1e4d5"/><stop offset=".5" stop-color="#ac9bd6"/><stop offset="1" stop-color="#ebadce"/></linearGradient></defs><g fill="#c3c5e4">${stars}</g><g fill="none" stroke="url(#orbit)" stroke-width=".65" transform="rotate(-22 245 161)">${curves}</g></svg>`;
}

export function renderPage(template, { pc, android }) {
  const values = { BRAND: brandMarkup('download'), SCULPTURE: sculpture() };
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
  const html = renderPage(await fs.readFile(path.join(root, 'download-page/index.html'), 'utf8'), latest);
  const out = path.join(root, 'download-page/dist');
  await fs.mkdir(out, { recursive: true });
  await fs.writeFile(path.join(out, 'index.html'), html);
  await fs.copyFile(path.join(root, 'download-page/style.css'), path.join(out, 'style.css'));
  await fs.copyFile(path.join(root, 'public/icon.svg'), path.join(out, 'icon.svg'));
  await fs.writeFile(path.join(out, '.nojekyll'), '');
  await fs.writeFile(path.join(out, 'downloads.json'), JSON.stringify({ pc: latest.pc, android: latest.android }, (key, value) => key === 'notes' ? undefined : value, 2) + '\n');
  console.log(JSON.stringify({ directory: out, pc: latest.pc.version, android: latest.android.version }));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
}
