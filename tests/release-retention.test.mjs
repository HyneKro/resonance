import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { retainedReleases, disposablePath, verifyPublished, planCleanup } from '../scripts/release-retention.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
function release(platform, version, extra = {}) {
  const tag = `${platform}-v${version}`;
  const name = platform === 'pc' ? `Resonance-PC-${version}-portable.zip` : `Resonance-Android-${version}.apk`;
  const body = Buffer.from(tag);
  return { tag_name: tag, draft: false, prerelease: platform === 'android', assets: [{ name, state: 'uploaded', size: body.length, digest: `sha256:${hash(body)}`, browser_download_url: `https://github.com/HyneKro/resonance/releases/download/${tag}/${name}` }], ...extra };
}
async function put(root, relative, content = 'retained') {
  const full = path.join(root, relative);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, typeof content === 'object' ? JSON.stringify(content) : content);
}
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'resonance-retention-'));
  t.after(async () => { assert.ok(root.startsWith(path.join(os.tmpdir(), 'resonance-retention-'))); await fs.rm(root, { recursive: true, force: true }); });
  const rows = [release('pc', '1.2.0'), release('pc', '1.9.0'), release('pc', '1.10.0'), release('android', '0.8.0-preview'), release('android', '0.9.0-preview'), release('android', '0.10.0-preview')];
  for (const row of rows) await put(root, `${row.tag_name.startsWith('pc-') ? 'releases' : 'android/releases'}/${row.assets[0].name}`, row.tag_name);
  await put(root, 'package.json', { version: '1.10.0' });
  await put(root, 'android/app/build.gradle', "versionName '0.10.0-preview'");
  const folder = 'releases/Resonance-Portable-2026-10-18T01-00-00-000Z';
  await put(root, `${folder}/resonance-update.json`, { product: 'resonance-portable', version: '1.10.0' });
  await put(root, 'releases/latest.json', { folder: path.join(root, folder), zip: path.join(root, `${folder}.zip`) });
  await put(root, `${folder}.zip`, 'pc-v1.10.0');
  await put(root, 'checkpoints/approved/keep.txt');
  await put(root, 'data/library.sqlite');
  await put(root, 'desktop-build/keep.txt');
  await put(root, 'test-output/sona-headset-sync/sources/keep.png');
  await put(root, 'test-output/pre-art/keep.png');
  await put(root, 'test-output/release-work/extracted/file');
  await put(root, 'test-output/frontend-assets-aB123c/file');
  await put(root, 'android/app/build/generated/file');
  await put(root, 'releases/Resonance-PC-2.0.0-portable.zip', 'unfinished');
  return { root, rows, folder };
}
const mockFetch = rows => async (url, options) => {
  assert.equal(options.headers?.Authorization, undefined);
  if (options.method === 'HEAD') return { ok: true };
  return { ok: true, text: async () => ['pc', 'android'].map(p => `<a href="${retainedReleases(rows)[p][0].url}">download</a>`).join('') };
};

test('retains latest plus one rollback independently, using semantic rather than lexical version order', () => {
  const keep = retainedReleases([release('pc', '1.9.0'), release('pc', '1.10.0'), release('pc', '1.2.0'), release('android', '0.10.0-preview'), release('android', '0.9.0-preview'), release('pc', '2.0.0', { draft: true }), release('pc', '3.0.0', { assets: [] })]);
  assert.deepEqual(keep.pc.map(r => r.version), ['1.10.0', '1.9.0']);
  assert.deepEqual(keep.android.map(r => r.version), ['0.10.0-preview', '0.9.0-preview']);
});

test('cleanup planner preserves checkpoint, current/previous archives, artwork and unfinished builds', async t => {
  const { root, rows, folder } = await fixture(t);
  const keep = await verifyPublished(root, rows, { fetchImpl: mockFetch(rows) });
  const plan = await planCleanup(root, rows, keep);
  assert.deepEqual(plan.targets.sort(), [
    'releases/Resonance-PC-1.2.0-portable.zip', 'android/releases/Resonance-Android-0.8.0-preview.apk',
    `${folder}.zip`, 'android/app/build', 'test-output/frontend-assets-aB123c', 'test-output/release-work'
  ].sort());
  assert.equal(plan.latest.zip, path.join(root, 'releases/Resonance-PC-1.10.0-portable.zip'));
  for (const p of ['checkpoints', 'data', '.private/skybox', 'test-output/sona-headset-sync', 'test-output/pre-art', '../releases', 'test-output/release-work/../../data']) assert.equal(disposablePath(p), false, p);
});

