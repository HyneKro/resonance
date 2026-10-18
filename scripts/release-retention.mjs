import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readReleases } from './build-download-page.mjs';
import { selectRelease, compareVersions, verifyFile } from '../electron/github-releases.cjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const page = 'https://hynekro.github.io/resonance/';
const portableName = /^Resonance-Portable-\d{4}-\d{2}-\d{2}T[\d-]+Z$/;
const version = '\\d+\\.\\d+\\.\\d+(?:-preview(?:\\.\\d+)?)?';
const fixturePrefixes = 'identity|atmosphere|companion-api|constellation|archive|api|display-api|fresh-checkout|frontend-assets|genre-test|github-update|genre-remix|genre-outage|genre-credit|history|catalogue|level-library|metadata-review|lyrics|discovery|refinement-api|order|portable-update|song-analysis|normalized-audio|profile-cache|sources|spotify-source|spotify-api|storage|storage-api|sync-api|desktop-next-data|refinement-111-data|portable-smoke-data';

export function retainedReleases(rows) {
  return Object.fromEntries(['pc', 'android'].map(platform => {
    const releases = rows.map(row => selectRelease([row], '0.0.0', platform)).filter(Boolean);
    const unique = [...new Map(releases.map(r => [r.version, r])).values()];
    return [platform, unique.sort((a, b) => compareVersions(b.version, a.version)).slice(0, 2)];
  }));
}

