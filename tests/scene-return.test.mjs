import test from 'node:test';import assert from 'node:assert/strict';
import {SceneReveal} from '../public/scene-reveal.js';
import {Reactor} from '../public/reactor.js';
import {TrackResearch,researchStamp} from '../track-research.mjs';
const classes=()=>{const values=new Set();return {values,add(...items){items.forEach(i=>values.add(i));},remove(...items){items.forEach(i=>values.delete(i));}};};

test('static artwork stays until the first frame, with cancellable fades and reduced-motion support',()=>{
 const label={textContent:''},status={hidden:true,querySelector:()=>label},attrs=new Map(),button={setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 const root={classList:classes(),querySelector:s=>s==='#visualizer-loading'?status:button},timers=[];const reveal=new SceneReveal(root,{schedule:fn=>{timers.push(fn);return timers.length;},unschedule(){}});
 reveal.begin();assert.ok(root.classList.values.has('visualizer-preparing'));assert.equal(timers.length,0);assert.equal(status.hidden,false);assert.equal(label.textContent,'Preparing your visualizer…');assert.equal(attrs.get('aria-busy'),'true');
 reveal.ready();assert.ok(root.classList.values.has('visualizer-return'));assert.equal(root.classList.values.has('visualizer-preparing'),false);assert.equal(status.hidden,true);assert.equal(attrs.has('aria-busy'),false);
 reveal.begin();timers[0]();assert.ok(root.classList.values.has('visualizer-preparing'),'a previous fade cannot dismiss the new cover');
 assert.equal(status.hidden,false);reveal.cancel();assert.equal(root.classList.values.size,0);assert.equal(status.hidden,true);assert.equal(label.textContent,'');assert.equal(attrs.has('aria-busy'),false);reveal.begin();reveal.ready(true);assert.equal(root.classList.values.size,0);assert.equal(status.hidden,true);
});

test('the scene never draws the orbital fallback while full graphics are preparing',()=>{
 const original={document:globalThis.document,matchMedia:globalThis.matchMedia,requestAnimationFrame:globalThis.requestAnimationFrame,cancelAnimationFrame:globalThis.cancelAnimationFrame};
 let callback,classic=0,ready=false;const root={classList:classes()},room={hidden:false,clientWidth:1280,clientHeight:720},canvas={getBoundingClientRect:()=>({width:1280,height:720})},gpuCanvas={};
 globalThis.document={body:root,hidden:false,querySelector:s=>({'#listening-room':room,'#room-canvas':canvas,'#room-gl':gpuCanvas}[s]||null)};globalThis.matchMedia=()=>({matches:false});globalThis.requestAnimationFrame=fn=>{callback=fn;return 1;};globalThis.cancelAnimationFrame=()=>{};
 try{
  const r=new Reactor({paused:true,ended:false});r.mode='resonance';r.sceneReveal=new SceneReveal(root);r.targetFPS=60;r.musicOnly=true;r.eq=()=>{};
  let graphicsCalls=0;r.gpu={ready:false,failed:false,needsFrame:true,draw:()=>{graphicsCalls++;return ready;}};r.draw2D=()=>classic++;r.updateMeters=()=>{};r.setMusicOnly(false);
  callback(1000);assert.equal(graphicsCalls,0,'the loading cue gets a paint before graphics work');assert.ok(root.classList.values.has('visualizer-preparing'));
  callback(1020);assert.equal(graphicsCalls,1);assert.equal(classic,0);assert.equal(canvas.hidden,true);assert.ok(root.classList.values.has('visualizer-preparing'));assert.equal(r.hadFrame,false);
  ready=r.gpu.ready=true;callback(1040);assert.equal(classic,0);assert.equal(gpuCanvas.hidden,false);assert.equal(r.hadFrame,true);assert.equal(root.classList.values.has('visualizer-preparing'),false);
  r.sceneReveal.cancel();ready=false;r.gpu.failed=true;callback(1060);assert.equal(classic,1,'a genuine graphics failure still has a fallback');
 }finally{Object.assign(globalThis,original);}
});

test('completed character research never reads saved BPM or queues tempo decoding',()=>{
 const t={id:'t',available:true,title:'Song',artist:'Artist'},saved={version:4,stamp:researchStamp(t),checkedAt:Date.now()};
 const lib={getSetting:key=>{assert.equal(key,'characterResearch:t');return saved;}};
 const research=new TrackResearch(lib,()=>{},{enabled:false});assert.equal(research.due(t),false);
});
