import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSegment,OrbitCamera} from '../public/constellation-space.js';
import {projectBackdrop} from '../public/constellation-sky.js';
import {songTrail} from '../public/constellation-navigation.js';
import {ConstellationScene} from '../public/constellation-scene.js';

test('route segments survive offscreen endpoints and clip safely at the camera near plane',()=>{
 const pose={yaw:0,pitch:0,zoom:8,center:[0,0,0]};
 const across=projectSegment([-2000,0,0],[2000,0,0],pose,1200,800);
 assert.equal(across.a.x,0);assert.equal(across.b.x,1200);
 const near=projectSegment([-100,30,-300],[200,80,300],pose,1200,800);
 assert.ok(near);for(const p of [near.a,near.b])assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1200&&p.y>=0&&p.y<=800);
 assert.equal(projectSegment([0,0,-300],[20,0,-400],pose,1200,800),null);
});
test('zoom travels through the depth field with a stronger effect on nearby stars',()=>{
 const pose={yaw:0,pitch:0,zoom:.3,center:[0,0,0]};
 const shift=z=>{const a=projectBackdrop({point:[800,80,z]},pose,1200,800),b=projectBackdrop({point:[800,80,z]},{...pose,zoom:4},1200,800);return b.x-a.x;};
 assert.ok(shift(2600)>shift(10000)*4);assert.ok(shift(10000)>shift(34000)*4);
});
test('find playing can expose every navigation ancestor including unknown genres',()=>{
 assert.deepEqual(songTrail({id:'a',title:'Orbit',artist:'Aster feat. Guest',genre:'House'}).map(x=>x.id),['home','genre:electronic','artist:aster','song:a']);
 assert.equal(songTrail({id:'b',title:'Unknown',artist:''})[1].id,'genre:unknown');
});
test('scene labels pass right-drag and zoom to the camera without starting a track or blocking panel scrolling',()=>{
 const handlers={},canvas={style:{},setPointerCapture(){},getBoundingClientRect:()=>({left:0,top:0})},root={addEventListener:(name,fn)=>handlers[name]=fn};
 const scene=Object.assign(Object.create(ConstellationScene.prototype),{canvas,gestureRoot:root,camera:new OrbitCamera(),pointers:new Map(),hits:[],onSelect:()=>assert.fail('pan started playback')});
 const old=globalThis.window;globalThis.window={addEventListener(){}};
 try{scene.bind();const label={closest:s=>s==='.cx-groups'?{}:null},event={target:label,button:2,pointerId:1,clientX:100,clientY:100,preventDefault(){},stopPropagation(){}};
  handlers.pointerdown(event);canvas.onpointermove({...event,clientX:140,clientY:125});canvas.onpointerup(event);assert.notDeepEqual(scene.camera.center,[0,0,0]);assert.equal(scene.camera.yaw,0);
  handlers.wheel({...event,deltaY:-200});assert.ok(scene.camera.zoom>1);const zoom=scene.camera.zoom;handlers.wheel({...event,target:{closest:()=>null},deltaY:-200});assert.equal(scene.camera.zoom,zoom);
 }finally{globalThis.window=old;}
});
