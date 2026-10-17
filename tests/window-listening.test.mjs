import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {createRequire} from 'node:module';
import {wheelVolume,swipeDirection} from '../public/listening-controls.js';
import {AudioFeatures} from '../public/analysis.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {extractPalette} from '../public/artwork-palette.js';
const {installWindowControls}=createRequire(import.meta.url)('../electron/window-controls.cjs');

test('native fullscreen only accepts the local top frame; F11 and Escape synchronize state',()=>{
 const win=new EventEmitter(),webContents=new EventEmitter();let full=false,handler,removed=0,prevented=0;
 Object.assign(win,{webContents,isDestroyed:()=>false,isFullScreen:()=>full,isMaximized:()=>false,setFullScreen:value=>{full=value;win.emit(value?'enter-full-screen':'leave-full-screen');}});
 webContents.mainFrame={url:'http://127.0.0.1:1234/'};const sent=[];webContents.send=(channel,state)=>sent.push(state.fullscreen);
 installWindowControls({win,url:'http://127.0.0.1:1234',ipcMain:{handle:(_,fn)=>handler=fn,removeHandler:()=>removed++}});
 const event={sender:webContents,senderFrame:webContents.mainFrame};
 assert.equal(handler(event,'toggle-fullscreen').fullscreen,true);assert.equal(sent.at(-1),true);
 assert.throws(()=>handler({...event,senderFrame:{url:webContents.mainFrame.url}},'toggle-fullscreen'));
 assert.throws(()=>handler({...event,sender:{}},'toggle-fullscreen'));
 assert.throws(()=>handler(event,'close'));webContents.mainFrame.url='https://example.com/';assert.throws(()=>handler(event,'state'));webContents.mainFrame.url='http://127.0.0.1:1234/';
 webContents.emit('before-input-event',{preventDefault:()=>prevented++},{type:'keyDown',key:'Escape'});assert.equal(full,false);
 webContents.emit('before-input-event',{preventDefault:()=>prevented++},{type:'keyDown',key:'F11'});assert.equal(full,true);
 webContents.emit('before-input-event',{preventDefault:()=>prevented++},{type:'keyDown',key:'F11',isAutoRepeat:true});assert.equal(full,true);assert.equal(prevented,2);
 win.emit('closed');assert.equal(removed,1);
});
test('background volume is gentle, bounded, reversible and has a fine mode; swipe needs clear intent',()=>{
 assert.equal(wheelVolume(.5,{deltaY:100}),.48);assert.equal(wheelVolume(.48,{deltaY:-100}),.5);
 assert.equal(wheelVolume(.5,{deltaY:100,shiftKey:true}),.496);assert.equal(wheelVolume(.01,{deltaY:1e6}),0);assert.equal(wheelVolume(.99,{deltaY:-1e6}),1);
 assert.equal(wheelVolume(.5,{deltaY:5,deltaMode:1}),.484);
 let precise=.5;for(let i=0;i<25;i++)precise=wheelVolume(precise,{deltaY:1,shiftKey:true},false);assert.ok(Math.abs(precise-.499)<1e-9,'small trackpad movements accumulate');
 assert.equal(swipeDirection(20,0),0);assert.equal(swipeDirection(100,90),0);assert.equal(swipeDirection(90,20),1);assert.equal(swipeDirection(-90,20),-1);
});
test('short analysis windows catch an attack before the long bass window, with independent frequency identity',()=>{
 for(const sr of [44100,48000,96000]){
  const silent=new Float32Array(4096).fill(-160),mid=new Float32Array(1024).fill(-160),fast=new Float32Array(512).fill(-160),wave=new Float32Array(1024).fill(.1);
  fast[Math.round(8000/(sr/1024))]=-24;
  const f=new AudioFeatures();f.update(silent,wave,sr,8192,1/120,1,true,{mid:{frequency:mid,fftSize:2048},fast:{frequency:fast,fftSize:1024}});
  assert.ok(f.accents[2]>.3);assert.equal(f.accents[0],0);assert.equal(f.accents[1],0);assert.ok(Math.max(...f.spectrum)>.25);
  const c=new VisualConductor();c.update(f,1/60);c.update(f,1/60);assert.ok(c.transients[2]>.8);assert.ok(c.accents[2]<.2,'geometric mass keeps inertia');
  for(let n=0;n<120;n++)f.update(silent,wave,sr,8192,1/120,1+(n+1)/120,true,{mid:{frequency:mid,fftSize:2048},fast:{frequency:fast,fftSize:1024}});
  assert.ok(f.accents[2]<.001,'a held tone does not produce repeated attacks');
 }
});
test('six-tone cover sampling retains small contrasting accents without inventing unrelated hues',()=>{
 const pixels=[];for(const [c,n]of [[[190,25,15],1000],[[10,100,200],100],[[20,180,60],80],[[230,175,20],70],[[140,40,200],60],[[15,160,170],50]])for(let i=0;i<n;i++)pixels.push(...c,255);
 const p=extractPalette(pixels);assert.equal(p.length,6);assert.ok(p.some(c=>c[1]>c[0]*2&&c[1]>c[2]*2));assert.ok(p.some(c=>c[2]>c[0]*3));assert.ok(p.some(c=>c[0]>c[1]*3));
});
