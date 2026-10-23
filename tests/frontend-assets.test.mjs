import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

test('a fresh installation serves the entire frontend module graph, including updater dependencies', async () => {
  const appRoot = process.env.RESONANCE_TEST_APP_ROOT || fileURLToPath(new URL('../', import.meta.url));
  const {startServer} = await import(pathToFileURL(path.join(appRoot, 'server.mjs')).href);
  const base = path.resolve('test-output');
  await fs.mkdir(base, { recursive: true });
  const dataDir = await fs.mkdtemp(path.join(base, 'frontend-assets-'));
  const db = new DatabaseSync(path.join(dataDir, 'library.sqlite'));
  db.exec('CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT)');
  db.prepare('INSERT INTO settings VALUES (?,?)').run('config', JSON.stringify({ sources: [], autoEnrich: false, autoGenres: false }));
  db.close();
  const service = await startServer({ port: 0, dataDir, autoScan: false });
  try {
    const pending = ['/app.js', '/sona-overlay.js'], visited = new Set();
    while (pending.length) {
      const route = pending.shift();
      if (visited.has(route)) continue;
      visited.add(route);
      const response = await fetch(service.url + route);
      assert.equal(response.status, 200, `${route} must be available on a clean first launch`);
      assert.match(response.headers.get('content-type'), /^text\/javascript/);
      const source = await response.text();
      // Relative static imports/re-exports and literal dynamic imports in our browser sources.
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]((?:\.\.?\/|\/)[^'"]+)['"]/g)) {
        const target = new URL(match[1], service.url + route);
        pending.push(target.pathname + target.search);
      }
    }
    assert.ok(visited.has('/constellation-labels.js'));assert.ok(visited.has('/spectrum-settings.js'));
    assert.ok(visited.has('/constellation-listening.js'), 'Discovery and listening-path dependency must be served');
    assert.ok(visited.has('/app-update-ui.js'), 'The updater must be part of the startup graph check');
    assert.ok(visited.has('/lyric-highlight.js'), 'Word highlighting must be served, including nested timing imports');
    assert.ok(visited.has('/music-edition.js'), 'Music only composition must be available on first launch');
    assert.ok(visited.has('/afterglow-palms.js'), 'The generated palm atlas dependency must be served on first launch');
    for(const file of ['noctiluca-shaders.js','fish-school.js','art-direction-shaders.js'])assert.equal((await fetch(service.url+'/'+file)).status,404,'Removed visual assets must not be served');
    assert.equal((await fetch(service.url+'/music-edition.css')).status,200);
    assert.ok(visited.size > 40, 'The complete scene and interface dependencies must be followed');
    for (const forbidden of ['/config.json', '/server.mjs', '/package.json', '/data/library.sqlite']) {
      assert.equal((await fetch(service.url + forbidden)).status, 404, 'Private app files must stay unavailable');
    }
  } finally {
    await new Promise(resolve => service.server.close(resolve));
    service.lib.close();
  }
});

test('Android includes every startup module in its merged web assets', async () => {
  const pending = ['/mobile.js'], visited = new Set();
  while (pending.length) {
    const route = pending.shift();
    if (visited.has(route)) continue;
    visited.add(route);
    const relative = route.split('?')[0].slice(1);
    let source;
    if (process.env.RESONANCE_TEST_ANDROID_ASSETS) source = await fs.readFile(path.join(process.env.RESONANCE_TEST_ANDROID_ASSETS, relative), 'utf8');
    else {
      try { source = await fs.readFile(new URL('../android/web/' + relative, import.meta.url), 'utf8'); }
      catch (error) { if(error.code !== 'ENOENT') throw error; source = await fs.readFile(new URL('../android/shared/' + relative, import.meta.url), 'utf8'); }
    }
    for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"]((?:\.\.?\/|\/)[^'"]+)['"]/g)) {
      const target = new URL(match[1], 'https://appassets.androidplatform.net' + route);
      pending.push(target.pathname + target.search);
    }
  }
  assert.ok(visited.has('/constellation-labels.js'));assert.ok(visited.has('/spectrum-settings.js'));
  assert.ok(visited.has('/constellation-listening.js'), 'Discovery and listening-path dependency must be served');
  assert.ok(visited.has('/app-update-ui.js'));
  assert.ok(visited.has('/lyric-highlight.js'));
  assert.ok(visited.has('/music-edition.js'));
  assert.ok(visited.has('/afterglow-palms.js'));
  for(const file of ['noctiluca-shaders.js','fish-school.js','art-direction-shaders.js']){
    const assets=process.env.RESONANCE_TEST_ANDROID_ASSETS||fileURLToPath(new URL('../android/shared/',import.meta.url));
    await assert.rejects(fs.access(path.join(assets,file)),{code:'ENOENT'},'Removed visual assets must not ship in Android');
  }
  assert.ok(visited.size > 40);
});
