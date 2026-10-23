import test from 'node:test';
import assert from 'node:assert/strict';
import {FluxMotion} from '../public/spectrum-history.js';
import {SceneCamera,fluxCameraDistance} from '../public/scene-camera.js';
const tone=new Float32Array(48).fill(.8),palette=new Float32Array(18).fill(.7);
const live={spectrum:tone,lights:tone,roles:{bass:.8,drums:.6,lead:.7},palette};
const advance=(m,seconds,options=live)=>{for(let i=0;i<seconds*60;i++)m.update((m.clock??0)+1/60,options);};
test('Flux pause eases the history and roles down while a gentle idle continues',()=>{
 const m=new FluxMotion();m.update(0,live);advance(m,3);const speed=m.activity,phase=m.phase,head=m.historyClock;
 m.update(m.clock+1/60,{active:false});assert.ok(m.activity>speed*.95);assert.ok(m.phase>phase&&m.historyClock>head);
 advance(m,8,{active:false});assert.ok(m.activity<.001);assert.ok(m.spectrum.every(x=>x<.001));
 const idle=m.phase;advance(m,1,{active:false});assert.ok(m.phase>idle+.04&&m.phase<idle+.06);
});
test('Flux track changes preserve phase and smoothly blend notes and colours',()=>{
 const m=new FluxMotion();m.update(0,live);advance(m,3);const phase=m.phase,history=m.historyClock,note=m.spectrum[0],color=m.palette[0];m.beginTrack();
 assert.equal(m.phase,phase);assert.equal(m.historyClock,history);assert.equal(m.spectrum[0],note);
 m.update(m.clock+1/60,{...live,spectrum:new Float32Array(48),palette:new Float32Array(18)});
 assert.ok(m.spectrum[0]>note*.95);assert.ok(m.palette[0]>color*.98);assert.ok(m.phase>phase);
 advance(m,6,{...live,spectrum:new Float32Array(48),palette:new Float32Array(18)});assert.ok(m.spectrum[0]<.001&&m.palette[0]<.02);
});
test('Flux holds and hidden gaps never catch up or move a frozen field',()=>{
 const m=new FluxMotion();m.update(0,live);advance(m,2);const phase=m.phase,history=m.historyClock;
 advance(m,2,{...live,hold:true});advance(m,2,{...live,reduced:true});assert.equal(m.phase,phase);assert.equal(m.historyClock,history);
 m.update(m.clock+120,live);assert.equal(m.phase,phase);m.suspend();m.update(1000,live);assert.equal(m.phase,phase);
 m.update(1000+1/60,live);assert.ok(m.phase>phase&&m.phase<phase+.03);
});
test('Flux overview adapts to portrait and large scale while exploration can enter the field',()=>{
 const pose=[.7,.4,0,0],fit=fluxCameraDistance(pose),wide=fluxCameraDistance(pose,{aspect:.5}),large=fluxCameraDistance(pose,{scale:1.45});
 assert.ok(wide>fit);assert.ok(large>fit);assert.ok(fluxCameraDistance(pose,{explore:.5})<fit*.6);assert.ok(fluxCameraDistance(pose,{explore:1})<1);
 const c=new SceneCamera();c.setExplore(4);c.update(1/60);assert.equal(c.exploreTarget,1);assert.ok(c.exploration.value>0&&c.exploration.value<.1);
 for(let i=0;i<120;i++)c.update(1/60);assert.ok(c.exploration.value>.99);const held=c.exploration.value;c.update(.1,{frozen:true});assert.equal(c.exploration.value,held);
 c.reset();for(let i=0;i<120;i++)c.update(1/60);assert.ok(c.exploration.value<.001);assert.equal(c.exploreTarget,0);
});
test('Flux orbit radius stays fixed through unrestricted rotations and music movement changes',()=>{
 const radius=fluxCameraDistance();
 for(const yaw of [-20,-3,0,1.5,3,20])for(const pitch of [-10,-1.5,0,1.5,10])assert.equal(fluxCameraDistance([yaw,pitch,0,.3],{movement:3.5}),radius);
 const c=new SceneCamera();c.drag(7000,-5000);for(let i=0;i<180;i++)c.update(1/60);assert.ok(c.pose[0].value>34&&c.pose[1].value<-24);
});
