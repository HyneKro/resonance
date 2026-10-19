import test from 'node:test';import assert from 'node:assert/strict';
import {DEFAULT_PREFERENCES,preferencesWithDefaults} from '../public/default-preferences.js';
import {CharacterMixer,createTrackCharacter} from '../public/track-character.js';
import {VisualConductor} from '../public/visual-conductor.js';
import {DanceMotion} from '../public/dance-companion.js';

test('bonus migration starts the companion off, retains subsequent choices and retires scope',()=>{
 assert.equal(DEFAULT_PREFERENCES.danceCompanion,false);assert.equal(DEFAULT_PREFERENCES.kaleidoscope,false);
 const first=preferencesWithDefaults({danceCompanion:true,kaleidoscope:.2,oscilloscope:1});
 assert.equal(first.danceCompanion,false);assert.equal(first.kaleidoscope,true);assert.equal(first.oscilloscope,undefined);
 assert.equal(preferencesWithDefaults({...first,danceCompanion:true}).danceCompanion,true);
 assert.equal(preferencesWithDefaults({...first,kaleidoscope:false}).kaleidoscope,false);
});
test('disabled character preserves exactly the same topology across songs and researched identities',()=>{
 const mixer=new CharacterMixer(),reference=mixer.update(0,{enabled:false});
 for(let i=0;i<30;i++){
  mixer.select(createTrackCharacter({id:String(i),title:'Song '+i,genre:i%2?'Metal':'Ambient'}),'session '+i);
  for(let j=0;j<60;j++)assert.deepEqual(mixer.update(1/60,{enabled:false}),reference);
 }
});
const sound=band=>{const bands=new Float32Array(8);bands[band]=1;return {db:-28,loudness:.7,bands,timbreBands:bands,accents:[0,0,0]};};
test('track gaps retain the ribbon shape and high response cannot cause rapid winding changes',()=>{
 for(const fps of [30,60,165]){
  const c=new VisualConductor();for(let i=0;i<fps*12;i++)c.update(sound(0),1/fps,{responsiveness:8});
  const prior=[...c.morph],clock=c.clock;
  for(let i=0;i<fps*3;i++)c.update({...sound(0),db:-100},1/fps,{responsiveness:8,active:false});
  assert.deepEqual([...c.morph],prior);assert.ok(c.clock>clock);
  let previous=[...c.morph],maxStep=0;
  for(let i=0;i<fps*8;i++){const out=c.update(sound(3),1/fps,{responsiveness:8});for(let j=0;j<4;j++)maxStep=Math.max(maxStep,Math.abs(out.morph[j]-previous[j]));previous=[...out.morph];}
  assert.ok(maxStep*fps<.8,`bounded structural speed at ${fps} FPS: ${maxStep*fps}`);
  assert.ok(c.morph[1]>prior[1]+.3,'midrange still bends the ribbon');
 }
});
test('listening routines use the head-bob artwork and resume after pause',()=>{
 const d=new DanceMotion(),phrases=new Set();
 for(let i=0;i<24*110;i++){const p=d.update(1/24,{active:true,bpm:120,confidence:1});phrases.add(p.name);if(p.name==='head-bob')assert.equal(p.row,0);}
 assert.ok(phrases.has('head-bob'));assert.ok(!phrases.has('two-step'));assert.equal(phrases.size,7);const before=d.beats;d.update(.1,{active:false});assert.equal(d.beats,before);d.resume();assert.notEqual(d.update(.1,{active:true}).state,'sleep');
});
