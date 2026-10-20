import test from 'node:test';
import assert from 'node:assert/strict';
import {preferencesWithDefaults} from '../public/default-preferences.js';
import {libraryCollections,collectionTracks} from '../public/smart-collections.js';
import {activityRows,beginActivity} from '../public/library-activity.js';
import {editionListeningStats} from '../public/music-edition.js';

test('listening defaults are enabled without overwriting an explicit saved choice',()=>{
 assert.equal(preferencesWithDefaults().leveling,true);
 assert.equal(preferencesWithDefaults().skipSilence,true);
 const saved=preferencesWithDefaults({leveling:false,skipSilence:false});
 assert.equal(saved.leveling,false);assert.equal(saved.skipSilence,false);
});
test('starter collections exist without preferences and remain live as songs change',()=>{
 const now=Date.now(),tracks=[
  {id:'a',title:'A',available:true,duration:200,plays:0,addedAt:now},
  {id:'b',title:'B',available:true,duration:400,plays:2,favorite:true,lastPlayed:now-40*86400000},
  {id:'c',title:'C',available:false,duration:100,plays:0,addedAt:now},
 ];
 const cs=libraryCollections([]);assert.equal(cs.length,4);
 assert.deepEqual(collectionTracks(tracks,cs[0],now).map(t=>t.id),['a']);
 assert.deepEqual(collectionTracks(tracks,cs[1],now).map(t=>t.id),['b']);
 tracks[0].plays=1;assert.equal(collectionTracks(tracks,cs[0]).length,0);
 assert.equal(libraryCollections([{id:'mine',name:'Mine',rules:{}},{id:'builtin-unheard',name:'Duplicate',rules:{}}]).length,5);
});
test('activity distinguishes unknown totals, current-file measurement, paused work and failed work',()=>{
 const rows=activityRows({scan:{running:true,found:12},sync:{running:true,phase:'downloading',processed:2,total:10,errors:['unavailable']},genres:{running:false,done:4,total:8},analysis:{running:true,progress:.4}});
 assert.equal(rows[0].progress,null);assert.match(rows[0].detail,/12 files/);
 assert.equal(rows[1].progress,.2);assert.match(rows[1].detail,/8 remaining/);assert.equal(rows[1].errors,1);
 assert.match(rows[3].detail,/paused or stopped/);
 assert.equal(rows[5].progress,.4);
 assert.match(rows.at(-1).detail,/selected songs/);assert.equal(rows.at(-1).running,false);
 assert.equal(activityRows({}, {lyrics:{active:2,done:3,errors:0}}).at(-1).running,true);
 assert.doesNotThrow(()=>{const done=beginActivity('lyricsRequest');done();done();});
});
test('music edition uses recorded listening history, including an empty history',()=>{
 assert.deepEqual(editionListeningStats({plays:7,listenedSeconds:5400,duration:245}).map(s=>s.value),['07','1.5 h','4:05']);
 assert.deepEqual(editionListeningStats().map(s=>s.value),['00','0 s','—']);
});
