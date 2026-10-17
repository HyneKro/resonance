import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {measureStorage,createStorageReader,musicStorage} from '../storage.mjs';
import {storageSize,storageContents} from '../public/storage-ui.js';
import {startServer} from '../server.mjs';
test('storage separates music, artwork, database, browser and app without counting overlapping roots twice',async()=>{
 const root=await fs.mkdtemp(path.resolve('test-output/storage-')),data=path.join(root,'data'),profile=path.join(data,'browser');
 const write=async(name,size)=>{const p=path.join(root,name);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,Buffer.alloc(size));return p;};
 const music=await write('music.flac',1000);await write('data/artwork/cover.jpg',100);await write('data/wallpapers/background.webp',200);await write('data/library.sqlite',300);await write('data/library.sqlite-wal',40);await write('data/browser/Cache/file',50);await write('app.exe',600);
 const tracks=[{path:music,size:1000,available:true},{path:music,size:1000,available:true},{path:path.join(root,'absent'),size:99999,available:false}];
 const s=await measureStorage({tracks,dataDir:data,profileDir:profile,applicationPaths:[root,data]});
 assert.equal(s.music.bytes,1000);assert.equal(s.music.files,1);assert.equal(s.music.unavailable,1);assert.equal(s.artwork.bytes,300);assert.equal(s.library.bytes,340);assert.equal(s.browser.bytes,50);assert.equal(s.application.bytes,600);assert.equal(s.totalBytes,2290);assert.equal(s.skipped,0);
 assert.ok(storageContents(s).includes(storageSize(2290)));assert.ok(storageContents(s).includes('1 unavailable music file excluded'));
});
test('storage measurements share in-flight work, cache disk totals and immediately reflect indexed music changes',async()=>{
 let calls=0,now=1000,finish,tracks=[{path:'a',size:10,available:true}];const lib={list:()=>tracks,dataDir:'data'};
 const reader=createStorageReader(lib,{now:()=>now,measure:async()=>{calls++;await new Promise(r=>finish=r);return {music:musicStorage(tracks),totalBytes:40,checkedAt:now};}});
 const a=reader(),b=reader({refresh:true});finish();assert.deepEqual(await a,await b);assert.equal(calls,1);
 tracks=[{path:'a',size:20,available:true}];now+=100;assert.equal((await reader()).totalBytes,50);assert.equal(calls,1);
 now+=60000;const c=reader();finish();await c;assert.equal(calls,2);
 for(const [n,s]of [[0,'0 B'],[1000,'1 KB'],[1e6,'1 MB'],[2e9,'2 GB']])assert.equal(storageSize(n),s);
});
test('storage totals and UI assets are available from the local server',async()=>{
 const dataDir=await fs.mkdtemp(path.resolve('test-output/storage-api-')),app=await startServer({port:0,dataDir,autoScan:false,applicationPaths:[]});
 try{
  const response=await fetch(app.url+'/api/storage'),s=await response.json();assert.equal(response.status,200);assert.equal(s.music.bytes,0);assert.ok(s.library.bytes>0);assert.equal(s.application.bytes,0);assert.ok(s.totalBytes>=s.library.bytes);
  for(const file of ['storage-ui.js','storage.css'])assert.equal((await fetch(app.url+'/'+file)).status,200);
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();}
});
