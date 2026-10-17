import test from 'node:test';
import assert from 'node:assert/strict';
import { Inertia } from '../public/inertia.js';
import { extractPalette,validPalette,PaletteMixer,ArtworkPalette } from '../public/artwork-palette.js';

const pixels=(...colors)=>new Uint8ClampedArray(colors.flatMap(c=>Array.from({length:64},()=>[...c,255]).flat()));
test('inertia preserves velocity, does not overshoot a fixed target, and is frame-rate independent',()=>{
  const a=new Inertia(0,.65),b=new Inertia(0,.65);
  const first=a.update(1,1/60);assert.ok(first<.006);assert.ok(a.velocity>0);
  for(let i=1;i<60;i++){a.update(1,1/60);assert.ok(a.value<=1);}
  for(let i=0;i<30;i++)b.update(1,1/30);
  assert.ok(Math.abs(a.value-b.value)<1e-10);assert.ok(a.value>.98);
  const velocity=a.velocity;a.update(0,0);assert.equal(a.velocity,velocity);
});
test('cover extraction preserves warm/cool families and handles monochrome or empty covers',()=>{
  const warm=extractPalette(pixels([190,30,5],[230,70,12],[0,0,0],[255,255,255]));
  const cool=extractPalette(pixels([7,50,190],[15,160,200]));
  assert.ok(validPalette(warm)&&validPalette(cool));assert.ok(warm[0][0]>warm[0][2]*4);assert.ok(cool[0][2]>cool[0][0]*4);
  for(const data of [pixels([120,120,120]),pixels([0,0,0]),new Uint8ClampedArray(12)]){
    const p=extractPalette(data);assert.ok(validPalette(p));assert.ok(Math.max(...p[0])-Math.min(...p[0])<.06);
  }
});
test('palette fades between tracks, freeze holds it, and switching back has no discontinuity',()=>{
  const red=[[.7,.1,.1],[.6,.2,.1],[.9,.7,.7]],blue=red.map(c=>[c[2],c[1],c[0]]),mix=new PaletteMixer(red);
  const first=mix.update(blue,1/60);assert.ok(Math.abs(first[0][0]-red[0][0])<.001);
  for(let i=0;i<180;i++)mix.update(blue,1/60);
  const held=mix.update(blue,0);assert.ok(held[0][2]>held[0][0]);assert.deepEqual(mix.update(red,1,true),held);
  const next=mix.update(red,1/60);assert.ok(Math.abs(next[0][0]-held[0][0])<.01);
});
test('a slow cover cannot override a newer song, and local cache skips decoding on restart',async()=>{
  let finishOld,decodes=0;const saved=new Map(),applied=[];
  const options={read:async key=>saved.get(key),write:async(key,colors)=>saved.set(key,{version:2,colors}),
    decode:async key=>{decodes++;return key==='old'?await new Promise(resolve=>finishOld=resolve):pixels([10,150,230]);},onChange:(colors,label)=>applied.push({colors,label})};
  const loader=new ArtworkPalette(options),old=loader.select('old');await new Promise(resolve=>setImmediate(resolve));
  await loader.select('new');finishOld(pixels([210,15,10]));await old;
  assert.equal(applied.length,1);assert.ok(applied[0].colors[0][2]>applied[0].colors[0][0]);
  await new ArtworkPalette(options).select('new');assert.equal(decodes,2);
  await loader.select(null);assert.equal(applied.at(-1).colors,null);
});
