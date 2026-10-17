import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { latestDownloads, readReleases, renderPage } from '../scripts/build-download-page.mjs';

function release(platform, version, overrides = {}) {
  const tag = `${platform}-v${version}`;
  const name = platform === 'pc' ? `Resonance-PC-${version}-portable.zip` : `Resonance-Android-${version}.apk`;
  return { tag_name: tag, draft: false, prerelease: version.includes('-'), assets: [{ name, state: 'uploaded', digest: 'sha256:' + 'a'.repeat(64), size: 80000000, browser_download_url: `https://github.com/HyneKro/resonance/releases/download/${tag}/${name}` }], ...overrides };
}

test('download page picks each platform independently by version, including Android previews', () => {
  const versions = [release('pc', '1.1.9'), release('android', '0.1.12-preview'), release('pc', '1.1.10'), release('android', '0.1.9-preview'), release('pc', '2.0.0-preview'), release('android', '0.1.13-preview', { draft: true }), release('pc', '3.0.0', { assets: [] })];
  const result = latestDownloads(versions);
  assert.equal(result.pc.version, '1.1.10');
  assert.equal(result.android.version, '0.1.12-preview');
  assert.throws(() => latestDownloads([release('pc', '1.1.10')]), /Both/);
});

test('release lookup paginates and fails on incomplete or unavailable responses', async () => {
  const urls = [];
  const rows = await readReleases({ fetchImpl: async (url, options) => {
    urls.push(url);
    assert.equal(options.headers.Authorization, undefined);
    return { ok: true, json: async () => urls.length === 1 ? Array(100).fill(release('pc', '1.1.4')) : [release('android', '0.1.12-preview')] };
  } });
  assert.equal(urls.length, 2);
  assert.match(urls[1], /page=2$/);
  assert.equal(latestDownloads(rows).android.version, '0.1.12-preview');
  await assert.rejects(readReleases({ fetchImpl: async () => ({ ok: false, status: 403 }) }), /existing page/);
  await assert.rejects(readReleases({ fetchImpl: async () => ({ ok: true, json: async () => ({ message: 'no' }) }) }), /Unexpected/);
});

test('rendered buttons work without JavaScript and match the verified release assets', async () => {
  const latest = latestDownloads([release('pc', '1.1.4'), release('android', '0.1.12-preview')]);
  const template = await fs.readFile(new URL('../download-page/index.html', import.meta.url), 'utf8');
  const html = renderPage(template, latest);
  assert.ok(html.includes(`href="${latest.pc.url}"`));
  assert.ok(html.includes(`href="${latest.android.url}"`));
  assert.ok(html.includes('<small>PREVIEW</small>'));
  assert.ok(!/\{\{|<script/.test(html));
  assert.throws(() => renderPage('{{UNKNOWN}}', latest), /Unknown/);
  const stable = latestDownloads([release('pc', '1.1.4'), release('android', '1.0.0')]);
  assert.ok(!renderPage(template, stable).includes('<small>PREVIEW</small>'));
});
