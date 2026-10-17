import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

async function splash() {
  const nodes = Object.fromEntries(['startup','startup-status','startup-retry','startup-quiet'].map(id => [id, { hidden: true, dataset: {}, classList: { add(){} } }]));
  const handlers = new Map(), timers = new Map(); let next = 0;
  const window = { addEventListener(name, handler, capture) { handlers.set(name, { handler, capture }); } };
  const context = { window, document: { getElementById: id => nodes[id] }, performance: { now: () => 0 },
    setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout(id) { timers.delete(id); }, location: { reload(){} } };
  vm.runInNewContext(await fs.readFile(new URL('../public/startup.js', import.meta.url), 'utf8'), context);
  return { nodes, handlers, timers, window };
}

test('a missing module shows a real startup error instead of the endless scene message', async () => {
  const {nodes, handlers, timers} = await splash();
  assert.equal(handlers.get('error').capture, true);
  handlers.get('error').handler({target: {tagName: 'SCRIPT'}});
  assert.match(nodes['startup-status'].textContent, /app file could not load/);
  assert.equal(nodes['startup-status'].dataset.error, 'true');
  assert.equal(nodes['startup-retry'].hidden, false);
  assert.equal(timers.size, 0, 'The slow-start message must not overwrite a known failure');
});

test('artwork errors do not block startup but rejected initialization does', async () => {
  const {nodes, handlers, timers} = await splash();
  handlers.get('error').handler({target: {tagName: 'IMG'}});
  assert.equal(nodes['startup-status'].dataset.error, undefined);
  assert.equal(timers.size, 1);
  handlers.get('unhandledrejection').handler({reason: new Error('Startup failed')});
  assert.match(nodes['startup-status'].textContent, /Startup could not finish/);
  assert.equal(nodes['startup-retry'].hidden, false);
  assert.equal(timers.size, 0);
});
