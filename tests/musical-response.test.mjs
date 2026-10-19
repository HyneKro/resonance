import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {MusicalResponse,phrasePreview} from '../public/musical-response.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {VisualSyncBuffer} from '../public/visual-sync.js';
import {preferencesWithDefaults} from '../public/default-preferences.js';

const frame=(h=.4,p=.2,db=-25)=>({db,loudness:(db+60)/54,bands:new Float32Array(8).fill(.35),timbreBands:new Float32Array(8).fill(.4),spectrum:new Float32Array(48).fill(.4),harmonic:new Float32Array(48).fill(h),percussive:new Float32Array(48).fill(p),accents:new Float32Array(3),hits:new Float32Array(3)});
const base=f=>({...f,transients:new Float32Array([.4,.4,.4]),morph:new Float32Array([.3,.3,.3,.3]),atmosphere:{bands:f.bands,accents:f.accents,loudness:.4},motion:123});
const profile=(energy)=>({duration:40,step:1,timeline:Array.from({length:40},(_,i)=>[i,-30,energy(i),.4,.3])});
const run=(m,seconds,f,options={})=>{let result;for(let i=0;i<seconds*60;i++)result=m.update(base(f),f,1/60,{time:i/60,...options});return result;};

test('reduced motion settles to the original response',()=>{
 const m=new MusicalResponse(),f=frame(),b=base(f);let r=m.update(b,f,1/60,{reduced:true});assert.equal(r.features,b);
 run(m,3,f);for(let i=0;i<240;i++)r=m.update(b,f,1/60,{time:3+i/60,reduced:true});
 assert.equal(r.features,b);assert.equal(r.weight,0);assert.equal(r.tension,0);
});
test('quiet note flicker is reduced while a new sustained note is preserved',()=>{
 const m=new MusicalResponse(),f=frame();run(m,3,f);let previous=null,inputVariation=0,outputVariation=0;
 for(let i=0;i<120;i++){f.harmonic[20]=.4+(i%2?.012:-.012);const input=f.harmonic[20],r=m.update(base(f),f,1/60,{time:3+i/60});if(previous){inputVariation+=Math.abs(input-previous.input);outputVariation+=Math.abs(r.features.harmonic[20]-previous.out);}previous={input,out:r.features.harmonic[20]};}
 assert.ok(outputVariation<inputVariation*.35,`${outputVariation}/${inputVariation}`);
 f.harmonic[20]=.85;let r;for(let i=0;i<12;i++)r=m.update(base(f),f,1/60,{time:5+i/60});assert.ok(r.features.harmonic[20]>.8);
 assert.equal(r.features.motion,123);assert.equal(f.harmonic[20],Math.fround(.85));
});
test('steady broad noise is restrained, fresh percussion retains its strength',()=>{
 const m=new MusicalResponse(),f=frame(.2,.25);let r=run(m,8,f);assert.ok(r.features.percussive[10]<.18);
 f.percussive.fill(.9);f.hits[1]=.8;for(let i=0;i<4;i++)r=m.update(base(f),f,1/60,{time:8+i/60});assert.ok(r.features.percussive[10]>.85);
});
test('bass and drum role changes retain their established timing',()=>{
 const m=new MusicalResponse(),f=frame();run(m,5,f);const roles={bass:.9,drums:.8,shimmer:.7,lead:.6,texture:.5};
 const r=m.update(base(f),f,1/60,{time:5,roles});for(const key of ['bass','drums','shimmer'])assert.equal(r.roles[key],roles[key]);assert.ok(r.roles.lead<roles.lead);assert.ok(r.roles.texture<roles.texture);
});
test('preview requires a sustained future lift, never an isolated peak or invented live prediction',()=>{
 const drop=profile(i=>i<20?.2:.85),spike=profile(i=>i===20?.9:.2),flat=profile(()=>.4);
 assert.ok(phrasePreview(drop,18)>.3);assert.equal(phrasePreview(drop,23),0);assert.equal(phrasePreview(flat,18),0);assert.equal(phrasePreview(null,18),0);
 for(let t=15;t<23;t+=.25)assert.equal(phrasePreview(spike,t),0,'isolated peak at '+t);
});
test('start, pause and seeks do not fabricate arrivals or anticipation',()=>{
 const m=new MusicalResponse(),f=frame(.4,.2,-10);f.hits[0]=.8;let arrival=0;
 for(let i=0;i<300;i++){const r=m.update(base(f),f,1/60,{time:i/60});arrival=Math.max(arrival,r.arrival);}assert.equal(arrival,0);
 const analyzed=profile(i=>i<20?.2:.85);let r;
 for(let i=0;i<150;i++)r=m.update(base(f),f,1/60,{time:16+i/60,profile:analyzed});
 m.resetEvidence();r=m.update(base(f),f,1/60,{time:19,profile:analyzed});assert.equal(r.arrival,0);assert.equal(m.preview,0);
 for(let i=0;i<180;i++)r=m.update(base(f),f,1/60,{time:19,active:false,profile:analyzed});assert.ok(r.tension<.002);assert.equal(r.arrival,0);
});
test('broad musical arrival is distinct from an isolated treble hit',()=>{
 function simulate(broad){const m=new MusicalResponse(),f=frame(.2,.1,-40);f.bands.fill(.15);run(m,8,f);let peak=0;
  for(let i=0;i<90;i++){f.db=broad?-12:-40;f.bands.fill(broad?.8:.15);f.hits.fill(0);if(i%15===0)f.hits[broad?0:2]=.8;const r=m.update(base(f),f,1/60,{time:8+i/60});peak=Math.max(peak,r.arrival);}return peak;}
 assert.ok(simulate(true)>.2);assert.equal(simulate(false),0);
});
test('frame rates, reduced motion, freeze and source reset stay bounded',()=>{
 const outputs=[];
 for(const fps of [30,60,165]){const m=new MusicalResponse(),f=frame();let r;for(let i=0;i<fps*8;i++)r=m.update(base(f),f,1/fps,{time:i/fps});outputs.push(r.features.percussive[20]);const frozen=m.update(base(frame(.9)),frame(.9),1,{frozen:true});assert.equal(frozen,r);m.resetEvidence();assert.equal(m.note.length,48);}
 assert.ok(Math.max(...outputs)-Math.min(...outputs)<.006);
 const m=new MusicalResponse(),f=frame(),r=run(m,5,f,{reduced:true});assert.equal(r.weight,0);assert.equal(r.tension,0);
});
test('percussion refinement receives the delayed signal, never the early raw attack',()=>{
 const delay=new VisualSyncBuffer();delay.setDelay(200);const m=new MusicalResponse(),conductor=new VisualConductor();let before=0,after=0;
 for(let i=0;i<250;i++){const f=frame(.2,i===180?.9:.1);if(i===180)f.hits[0]=f.accents[0]=.8;const at=i*1000/60,delayed=delay.process(f,true,at),r=m.update(conductor.update(delayed,1/60),delayed,1/60,{active:delay.active,time:i/60-.2});if(i>=180&&i<192)before=Math.max(before,r.features.transients[0]);if(i>=192)after=Math.max(after,r.features.transients[0]);}
 assert.equal(before,0);assert.ok(after>.1);
});
test('retired style preference is removed and phone code is identical',async()=>{
 for(const style of [undefined,'classic','musical','invalid'])assert.equal('reactivityStyle' in preferencesWithDefaults({reactivityStyle:style}),false);
 for(const name of ['musical-response.js','reactor.js','default-preferences.js','atmosphere-ui.js','gpu-scene.js','scene-shaders.js','particle-spectrum.js'])assert.deepEqual(await fs.readFile('public/'+name),await fs.readFile('android/shared/'+name));
});
