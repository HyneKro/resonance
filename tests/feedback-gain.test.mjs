import test from 'node:test';import assert from 'node:assert/strict';
import {feedbackGain} from '../public/feedback.js';
import {preferencesWithDefaults} from '../public/default-preferences.js';
test('interface gain is fourfold, still ducks during music, and obeys mute and both volume controls',()=>{
 const audio={volume:.7,paused:true,muted:false};assert.equal(feedbackGain(1,audio),.22*4);assert.equal(feedbackGain(.5,audio),.44);assert.equal(feedbackGain(1,audio,'hover'),.4);
 assert.equal(feedbackGain(1,{...audio,paused:false}),.22*4*.65);assert.equal(feedbackGain(0,audio),0);assert.equal(feedbackGain(1,{...audio,volume:0}),0);assert.equal(feedbackGain(1,{...audio,muted:true}),0);
 assert.equal(preferencesWithDefaults({sfxVolume:1}).sfxVolume,.5);
 const migrated=preferencesWithDefaults({sfxVolume:1});assert.equal(preferencesWithDefaults({...migrated,sfxVolume:.2}).sfxVolume,.2);assert.equal(migrated.sfxGainVersion,2);
});
