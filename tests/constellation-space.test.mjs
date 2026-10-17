import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {describe,cleanMapState} from '../public/constellation-model.js';
import {genreStyle,artistSignature,spacePosition,buildSpace,connections,OrbitCamera,projectPoint,pickSphere} from '../public/constellation-space.js';
import {ConstellationScene} from '../public/constellation-scene.js';
const song=(id,genre='Electronic',artist='Aster')=>describe({id,title:id,genre,artist,available:true});

test('genre colours come from metadata; artist orbits survive cover, title and feature changes',()=>{
 const a=song('a'),b={...song('b'),artwork:'new.jpg',v:[0,0,0,0]};
 assert.equal(genreStyle(a).color,genreStyle(b).color);assert.deepEqual(artistSignature(a),artistSignature(b));
 assert.equal(genreStyle(song('u','')).id,'unknown');assert.equal(genreStyle(song('j','Jazz')).id,'jazz');
 assert.notEqual(genreStyle(a).color,genreStyle(song('r','Metal')).color);
 const featured={...song('f'),artists:['Aster','Guest']};assert.deepEqual(artistSignature(featured).names,['Aster','Guest']);
});
test('3D layouts remain stable as songs are added and retain old bookmarks and offline positions',()=>{
 const a=song('a'),b=song('b'),p=spacePosition(a);assert.equal(p.length,3);assert.ok(p.every(Number.isFinite));assert.notDeepEqual(p,spacePosition(b));
 const state=cleanMapState({version:1,positions:{a:[1,2]},space:{a:p,b:[1,2,'3'],x:[1,2,3]},places:[{id:'a',name:'Home',zoom:2}]},['a','b']);
 assert.equal(state.version,2);assert.deepEqual(state.space,{a:p});assert.equal(state.places[0].name,'Home');
 const data=buildSpace([{...a,v:[1,1,1,1]},b],state.space);assert.deepEqual(data.points[0].position,p);
 assert.deepEqual(buildSpace([b,a],state.space).points[1].position,p);
 assert.deepEqual(cleanMapState(state,['a']).space.a,p);
});
test('shared guest artists create explicit connections; the large-library graph stays sparse',()=>{
 const nodes=Array.from({length:2500},(_,i)=>song('s'+i,i%2?'Metal':'Ambient','Artist '+i%30));nodes[1].artists=['Other','Guest'];nodes[2].artists=['Guest'];
 const before=performance.now(),data=buildSpace(nodes),links=connections(data.points,'s1');
 assert.ok(links.some(l=>l[1]==='s2'&&l[2]==='artist'));assert.ok(links.length<=13);assert.ok(data.links.length<900);assert.ok(performance.now()-before<2000);
});
test('perspective has real depth and smooth unrestricted vertical orbit without angle wrapping jumps',()=>{
 const camera=new OrbitCamera();const near=projectPoint([100,0,-300],camera.pose,1000,600),far=projectPoint([100,0,300],camera.pose,1000,600);
 assert.ok(near.scale>far.scale);assert.ok(near.x>far.x);assert.equal(projectPoint([0,0,-1300],camera.pose,1000,600),null);
 camera.drag(9000,9000);let last=0;for(let i=0;i<300;i++){const p=camera.update(1/60);assert.ok(p.pitch>=last);assert.ok(Number.isFinite(projectPoint([30,20,10],p,1000,600)?.x));last=p.pitch;}assert.ok(last>Math.PI*2);
 camera.home();const before=camera.pose.pitch;camera.update(1/60);assert.ok(Math.abs(camera.pose.pitch-before)<.7);
 camera.scale(999);assert.equal(camera.zoom,8);camera.scale(-9);assert.equal(camera.zoom,.65);
});
test('picking chooses the visible front sphere before a wider touch target',()=>{
 const hits=[{id:'far',x:100,y:100,radius:10,depth:500},{id:'near',x:103,y:100,radius:10,depth:100}];
 assert.equal(pickSphere(hits,100,100).id,'near');assert.equal(pickSphere(hits,122,100,true).id,'near');assert.equal(pickSphere(hits,300,300,true),undefined);
});
test('drag, pinch, cancellation and lost capture never accidentally start a song',()=>{
 let played=[];const canvas={getBoundingClientRect:()=>({left:0,top:0}),setPointerCapture:()=>{},style:{}};
 const scene=Object.assign(Object.create(ConstellationScene.prototype),{canvas,camera:new OrbitCamera(),pointers:new Map(),hits:[{node:{id:'song'},x:100,y:100,radius:8,depth:100}],onSelect:id=>played.push(id)});
 const original=globalThis.window;globalThis.window={addEventListener:()=>{}};
 try{scene.bind();const e=(id,x,y,extra={})=>({pointerId:id,clientX:x,clientY:y,button:0,pointerType:'touch',stopPropagation(){},...extra});
  canvas.onpointerdown(e(1,100,100));canvas.onpointerup(e(1,100,100));assert.deepEqual(played,['song']);played=[];
  canvas.onpointerdown(e(1,100,100));canvas.onpointermove(e(1,130,110));canvas.onpointerup(e(1,100,100));assert.equal(played.length,0);
  canvas.onpointerdown(e(1,100,100));canvas.onpointerdown(e(2,160,160));canvas.onpointerup(e(2,160,160));canvas.onpointerup(e(1,100,100));assert.equal(played.length,0);
  canvas.onpointerdown(e(1,100,100));canvas.onpointercancel();canvas.onpointerup(e(1,100,100));assert.equal(played.length,0);
  canvas.onpointerdown(e(1,100,100));canvas.onlostpointercapture(e(1,100,100));canvas.onpointerup(e(1,100,100));assert.equal(played.length,0);
  const before=[...scene.camera.center],yaw=scene.camera.yaw;canvas.onpointerdown(e(1,100,100,{button:2,pointerType:'mouse'}));canvas.onpointermove(e(1,150,130,{button:2,pointerType:'mouse'}));canvas.onpointerup(e(1,100,100,{button:2,pointerType:'mouse'}));assert.equal(played.length,0);assert.notDeepEqual(scene.camera.center,before);assert.equal(scene.camera.yaw,yaw);
 }finally{globalThis.window=original;}
});
test('map mode only suspends graphics and preserves both existing viewing modes in each runtime',async()=>{
 const reactor=await fs.readFile('public/reactor.js','utf8'),method=reactor.slice(reactor.indexOf('  setSceneSuspended'),reactor.indexOf('  start(){'));
 assert.doesNotMatch(method,/\.pause\(|\.dispose\(|this\.musicOnly\s*=/);assert.match(method,/cancelAnimationFrame/);
 for(const name of ['constellation.js','constellation-space.js','constellation-scene.js','constellation-sky.js','constellation-model.js','constellation.css','artist-credits.js','reactor.js','dance-companion.js'])assert.equal(await fs.readFile('public/'+name,'utf8'),await fs.readFile('android/shared/'+name,'utf8'),name);
});
