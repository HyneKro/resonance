import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {embedSkybox} from '../scripts/skybox-assets.mjs';

test('release sky is embedded only from private assets, and a missing asset clears stale licensed content',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'resonance-sky-'));
 try{
  await fs.mkdir(path.join(root,'public'));await fs.mkdir(path.join(root,'out'));await fs.mkdir(path.join(root,'.private','skybox'),{recursive:true});
  await fs.writeFile(path.join(root,'public','constellation-sky-texture.js'),'export const skyTexture = null;');
  const bitmap=Buffer.concat([Buffer.from('RIFF'),Buffer.alloc(4),Buffer.from('WEBP'),Buffer.from('test fixture')]);
  await fs.writeFile(path.join(root,'.private','skybox','mobile.webp'),bitmap);
  assert.equal(await embedSkybox(root,path.join(root,'out'),'mobile'),true);
  assert.match(await fs.readFile(path.join(root,'out','constellation-sky-texture.js'),'utf8'),/data:image\/webp;base64,/);
  assert.equal(await embedSkybox(root,path.join(root,'out'),'desktop'),false);
  assert.equal(await fs.readFile(path.join(root,'out','constellation-sky-texture.js'),'utf8'),'export const skyTexture = null;');
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
