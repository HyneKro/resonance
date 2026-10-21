import test from 'node:test';
import assert from 'node:assert/strict';
import {ScenePreparation,yieldSceneWork} from '../public/scene-preparation.js';
import {compileSceneProgram} from '../public/shader-loader.js';
import {GPUScene} from '../public/gpu-scene.js';
import {HDROutput,preflightHDROutput} from '../public/hdr-output.js';

test('particle generation keeps its deterministic sequence across short work slices',async()=>{
 let time=0,yields=0,seed=8217;const values=new Float32Array(32768);
 const work=new ScenePreparation({now:()=>time,yieldWork:async()=>{yields++;}});
 await work.fill(values.length,i=>{seed=(seed*1664525+1013904223)>>>0;values[i]=seed/4294967296;time+=.005;});
 assert.ok(yields>20);seed=8217;
 for(const value of values){seed=(seed*1664525+1013904223)>>>0;assert.equal(value,Math.fround(seed/4294967296));}
});

test('graphics uploads are bounded, exact, and cancellation stops before another upload',async()=>{
 let yields=0,cancel=false,allocated=0;const writes=[],source=new Float32Array(180000).map((_,i)=>i);
 const gl={ARRAY_BUFFER:1,bindBuffer(){},bufferData(_target,size){allocated=size;},bufferSubData(_target,offset,data){writes.push({offset,data:data.slice(),frame:yields});}};
 const work=new ScenePreparation({cancelled:()=>cancel,yieldWork:async()=>{yields++;}});
 await work.upload(gl,{},source,2);assert.equal(allocated,source.byteLength);assert.equal(writes.length,3);
 for(let i=0;i<writes.length;i++){const w=writes[i];assert.ok(w.data.byteLength<=262144);assert.deepEqual(w.data,source.subarray(w.offset/4,w.offset/4+w.data.length));if(i)assert.ok(w.frame>writes[i-1].frame);}
 const stopped=new ScenePreparation({cancelled:()=>cancel,yieldWork:async()=>{cancel=true;}});
 const count=writes.length;await assert.rejects(stopped.upload(gl,{},source,2),/cancelled/);assert.equal(writes.length,count);
});

test('GPU completion is polled without blocking and releases its fence on cancellation',async()=>{
 let yields=0,polls=0,deleted=0,cancel=false;
 const gl={SYNC_GPU_COMMANDS_COMPLETE:1,TIMEOUT_EXPIRED:2,WAIT_FAILED:3,fenceSync:()=>({}),flush(){},clientWaitSync(_f,flags,timeout){assert.equal(flags,0);assert.equal(timeout,0);return ++polls<3?2:4;},deleteSync(){deleted++;}};
 const work=new ScenePreparation({cancelled:()=>cancel,yieldWork:async()=>{yields++;}});
 await work.drain(gl);assert.equal(yields,3);assert.equal(deleted,1);
 work.yieldWork=async()=>{cancel=true;};await assert.rejects(work.drain(gl),/cancelled/);assert.equal(deleted,2);
});

test('shader submissions each allow a paint before the next compile or link',async()=>{
 let frame=0;const submissions=[];
 const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,createProgram:()=>({}),getExtension:()=>null,createShader:()=>({}),shaderSource(){},compileShader(){submissions.push(frame);},attachShader(){},linkProgram(){submissions.push(frame);},flush(){},getProgramParameter:()=>true,deleteShader(){},deleteProgram(){}};
 await compileSceneProgram(gl,'vertex','fragment',null,{yieldWork:async()=>{frame++;}});
 assert.deepEqual(submissions,[0,1,2]);assert.equal(frame,3);
});

test('the first live frame waits for staged warm-up at both small and final resolution',async()=>{
 const scene=Object.create(GPUScene.prototype),events=[];let frame=0;
 Object.assign(scene,{ready:true,generation:1,gl:{},output:{update(){}},work:{async checkpoint(){frame++;},async drain(){frame++;},check(){}},
  dimensions:()=>({w:1920,h:1080}),async prepareTargets(w,h){events.push(['targets',w,h,frame]);frame++;},
  *renderFrame(_input,warm=false){for(let i=0;i<3;i++){events.push([warm?'small':'full',i,frame]);yield;}},fail(e){throw e;}});
 assert.equal(scene.draw({}),false);assert.equal(scene.draw({}),false);assert.notEqual(scene.warmed,true);
 await scene.warming;assert.equal(scene.warmed,true);
 assert.deepEqual(events.filter(e=>e[0]==='targets').map(e=>e.slice(1,3)),[[64,64],[1920,1080]]);
 const passes=events.filter(e=>e[0]!=='targets');assert.equal(passes.length,21);assert.equal(passes.filter(p=>p[0]==='small').length,18);
 assert.ok(passes.every((p,i)=>i===0||p.at(-1)>passes[i-1].at(-1)));
 assert.equal(scene.draw({}),true);assert.equal(events.filter(e=>e[0]==='targets').length,2);
});

test('a saved alternate direction also warms the original before any switch back',async()=>{
 const scene=Object.create(GPUScene.prototype),styles=[];
 Object.assign(scene,{ready:true,generation:1,gl:{},output:{update(){}},work:{async checkpoint(){},async drain(){},check(){}},dimensions:()=>({w:100,h:100}),async prepareTargets(){},*renderFrame(input){styles.push(input.dynamics.artStyle.index);yield;},fail(e){throw e;}});
 await scene.warm({dynamics:{artStyle:{index:2,opacity:1}}});assert.deepEqual(new Set(styles),new Set([0,1,2,3,4,5]));assert.equal(scene.warmed,true);
});

test('disposing while warming prevents a stale scene from being revealed',async()=>{
 const scene=Object.create(GPUScene.prototype);let cancelled=false,failed=false;
 Object.assign(scene,{ready:true,generation:1,output:{update(){}},work:new ScenePreparation({cancelled:()=>cancelled,yieldWork:async()=>{cancelled=true;scene.generation++;}}),
  async prepareTargets(){await this.work.checkpoint();},fail(){failed=true;}});
 assert.equal(scene.draw({}),false);await scene.warming;assert.notEqual(scene.warmed,true);assert.equal(failed,false);
});

test('preparation still progresses when no animation frame is delivered',async()=>{
 await yieldSceneWork();
});

test('HDR discovery is done once before animation and its adapter is consumed by presentation',async()=>{
 const savedNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator'),savedMedia=globalThis.matchMedia;let requests=0,devices=0;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{gpu:{async requestAdapter(){requests++;return {async requestDevice(){devices++;throw Error('Test device unavailable');}};}}}});
 globalThis.matchMedia=()=>({matches:false});
 try{
  await preflightHDROutput('off');await preflightHDROutput('auto');assert.equal(requests,0);
  await preflightHDROutput('on');await preflightHDROutput('on');assert.equal(requests,1);
  const output=Object.assign(Object.create(HDROutput.prototype),{generation:0,onChange(){}});
  await output.prepare();assert.equal(requests,1);assert.equal(devices,1);assert.equal(output.state,'unavailable');
  await output.prepare();assert.equal(requests,2);assert.equal(devices,2);
 }finally{if(savedNavigator)Object.defineProperty(globalThis,'navigator',savedNavigator);else delete globalThis.navigator;if(savedMedia===undefined)delete globalThis.matchMedia;else globalThis.matchMedia=savedMedia;}
});
