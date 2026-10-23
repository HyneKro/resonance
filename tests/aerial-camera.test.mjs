import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneCamera,AERIAL_CAMERA} from '../public/scene-camera.js';

test('Aerial clamps drag, rail and inertia above its floor, without accumulated overscroll',()=>{
 const c=new SceneCamera();c.update(1/60,{grounded:true});c.drag(100,1e6);
 for(let i=0;i<1800;i++){const pose=c.update(1/60,{grounded:true,rail:true,speed:20,zoom:true,features:{loudness:1,bands:[0,1]}});assert.ok(pose[1]>=AERIAL_CAMERA.min&&pose[1]<=AERIAL_CAMERA.max);assert.equal(pose[3],0);assert.ok(pose.every(Number.isFinite));}
 assert.equal(c.pitch,AERIAL_CAMERA.max);c.drag(0,-20);assert.ok(c.pitch<AERIAL_CAMERA.max);c.drag(0,-1e6);assert.equal(c.pitch,AERIAL_CAMERA.min);c.reset();assert.equal(c.pitch,0);
});

test('entering Aerial normalizes an existing unrestricted orbit, including while frozen',()=>{
 const c=new SceneCamera();c.drag(0,-9000);c.update(.1,{reduced:true});const pose=c.update(.1,{grounded:true,frozen:true});assert.ok(pose[1]>=AERIAL_CAMERA.min);c.update(.1);c.drag(0,9000);assert.ok(c.pitch>Math.PI*2);
});

test('the new low view approaches the floor without crossing it at either dolly limit',()=>{
 assert.ok(AERIAL_CAMERA.min<-.4);
 for(const depth of [-4,0,.4]){const height=Math.sin(AERIAL_CAMERA.min+.25)*(7.2+depth*.19);assert.ok(height>-1.8+.25);assert.ok(height<-.9);}
});
