import test from 'node:test';
import assert from 'node:assert/strict';
import { VisualConductor } from '../public/visual-conductor.js';
const sound=(db=-28,bass=.6)=>({db,loudness:.65,bands:new Float32Array([bass,bass,.35,.4,.3,.25,.2,.15]),timbreBands:new Float32Array([.8,.9,.6,.5,.5,.4,.3,.2]),accents:new Float32Array([0,0,0])});
test('a continuous sculpture changes its properties with timbre, stays smooth and settles under sustained sound',()=>{
  const c=new VisualConductor();let previous=[...c.morph];const states=[];
  for(const band of [0,3,6]){
    const s=sound();s.bands.fill(0);s.timbreBands.fill(0);s.bands[band]=.9;s.timbreBands[band]=1;
    for(let i=0;i<3600;i++){
      const o=c.update(s,1/60);assert.equal(o.morph.length,4);
      o.morph.forEach((x,j)=>{assert.ok(x>=0&&x<=1);assert.ok(Math.abs(x-previous[j])<.03,'no abrupt shape change');});previous=[...o.morph];
    }
    states.push([...c.morph]);const settled=[...c.morph];for(let i=0;i<1800;i++)c.update(s,1/60);
    c.morph.forEach((x,i)=>assert.ok(Math.abs(x-settled[i])<.002,'no timed form cycling'));
  }
  assert.ok(states[0][0]>states[2][0]+.3,'bass opens folds');assert.ok(states[1][1]>states[0][1]+.3,'mids twist the surface');assert.ok(states[2][3]>states[0][3]+.3,'highs develop lace');
});
test('pause and silence keep gentle idle drift; reduced motion, hold and freeze retain their explicit behavior',()=>{
  const c=new VisualConductor();for(let i=0;i<850;i++)c.update(sound(),1/60);
  const initial=c.output;
  for(let i=0;i<3000;i++)c.update(sound(),1/60,{active:false});
  assert.ok(c.clock>initial.motion&&c.clock<initial.motion+12);assert.ok(c.energy<.001);const paused=c.clock;
  for(let i=0;i<3000;i++)c.update(sound(-100),1/60);
  assert.ok(c.clock>paused&&c.clock<paused+9);const silent=c.clock,stillMorph=[...c.morph];
  for(let i=0;i<3000;i++)c.update(sound(),1/60,{reduced:true});
  assert.deepEqual([...c.morph],stillMorph);assert.equal(c.clock,silent);
  const morph=[...c.morph];for(let i=0;i<3000;i++)c.update(sound(),1/60,{evolve:false});
  assert.deepEqual([...c.morph],morph);assert.ok(c.clock>initial.motion);
  const frozen=c.output,bytes=[...frozen.bands];for(let i=0;i<100;i++)assert.equal(c.update(sound(-100),1/60,{frozen:true}),frozen);
  assert.deepEqual([...frozen.bands],bytes);
});
test('visual gain makes quiet playback responsive while preserving raw measurements and frequency separation',()=>{
  const c=new VisualConductor(),s=sound(-52);s.bands.fill(.10);s.timbreBands.fill(.4);const before=[...s.bands];
  for(let i=0;i<600;i++)c.update(s,1/60);
  assert.ok(c.output.loudness>.35);assert.ok(c.output.bands[0]>.1);assert.deepEqual([...s.bands],before);assert.equal(s.db,-52);
  s.accents[1]=.4;c.update(s,1/60);assert.ok(c.output.accents[1]<.04,'an accent must not teleport the geometry');
  for(let i=0;i<30;i++)c.update(s,1/60);assert.ok(c.output.accents[1]>.95);assert.equal(c.output.accents[0],0);assert.equal(c.output.accents[2],0);
});
test('rapid percussion and uneven frames preserve bounded inertial movement',()=>{
  const c=new VisualConductor();let previous=Array(8).fill(0),previousAccent=Array(3).fill(0);
  for(let i=0;i<1800;i++){
    const s=sound(i%8<4?-18:-68,i%8<4?1:0);s.accents.fill(i%8===0?1:0);
    const o=c.update(s,1/60);
    o.bands.forEach((x,j)=>assert.ok(Math.abs(x-previous[j])<.09));
    o.accents.forEach((x,j)=>assert.ok(Math.abs(x-previousAccent[j])<.15));
    previous=[...o.bands];previousAccent=[...o.accents];
  }
  const active=c.output.motion;c.update(sound(),2);assert.ok(c.output.motion-active<.11,'a long stall is discarded');
});
