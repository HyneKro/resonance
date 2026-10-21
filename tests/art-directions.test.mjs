import test from 'node:test';
import assert from 'node:assert/strict';
import {ART_DIRECTIONS,ArtDirectionTransition,ArtWorldMotion,artDirection} from '../public/art-directions.js';
import {attractorCurves,ATTRACTOR_SAMPLES} from '../public/attractor-curves.js';
import {SCULPTURE_NAMES,sculptureChoice,expandedSculpture} from '../public/sculpture-forms.js';
import {CharacterMixer,createTrackCharacter} from '../public/track-character.js';
import {preferencesWithDefaults} from '../public/default-preferences.js';
import {portablePreferences} from '../public/portable-settings.js';

test('existing preferences retain Resonance; invalid or imported style choices are safe',()=>{
 assert.equal(preferencesWithDefaults({}).artDirection,'resonance');
 assert.equal(preferencesWithDefaults({}).ribbonShape,undefined);
 assert.equal(ART_DIRECTIONS.length,8);assert.equal(new Set(ART_DIRECTIONS.map(a=>a.id)).size,8);
 for(const value of [null,{},42,'form--1','form-30','form-NaN','nope'])assert.equal(sculptureChoice(value),'auto');
 assert.equal(artDirection('unknown').id,'resonance');
 assert.equal(preferencesWithDefaults({artDirection:'glasshouse'}).artDirection,'afterglow');
 for(const a of ART_DIRECTIONS){const p=preferencesWithDefaults(portablePreferences({artDirection:a.id,ribbonShape:'form-24'}));assert.equal(p.artDirection,a.id);assert.equal(p.ribbonShape,undefined);}
});

test('rapid style choices settle on the last destination, changing topology only in darkness',()=>{
 const transition=new ArtDirectionTransition();assert.equal(transition.update('resonance',0).opacity,1);
 let prior='resonance';for(let i=0;i<180;i++){
  const requested=i<12?'glasshouse':i<36?'contour':'orrery',value=transition.update(requested,1/60);
  assert.ok(value.opacity>=0&&value.opacity<=1);
  if(value.id!==prior)assert.equal(value.opacity,0);prior=value.id;
 }
 assert.equal(transition.current,'orrery');assert.equal(transition.opacity,1);assert.equal(transition.active,false);
 assert.deepEqual(transition.update('contour',0,{reduced:true}),{id:'contour',index:4,opacity:1});
 assert.equal(transition.active,false);
});

test('attractor preparation yields, stays bounded and produces distinct deterministic curves',async()=>{
 let checkpoints=0;const a=await attractorCurves(async()=>{checkpoints++;}),b=await attractorCurves();
 assert.deepEqual(a,b);assert.ok(checkpoints>=10);assert.equal(a.length,ATTRACTOR_SAMPLES*8);
 assert.ok(a.every(Number.isFinite));assert.ok(a.every(x=>Math.abs(x)<1.34));
 const separation=a.slice(0,ATTRACTOR_SAMPLES*4).reduce((sum,x,i)=>sum+Math.abs(x-a[ATTRACTOR_SAMPLES*4+i]),0);assert.ok(separation>1000);
 for(let row=0;row<2;row++){let travel=0;for(let i=1;i<ATTRACTOR_SAMPLES;i++){const at=(row*ATTRACTOR_SAMPLES+i)*4;travel+=Math.hypot(a[at]-a[at-4],a[at+1]-a[at-3],a[at+2]-a[at-2]);}assert.ok(travel>10&&travel<2000);}
});

test('all thirty shapes are selectable independently of automatic track direction',()=>{
 for(let i=0;i<SCULPTURE_NAMES.length;i++){
  const mixer=new CharacterMixer(),result=mixer.update(.016,{shape:'form-'+i,enabled:false});assert.equal(result.sculpture[1],i);
 }
 const discovered=new Set();for(let i=0;i<500;i++){const p=createTrackCharacter({title:'Test '+i,artist:'Test artist'}),id=expandedSculpture(p);if(id!==null)discovered.add(id);}
 assert.equal(discovered.size,6);
});

test('world travel is continuous through attacks and honors freeze and reduced motion',()=>{
 const world=new ArtWorldMotion();let prior=world.update(.016,{});
 for(let i=0;i<600;i++){
  const roles=i%120<60?{bass:1,drums:1,lead:1}:{};
  const value=world.update(1/60,roles);
  value.forEach((x,j)=>{assert.ok(x>=prior[j]);assert.ok(x-prior[j]<.08);});prior=value;
 }
 assert.deepEqual(world.update(30,{bass:1},{frozen:true}),prior);
 assert.deepEqual(world.update(30,{bass:1},{reduced:true}),prior);
 assert.deepEqual(world.update(.1,{bass:1},{movement:0}),prior);
 const after=world.update(30,{});after.forEach((x,j)=>assert.ok(x-prior[j]<.47));
});