test('never prunes an extracted rollback copy when its retained archive is missing', async t => {
  const { root, rows } = await fixture(t);
  const old = 'releases/Resonance-Portable-2026-10-17T01-00-00-000Z';
  await put(root, `${old}/resonance-update.json`, { product: 'resonance-portable', version: '1.9.0' });
  const keep = retainedReleases(rows);
  assert.ok((await planCleanup(root, rows, keep)).targets.includes(old));
  await fs.unlink(path.join(root, 'releases/Resonance-PC-1.9.0-portable.zip'));
  assert.ok(!(await planCleanup(root, rows, keep)).targets.includes(old));
});

test('incomplete publication, changed binaries, unavailable downloads and stale download page block cleanup', async t => {
  const { root, rows } = await fixture(t);
  await assert.rejects(verifyPublished(root, rows.filter(r => r.tag_name !== 'android-v0.10.0-preview'), { fetchImpl: mockFetch(rows) }), /not publicly/);
  await assert.rejects(verifyPublished(root, rows, { fetchImpl: async () => ({ ok: false }) }), /unavailable/);
  await assert.rejects(verifyPublished(root, rows, { fetchImpl: async (_, o) => o.method === 'HEAD' ? { ok: true } : { ok: true, text: async () => 'old page' } }), /not updated/);
  await put(root, 'releases/Resonance-PC-1.10.0-portable.zip', 'modified');
  await assert.rejects(verifyPublished(root, rows, { fetchImpl: mockFetch(rows) }), /does not match/);
});

async function executionFixture(t) {
  const data = await fixture(t);
  await fs.mkdir(path.join(data.root, 'scripts'));
  await fs.copyFile(new URL('../scripts/cleanup-release-files.ps1', import.meta.url), path.join(data.root, 'scripts/cleanup-release-files.ps1'));
  execFileSync('git', ['init', '--quiet', data.root], { windowsHide: true });
  data.plan = await planCleanup(data.root, data.rows, retainedReleases(data.rows));
  data.execute = async () => {
    await put(data.root, '.private/release-cleanup/plan.json', data.plan);
    return execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(data.root, 'scripts/cleanup-release-files.ps1'), '-Plan', path.join(data.root, '.private/release-cleanup/plan.json')], { encoding: 'utf8', windowsHide: true, timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
  };
  return data;
}

test('Windows cleanup removes only approved generated files and remains safe on a second run', { skip: process.platform !== 'win32' }, async t => {
  const f = await executionFixture(t);
  assert.match(await f.execute(), /Release cleanup:/);
  for (const target of f.plan.targets) await assert.rejects(fs.access(path.join(f.root, target)), /ENOENT/);
  for (const target of ['checkpoints/approved/keep.txt', 'data/library.sqlite', 'desktop-build/keep.txt', 'test-output/sona-headset-sync/sources/keep.png', ...f.plan.keep.map(r => r.path)]) await fs.access(path.join(f.root, target));
  assert.match(await f.execute(), /Release cleanup:/);
});

test('Windows cleanup rejects a protected/tracked path before deleting anything', { skip: process.platform !== 'win32' }, async t => {
  const f = await executionFixture(t);
  await put(f.root, 'test-output/release-work/tracked.txt');
  execFileSync('git', ['-C', f.root, 'add', 'test-output/release-work/tracked.txt'], { windowsHide: true });
  await assert.rejects(f.execute(), /Protected path/);
  for (const target of f.plan.targets) await fs.access(path.join(f.root, target));
  f.plan.targets = ['../outside'];
  await assert.rejects(f.execute(), /Unrecognized cleanup target/);
});

test('Windows cleanup leaves used portable folders and filesystem junctions intact', { skip: process.platform !== 'win32' }, async t => {
  const f = await executionFixture(t);
  const old = 'releases/Resonance-Portable-2026-10-17T01-00-00-000Z';
  await put(f.root, `${old}/data/library.sqlite`, 'personal music metadata');
  f.plan.targets = [old];
  await assert.rejects(f.execute(), error => error.status === 2);
  let report = JSON.parse(await fs.readFile(path.join(f.root, '.private/release-cleanup/result.json'), 'utf8'));
  assert.match(report.results[0].reason, /personal data retained/);
  assert.equal(await fs.readFile(path.join(f.root, old, 'data/library.sqlite'), 'utf8'), 'personal music metadata');
  const link = path.join(f.root, 'test-output/release-work/link');
  await fs.symlink(path.join(f.root, 'checkpoints'), link, 'junction');
  f.plan.targets = ['test-output/release-work'];
  await assert.rejects(f.execute(), error => error.status === 2);
  report = JSON.parse(await fs.readFile(path.join(f.root, '.private/release-cleanup/result.json'), 'utf8'));
  assert.match(report.results[0].reason, /filesystem link/);
  await fs.access(path.join(f.root, 'checkpoints/approved/keep.txt'));
  await fs.unlink(link);
});
