import test from 'node:test';
import assert from 'node:assert/strict';
import {SpectrumHistory} from '../public/spectrum-history.js';

test('spectrogram keeps frequency order and recent audio in bounded storage',()=>{
 const h=new SpectrumHistory(),tone=new Float32Array(48);tone[7]=.8;
 h.update(0,tone);assert.equal(h.data[7],204);assert.equal(h.data[38],0);
 for(let i=1;i<=300;i++)h.update(i/30,tone);
 assert.equal(h.data.length,48*128);assert.ok(h.head>=0&&h.head<128);
 const old=(h.head+127)%128;assert.equal(h.data[old*48+7],204);
 tone.fill(0);tone[38]=1;h.update(301/30,tone);
 assert.equal(h.data[h.head*48+7],0);assert.equal(h.data[h.head*48+38],255);
 assert.equal(h.data[old*48+7],204);
});

test('paused, hidden and reset histories do not invent time or retain another track',()=>{
 const h=new SpectrumHistory(),tone=new Float32Array(48).fill(.5);h.update(10,tone);
 const copy=h.data.slice();assert.equal(h.update(10,new Float32Array(48)),false);assert.deepEqual(h.data,copy);
 assert.equal(h.update(90,tone),false);assert.deepEqual(h.data,copy);
 h.suspend();h.update(100,tone);assert.equal(h.head,0);
 h.reset();assert.ok(h.data.every(x=>x===0));h.update(0,new Float32Array(48));assert.ok(h.data.every(x=>x===0));
});

test('spectrogram sample cadence is independent of display FPS and rejects invalid levels',()=>{
 const sample=fps=>{const h=new SpectrumHistory();for(let i=0;i<=fps*3;i++)h.update(i/fps,new Float32Array(48).fill(.25));return h;};
 const slow=sample(30),fast=sample(120);assert.ok(Math.abs(slow.head-fast.head)<=1);
 const h=new SpectrumHistory();h.update(0,[Infinity,NaN,-2,7]);assert.deepEqual(Array.from(h.data.slice(0,5)),[0,0,0,255,0]);
 assert.equal(h.update(NaN,[]),false);
});

test('Flux retains seventeen seconds of measured history without extending the road history',()=>{
 const flux=new SpectrumHistory(512),road=new SpectrumHistory(),tone=new Float32Array(48);tone[19]=.9;
 for(const h of [flux,road])h.update(0,tone);
 const silent=new Float32Array(48);
 for(let frame=1;frame<=390;frame++)for(const h of [flux,road])h.update(frame/30,silent);
 assert.equal(flux.data.length,48*512);assert.equal(road.data.length,48*128);
 assert.ok(flux.data.some(x=>x>0),'A thirteen-second-old note must still be present');
 assert.ok(road.data.every(x=>x===0),'The road keeps its existing history duration');
 const held=flux.data.slice(),head=flux.head;flux.update(13,silent);assert.deepEqual(flux.data,held);assert.equal(flux.head,head);
 for(let frame=391;frame<=555;frame++)flux.update(frame/30,silent);
 assert.ok(flux.data.every(x=>x===0),'Silence eventually drains the entire longer trail');
 assert.ok(flux.head>=0&&flux.head<512);
});
