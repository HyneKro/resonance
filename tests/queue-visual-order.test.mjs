import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ContinuousQueue, youtubeOrder } from '../public/queue.js';
import { VisualDynamics } from '../public/visual-dynamics.js';
import { Library } from '../library.mjs';
import { PlaylistSync } from '../sync.mjs';
const tracks=Array.from({length:15},(_,i)=>({id:String(i),title:String(i),available:true,sourceId:'tracks',kind:'track',genre:i%2?'House':'Ambient',artist:'Artist '+i}));
test('clicking the last track rotates the chosen order, then keeps a future queue indefinitely',()=>{
  const q=new ContinuousQueue(()=>tracks);q.start('14',tracks.map(t=>t.id));assert.deepEqual(q.items.slice(0,4),['14','0','1','2']);
  for(let i=0;i<300;i++){const current=q.items[q.cursor],next=q.next();assert.notEqual(next,null);assert.notEqual(q.items[next],current);q.select(q.items[next],next);assert.ok(q.items.length-q.cursor-1>=5);}
  assert.ok(q.items.length<80,'history is bounded');
});
test('a one-result search continues with related local tracks, skipping unavailable files',()=>{
  const source=[...tracks,{id:'mix',title:'Mix',available:true,kind:'mix',genre:'Ambient'}];source[1]={...source[1],available:false};
  const q=new ContinuousQueue(()=>source);q.start('0',['0']);assert.ok(q.items.length>1);assert.ok(!q.items.includes('1'));assert.equal(source.find(t=>t.id===q.items[1]).genre,'Ambient');assert.ok(!q.items.slice(0,8).includes('mix'));
  q.failed.add(q.items[1]);const next=q.next();assert.ok(!q.failed.has(q.items[next]));
});
test('cursor survives repeat cycles and restart, and edits cannot remove the playing item',()=>{
  const q=new ContinuousQueue(()=>tracks.slice(0,2));q.start('0',['0','1']);for(let i=0;i<7;i++){const n=q.next();q.select(q.items[n],n);}
  const saved={id:q.items[q.cursor],...q.snapshot()};const restored=new ContinuousQueue(()=>tracks.slice(0,2));restored.restore(saved);
  assert.equal(restored.cursor,q.cursor);assert.equal(restored.items[restored.cursor],saved.id);const before=restored.items[restored.cursor];restored.remove(restored.cursor);restored.move(restored.cursor,1);assert.equal(restored.items[restored.cursor],before);
  const index=restored.next();assert.notEqual(restored.items[index],before);
});
test('a single playable file remains playable; failed exhaustion terminates without a loop',()=>{
  const q=new ContinuousQueue(()=>tracks.slice(0,1));q.start('0',['0']);assert.equal(q.items[q.next()],'0');q.failed.add('0');assert.equal(q.next(),null);
});
test('explicit queue order and user-added next track survive automatic refill',()=>{
  const q=new ContinuousQueue(()=>tracks);q.start('3',['2','3','4']);assert.deepEqual(q.items.slice(0,3),['3','4','2']);
  assert.equal(q.add('mix'),false);const other=tracks.find(t=>!q.items.includes(t.id)).id;assert.equal(q.add(other),true);q.ensure();assert.equal(q.items[q.cursor+1],other);q.move(q.cursor+2,1);assert.equal(q.items[q.cursor], '3');
});
const sound=(bands,loudness=.65)=>({bands:new Float32Array(bands),db:-18,loudness});
const low=sound([.8,.8,.5,.12,.02,.01,.01,.01]),high=sound([.01,.01,.03,.1,.3,.7,.8,.7]);
function settle(d,f,seconds=12,options){for(let i=0;i<seconds*60;i++)d.update(f,1/60,options);return d.output;}
test('sustained bass and treble produce distinct shapes and palettes, with bounded smooth changes',()=>{
  const d=new VisualDynamics();const bass=structuredClone(settle(d,low));let prior=d.output;
  for(let i=0;i<720;i++){const next=d.update(high,1/60);assert.ok(Math.abs(next.hue-prior.hue)<1);assert.ok(Math.abs(next.shape-prior.shape)<.02);assert.ok(next.colors.flat().every(v=>v>=0&&v<=1));prior=next;}
  assert.ok(d.output.shape-bass.shape>.5);assert.ok(Math.abs(d.output.hue-bass.hue)>60);assert.ok(bass.flow>d.output.flow);
});
test('steady mode, reduced motion, pause and visual freeze have explicit stable behavior',()=>{
  const d=new VisualDynamics();const bass=structuredClone(settle(d,low,5,{dynamic:false})),treble=settle(d,high,5,{dynamic:false});assert.deepEqual(bass.colors,treble.colors);assert.equal(bass.shape,treble.shape);
  const before=structuredClone(d.output);settle(d,high,2,{frozen:true});assert.deepEqual(d.output,before);
  const motion=d.motion;settle(d,low,3,{active:false});assert.equal(d.motion,motion);const hue=d.hue;settle(d,high,3,{reduced:true});assert.equal(d.motion,motion);assert.equal(d.hue,hue);assert.equal(d.output.dynamic,false);
});
test('phrase energy reacts to a build and settles; silence never invents a new palette',()=>{
  const d=new VisualDynamics();settle(d,{...low,loudness:.2},20);const quiet=d.output.bloom;settle(d,{...low,loudness:.9},2);assert.ok(d.output.bloom>quiet+.1);
  const before=structuredClone(d.output);settle(d,{...high,db:-100,loudness:0},5);assert.deepEqual(d.output.colors,before.colors);assert.equal(d.output.shape,before.shape);
});
test('YouTube order uses saved numerical positions, source order, and stable unmatched fallback',()=>{
  const ts=[{id:'a',title:'Alpha',sourceId:'tracks'},{id:'b',title:'Zulu',sourceId:'tracks',playlistIndex:2},{id:'c',title:'Early',sourceId:'tracks',playlistIndex:1},{id:'d',title:'Mix',sourceId:'mixes',playlistIndex:1}];
  assert.deepEqual(ts.sort((a,b)=>youtubeOrder(a,b,[{id:'tracks'},{id:'mixes'}])).map(t=>t.id),['c','b','a','d']);
});
test('playlist order is recovered offline, refreshed on check, and preserves failed sources',async()=>{
  const base=path.resolve('test-output');await fs.mkdir(base,{recursive:true});const dir=await fs.mkdtemp(path.join(base,'order-'));let lib=new Library(process.cwd(),dir);lib.config.sources=[{id:'tracks',name:'Tracks',playlist:'first'},{id:'mixes',name:'Mixes',playlist:'second'}];lib.setSetting('config',lib.config);
  const a={...tracks[0],id:'a',path:'a',youtubeId:'aaaaaaaaaaa',title:'A',rawTitle:'A',duration:100},b={...a,id:'b',path:'b',youtubeId:'bbbbbbbbbbb',title:'B',rawTitle:'B'},m={...a,id:'m',path:'m',sourceId:'mixes',playlistIndex:7};lib.save(a);lib.save(b);lib.save(m);
  lib.setSetting('syncPreview',{checkedAt:12,sources:[{id:'tracks'}],entries:[{sourceId:'tracks',id:b.youtubeId,status:'existing',trackId:'b'},{sourceId:'tracks',id:a.youtubeId,status:'existing',trackId:'a'}]});lib.close();lib=new Library(process.cwd(),dir);
  try{
    assert.equal(lib.tracks.get('b').playlistIndex,1);assert.equal(lib.tracks.get('a').playlistIndex,2);assert.equal(lib.tracks.get('m').playlistIndex,7);
    const sync=new PlaylistSync(lib);sync.cacheCovers=async()=>{};sync.run=async args=>{if(args.at(-1).endsWith('second'))throw Error('offline');return JSON.stringify({title:'Test',entries:[{id:a.youtubeId,title:'A',duration:100,playlist_index:3}]});};
    await sync.check();assert.equal(lib.tracks.get('a').playlistIndex,3);assert.equal(lib.tracks.get('b').playlistIndex,null);assert.equal(lib.tracks.get('m').playlistIndex,7);assert.equal(sync.preview.entries[0].playlistIndex,3);
    const downloaded={...a,id:'new',path:'new'};lib.save(downloaded);lib.applyPlaylistOrder();assert.equal(lib.tracks.get('new').playlistIndex,3,'new downloads recover their saved position by video ID');
  }finally{lib.close();}
});
