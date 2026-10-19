import test from 'node:test';
import assert from 'node:assert/strict';
import {RibbonSpectrum} from '../public/particle-spectrum.js';
import {AudioFeatures,SPECTRAL_WINDOWS} from '../public/analysis.js';
import {VisualSyncBuffer} from '../public/visual-sync.js';

const frame=(value=0,db=-24)=>({db,spectrum:new Float32Array(48).fill(value)});
const settle=(model,frame,seconds=1,options={})=>{let out;for(let i=0;i<seconds*60;i++)out=model.update(frame,1/60,options);return out;};
test('light keeps absolute per-band loudness and does not fill silent frequencies',()=>{
 const low=new RibbonSpectrum(),loud=new RibbonSpectrum(),f=frame();f.spectrum[12]=.3;
 const a=settle(low,f);f.spectrum[12]=.8;const b=settle(loud,f);
 assert.ok(b[12]>a[12]*3);assert.ok(a[12]>0);
 for(let i=0;i<48;i++)if(i!==12){assert.equal(a[i],0);assert.equal(b[i],0);}
 assert.equal(f.spectrum[12],Math.fround(.8));
});
test('startup, silent playback, pause and missing data become exactly dark',()=>{
 for(const [f,options] of [[frame(0),{}],[frame(.8,-100),{}],[frame(.8),{active:false}],[{},{}]]){
  const m=new RibbonSpectrum();assert.ok(m.update({},.016).every(x=>x===0));settle(m,frame(.8));
  assert.ok(settle(m,f,2,options).every(x=>x===0));
 }
 const f=frame();f.spectrum[3]=NaN;f.spectrum[5]=Infinity;f.spectrum[7]=-1;
 assert.ok(settle(new RibbonSpectrum(),f).every(x=>x===0));
});
test('fixed envelopes preserve attacks, smooth release, freeze and reduced motion',()=>{
 const m=new RibbonSpectrum(),f=frame(.8);const initial=m.update(f,1/60)[0];assert.ok(initial>.25);
 const before=m.levels[0];assert.equal(m.update(frame(0),.1,{frozen:true})[0],before);
 const after=m.update(frame(0),1/60)[0];assert.ok(after>0&&after<before);
 const reduced=new RibbonSpectrum().update(f,1/60,{reduced:true})[0];assert.ok(reduced<initial*.2);
 const outcomes=[30,60,144].map(fps=>{const r=new RibbonSpectrum();for(let i=0;i<fps;i++)r.update(f,1/fps);return r.levels[0];});
 assert.ok(Math.max(...outcomes)-Math.min(...outcomes)<.00001);
});
test('Bluetooth timing delays spectrum light together with the audible event',()=>{
 const delay=new VisualSyncBuffer();delay.setDelay(200);const light=new RibbonSpectrum();let after=0;
 for(let i=0;i<240;i++){
  const raw=new AudioFeatures();raw.spectrum=new Float32Array(48);raw.db=i>=180?-20:-100;if(i>=180)raw.spectrum[20]=.9;
  const delayed=delay.process(raw,true,i*1000/60),value=light.update(delayed,1/60,{active:delay.active})[20];
  if(i<192)assert.equal(value,0);else after=Math.max(after,value);
 }
 assert.ok(after>.6);
});
test('real analyzer windows keep low, middle and treble energy in distinct lanes',()=>{
 for(const hz of [80,1000,8000]){
  const f=new AudioFeatures(),light=new RibbonSpectrum();const bins=new Float32Array(4096).fill(-160),index=Math.round(hz/(48000/8192));bins[index]=-18;
  const wave=Float32Array.from({length:1024},(_,i)=>.2*Math.sin(i*2*Math.PI*hz/48000));
  for(let i=0;i<60;i++){f.update(bins,wave,48000,8192,1/60,i/60);light.update(f,1/60);}
  const peak=light.levels.indexOf(Math.max(...light.levels));assert.ok(Math.abs(Math.log2(SPECTRAL_WINDOWS[peak].center/hz))<.25);
  assert.ok(light.levels[peak]>.2);assert.ok(light.levels.filter(x=>x>.01).length<6);
 }
});
