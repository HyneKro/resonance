import test from 'node:test';
import assert from 'node:assert/strict';
import {KaleidoscopeBlend,KALEIDOSCOPE_MODES} from '../public/kaleidoscope.js';
const views=[{enabled:false},...KALEIDOSCOPE_MODES.map(m=>({enabled:true,mode:m.id}))];
const valid=weights=>{assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<1e-6);assert.ok(weights.every(w=>w>=0&&w<=1));};

test('every kaleidoscope pattern and toggle fades without snapping at 30, 60 and 165 FPS',()=>{
 for(const rate of [30,60,165])for(let a=0;a<views.length;a++)for(let b=0;b<views.length;b++){
  if(a===b)continue;
  const blend=new KaleidoscopeBlend();blend.update(0,views[a]);const initial=[...blend.weights];
  assert.deepEqual([...blend.update(0,views[b])],initial,'changing the target preserves the current frame');
  let previous=0;
  for(let frame=0;frame<rate;frame++){
   const weights=blend.update(1/rate,views[b]);valid(weights);assert.ok(weights[b]>=previous&&weights[b]-previous<.06);previous=weights[b];
   if(frame===0)assert.ok(weights[a]>.99,'ease in gently');
  }
  assert.equal(blend.active,false);assert.equal(blend.weights[b],1);assert.equal(blend.weights.filter(Boolean).length,1,'finished transitions sample only the selected view');
 }
});

test('rapid mode changes and toggle reversals continue from the current visible mixture',()=>{
 const blend=new KaleidoscopeBlend();blend.update(0,views[0]);
 for(const index of [3,8,0,2,11,4,0,12,1]){
  const before=[...blend.weights];assert.deepEqual([...blend.update(0,views[index])],before);
  for(let frame=0;frame<8;frame++)valid(blend.update(1/60,views[index]));
 }
 for(let frame=0;frame<60;frame++)blend.update(1/60,views[1]);
 assert.equal(blend.weights[1],1);assert.equal(blend.weights.filter(Boolean).length,1);
});

test('restored selection starts settled, off-mode choices stay invisible and stalls cannot skip a fade',()=>{
 const blend=new KaleidoscopeBlend();assert.equal(blend.update(0,views[9])[9],1);assert.equal(blend.active,false);
 blend.update(0,views[0]);const before=[...blend.weights];
 for(const dt of [NaN,Infinity,-1,0])assert.deepEqual([...blend.update(dt,views[0])],before);
 assert.ok(blend.update(30,views[0])[9]>.96,'returning after a stall does not jump to the endpoint');
 for(let i=0;i<10;i++)blend.update(.1,views[0]);
 assert.equal(blend.update(.1,{enabled:false,mode:'cathedral'})[0],1);assert.equal(blend.active,false);
});

test('reduced motion uses a brief dissolve instead of moving the folds',()=>{
 const blend=new KaleidoscopeBlend();blend.update(0,views[0]);
 const options={...views[6],reduced:true};blend.update(.1,options);assert.ok(Math.abs(blend.weights[6]-.5)<1e-6);
 blend.update(.1,options);assert.equal(blend.weights[6],1);assert.equal(blend.active,false);
});
