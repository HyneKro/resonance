import test from 'node:test';
import assert from 'node:assert/strict';
import {MusicalLayers} from '../public/musical-layers.js';
import {AudioFeatures} from '../public/analysis.js';
import {VisualSyncBuffer} from '../public/visual-sync.js';
import {createProjector,projectPoint} from '../public/constellation-space.js';
import {sleeveDesign} from '../public/sleeve-design.js';
test('sustained narrow notes and new broadband attacks drive distinct layers',()=>{
 const m=new MusicalLayers(),tone=new Float32Array(48);tone[20]=.8;tone[27]=.4;
 for(let i=0;i<60;i++)m.update(tone,1/60);
 assert.ok(m.harmonic[20]>.75);assert.ok(m.percussive[20]<.05);
 const burst=new Float32Array(48).fill(.8);m.update(burst,1/60);
 assert.ok(m.percussive[10]>.75);assert.ok(m.harmonic[20]>.15);
 for(let i=0;i<48;i++)assert.ok(Math.abs(m.harmonic[i]+m.percussive[i]-burst[i])<1e-6);
 m.update(burst,1/60,false);assert.ok(m.harmonic.every(v=>v===0));assert.ok(m.percussive.every(v=>v===0));
});
test('bounded masks behave consistently at 30, 60 and 165 Hz',()=>{
 const results=[];
 for(const fps of [30,60,165]){const m=new MusicalLayers(),input=new Float32Array(48);input[16]=.7;for(let i=0;i<fps*4;i++)m.update(input,1/fps);results.push(m.harmonic[16]);assert.equal(m.history.length,624);assert.ok(m.count<=13);}
 assert.ok(Math.max(...results)-Math.min(...results)<.01);
});
test('Bluetooth visual delay includes the new layers',()=>{
 const b=new VisualSyncBuffer();b.setDelay(100);const f=new AudioFeatures();f.harmonic.fill(.2);f.percussive.fill(.3);
 b.process(f,true,0);f.harmonic.fill(.8);f.percussive.fill(.9);b.process(f,true,100);const output=b.process(f,true,150);
 assert.ok(Math.abs(output.harmonic[0]-.5)<.01);assert.ok(Math.abs(output.percussive[0]-.6)<.01);
 assert.equal(new AudioFeatures().harmonic[0],0);
});
test('cached projection preserves rotation, zoom, clipping and parallax',()=>{
 for(const yaw of [-9,0,8])for(const pitch of [-4,0,3])for(const zoom of [.2,1,8]){const pose={yaw,pitch,zoom,center:[70,-30,150]},project=createProjector(pose,1400,800,53);for(const point of [[0,0,0],[10000,-8000,34000],[-400,500,900]]){const old=projectPoint(point,pose,1400,800),next=project(point);if(!old)assert.equal(next,null);else{assert.ok(Math.abs(old.x-next.x)<1e-9);assert.ok(Math.abs(old.y+53-next.y)<1e-9);}}}
});
test('sleeves are deterministic bounded static artwork with distinct genre families',()=>{
 assert.deepEqual(sleeveDesign({id:'a'}),sleeveDesign({id:'a'}));assert.notDeepEqual(sleeveDesign({id:'a'}),sleeveDesign({id:'b'}));assert.equal(sleeveDesign({genre:'Ambient'}).kind,'contour');assert.equal(sleeveDesign({genre:'Techno'}).kind,'pulse');assert.equal(sleeveDesign().paths.length,36);assert.ok(sleeveDesign().paths.every(p=>!p.includes('NaN')));
});