// This allowlist is intentionally narrower than "anything ignored by Git".
export function disposablePath(relative) {
  if (/^(desktop-staging|android\/app\/build|android\/build|test-output\/release-work)$/.test(relative)) return true;
  if (new RegExp(`^releases/Resonance-PC-${version}-portable\\.zip$`).test(relative)) return true;
  if (new RegExp(`^android/releases/Resonance-Android-${version}\\.apk$`).test(relative)) return true;
  if (new RegExp(`^releases/publish-(pc|android)-v${version}$`).test(relative)) return true;
  if (relative.startsWith('releases/') && portableName.test(relative.slice(9).replace(/\.zip$/, ''))) return true;
  const name = relative.replace(/^test-output\//, '');
  return relative.startsWith('test-output/') && !name.includes('/') && (
    new RegExp(`^(?:${fixturePrefixes})-[A-Za-z0-9]{6}$`).test(name) ||
    /^(?:constellation|ux|mobile-repair)[\w-]*-release(?:-[\w-]+)?$/.test(name) ||
    /^(?:verify-|startup-artifacts-)[\w-]+$/.test(name) ||
    /^(?:portable-full-install|portable-online-update-[a-f0-9-]{36})$/.test(name) ||
    /^(?:android-mobile-ux|android-shuffle|android-visual-update|camera-zoom|desktop-next|kaleidoscope|refinement-111|sona-emblem|window-check)-profile$/.test(name)
  );
}

async function entries(root, relative) {
  try { return await fs.readdir(path.join(root, relative), { withFileTypes: true }); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function json(file) { return JSON.parse((await fs.readFile(file, 'utf8')).replace(/^\uFEFF/, '')); }
const artifactPath = r => `${r.tag.startsWith('pc-') ? 'releases' : 'android/releases'}/${r.name}`;

export async function verifyPublished(root, rows, { fetchImpl = fetch } = {}) {
  const keep = retainedReleases(rows);
  const pc = (await json(path.join(root, 'package.json'))).version;
  const android = (await fs.readFile(path.join(root, 'android/app/build.gradle'), 'utf8')).match(/\bversionName\s+['"]([^'"]+)['"]/)?.[1];
  for (const [platform, current] of Object.entries({ pc, android })) {
    const release = keep[platform][0];
    if (!release || release.version !== current) throw Error(`The current ${platform} release is not publicly available; no cleanup.`);
    if (!await verifyFile(path.join(root, artifactPath(release)), release)) throw Error(`The current ${platform} download is missing or does not match GitHub; no cleanup.`);
    // Probe anonymous download access without downloading the entire binary again.
    const response = await fetchImpl(release.url, { method: 'HEAD', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error(`The ${platform} download is unavailable; no cleanup.`);
  }
  const response = await fetchImpl(page, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error('The download page is unavailable; no cleanup.');
  const html = await response.text();
  for (const platform of ['pc', 'android']) {
    if (!html.includes(`href="${keep[platform][0].url}"`)) throw Error('The download page is not updated for both platforms; no cleanup.');
  }
  return keep;
}

export async function planCleanup(root, rows, keep) {
  root = path.resolve(root);
  const kept = [...keep.pc, ...keep.android], keepPaths = kept.map(artifactPath);
  const published = rows.map(row => selectRelease([row], '0.0.0', 'pc') || selectRelease([row], '0.0.0', 'android')).filter(Boolean);
  const byTag = new Map(published.map(r => [r.tag, r]));
  const targets = [], preserved = [...keepPaths, 'checkpoints', 'desktop-build', 'data', 'skybox', '.private/skybox'];
  const add = relative => { if (!disposablePath(relative)) throw Error(`Unrecognized cleanup path: ${relative}`); targets.push(relative); };
  let latest = null;
  try { latest = await json(path.join(root, 'releases/latest.json')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let latestFolder = latest?.folder ? path.relative(root, path.resolve(root, latest.folder)).replaceAll('\\', '/') : '';
  // Only retain a clean extraction that really belongs to the current release.
  if (!/^releases\//.test(latestFolder) || !portableName.test(latestFolder.slice(9))) latestFolder = '';
  if (latestFolder) {
    const manifest = await json(path.join(root, latestFolder, 'resonance-update.json'));
    if (manifest.product !== 'resonance-portable' || manifest.version !== keep.pc[0].version) throw Error('latest.json does not identify the current portable build; no cleanup.');
    preserved.push(latestFolder);
  }
  for (const parent of ['releases', 'android/releases']) {
    for (const item of await entries(root, parent)) {
      const relative = `${parent}/${item.name}`;
      if (keepPaths.includes(relative) || relative === latestFolder || !disposablePath(relative) || item.isSymbolicLink()) continue;
      const named = item.name.match(new RegExp(`^Resonance-(PC|Android)-(${version})(?:-portable\\.zip|\\.apk)$`));
      const checksum = item.name.match(new RegExp(`^publish-(pc|android)-v(${version})$`));
      if (named || checksum) {
        const platform = named ? (named[1] === 'PC' ? 'pc' : 'android') : checksum[1];
        const v = (named || checksum)[2];
        if (keep[platform].some(r => r.version === v)) continue;
        if (byTag.has(`${platform}-v${v}`) && compareVersions(v, keep[platform][0].version) < 0) add(relative);
      } else if (item.isDirectory() && portableName.test(item.name)) {
        // Old extracted runtimes are redundant with the retained versioned archives.
        try {
          const m = await json(path.join(root, relative, 'resonance-update.json'));
          const publishedVersion = byTag.get(`pc-v${m.version}`);
          if (m.product === 'resonance-portable' && publishedVersion && compareVersions(m.version, keep.pc[0].version) <= 0) {
            if (!keep.pc.some(r => r.version === m.version) || await verifyFile(path.join(root, artifactPath(publishedVersion)), publishedVersion)) add(relative);
          }
        } catch { /* Unknown or incomplete builds are kept for investigation. */ }
      } else if (item.isFile() && portableName.test(item.name.replace(/\.zip$/, ''))) {
        const stat = await fs.stat(path.join(root, relative));
        for (const r of published.filter(r => r.tag.startsWith('pc-') && r.bytes === stat.size)) {
          if (await verifyFile(path.join(root, relative), r) && (!keep.pc.some(k => k.version === r.version) || await verifyFile(path.join(root, artifactPath(r)), r))) { add(relative); break; }
        }
      }
    }
  }
  for (const item of await entries(root, 'test-output')) {
    const relative = `test-output/${item.name}`;
    if (item.isDirectory() && disposablePath(relative)) add(relative);
  }
  for (const relative of ['desktop-staging', 'android/app/build', 'android/build']) {
    try { await fs.lstat(path.join(root, relative)); add(relative); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  return { schema: 1, root, createdAt: new Date().toISOString(), keep: kept.map(r => ({ version: r.version, tag: r.tag, path: artifactPath(r), bytes: r.bytes, sha256: r.sha256 })), preserved, targets, latest: latestFolder ? { folder: path.join(root, latestFolder), zip: path.join(root, artifactPath(keep.pc[0])) } : null };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw Error('Usage: node scripts/release-retention.mjs [--apply]');
  const rows = await readReleases(); // Public discovery, deliberately no credentials.
  const keep = await verifyPublished(project, rows);
  const plan = await planCleanup(project, rows, keep);
  const report = path.join(project, '.private/release-cleanup');
  await fs.mkdir(report, { recursive: true });
  const planFile = path.join(report, 'plan.json');
  await fs.writeFile(planFile, JSON.stringify(plan, null, 2));
  console.log(`Keep up to two releases per platform: ${plan.keep.map(r => r.tag).join(', ')}. Checkpoint stays separate.`);
  console.log(`${plan.targets.length} generated paths proposed for cleanup; plan: ${planFile}`);
  if (args.includes('--apply')) {
    if (process.platform !== 'win32') throw Error('Cleanup execution requires Windows PowerShell. No files removed.');
    execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(project, 'scripts/cleanup-release-files.ps1'), '-Plan', planFile], { stdio: 'inherit', windowsHide: true });
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
