import test from 'node:test';
import assert from 'node:assert/strict';
import {PanelTrail} from '../public/menu-kit.js';

test('Back follows the actual entry path and restores a panel only once',()=>{
 const trail=new PanelTrail(),restored=[];
 const enter=(key)=>trail.enter(key,{title:key},()=>{const left=trail.current.key;return ()=>restored.push(left);});
 enter('settings');enter('library');enter('sources');enter('online');
 assert.equal(trail.parent.title,'sources');
 assert.equal(trail.back().title,'sources');
 assert.equal(trail.back().title,'library');
 assert.equal(trail.back().title,'settings');
 assert.equal(trail.back(),null);
 // Capture belongs to the panel being left, not the one being entered.
 assert.deepEqual(restored,['sources','library','settings']);
});
test('Background redraws do not add Back steps; returning to an ancestor removes the detour',()=>{
 const trail=new PanelTrail(),noop=()=>()=>{};
 trail.enter('library',{title:'Library'},noop);trail.enter('downloads',{title:'Downloads'},noop);
 for(let i=0;i<20;i++)trail.enter('downloads',{title:'Downloads'},noop);
 assert.equal(trail.entries.length,1);
 trail.enter('matches',{title:'Choose a recording'},noop);
 trail.enter('downloads',{title:'Downloads'},noop);
 assert.equal(trail.entries.length,1);assert.equal(trail.back().title,'Library');
});
test('Separate songs have separate edit contexts; closing drops navigation history',()=>{
 const trail=new PanelTrail(),noop=()=>()=>{};
 trail.enter('details:a',{id:'a'},noop);trail.enter('details:b',{id:'b'},noop);
 assert.equal(trail.back().id,'a');trail.clear();assert.equal(trail.current,null);assert.equal(trail.parent,undefined);assert.equal(trail.back(),null);
});
test('Long browsing sessions retain only a bounded menu history',()=>{
 const trail=new PanelTrail(12);for(let i=0;i<100;i++)trail.enter('song:'+i,{id:i},()=>()=>{});
 assert.equal(trail.entries.length,12);assert.equal(trail.back().id,98);
});
