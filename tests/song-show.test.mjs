import test from 'node:test';import assert from 'node:assert/strict';
import {AtmosphereTransition} from '../public/atmosphere-transition.js';
import {createTrackCharacter} from '../public/track-character.js';
import {sculptureFor,SculptureMorph,SCULPTURE_NAMES} from '../public/sculpture-forms.js';
import {interactionSound} from '../public/feedback.js';

const identity=n=>({signature:Array(4).fill(n),character:Array(4).fill(n),themes:Array(6).fill(n),recipe:Array(8).fill(n)});
test('24 sculpture families are reachable and rapid skips preserve the current morph',()=>{
 const ids=new Set();for(let i=0;i<700;i++)ids.add(sculptureFor(createTrackCharacter({id:String(i),title:'track '+i})));assert.equal(ids.size,SCULPTURE_NAMES.length);
 const m=new SculptureMorph();m.update(2,0);const a=m.update(8,.05),b=m.update(17,.05);assert.equal(a[0],b[0]);assert.equal(a[1],b[1]);assert.ok(b[2]>a[2]);assert.deepEqual(m.update(4,1,{frozen:true}),b);for(let i=0;i<200;i++)m.update(17,.1);assert.equal(m.to,17);assert.equal(m.progress,1);
});
test('sound gestures have distinct layered timbres, bounded envelopes and stable pitches',()=>{
 const kinds=['hover','click','navigate','back','favorite','adjust'];const scores=kinds.map(k=>interactionSound(k,2));assert.equal(new Set(scores.map(JSON.stringify)).size,kinds.length);assert.deepEqual(interactionSound('click',2),interactionSound('click',2));assert.ok(interactionSound('favorite').tones.length>interactionSound('hover').tones.length);for(const s of scores)for(const[f,delay,length,gain]of s.tones){assert.ok(f>100&&f<4000);assert.ok(delay>=0&&length<.6);assert.ok(gain>0&&gain<=1);}
});
