import test from 'node:test';
import assert from 'node:assert/strict';
import {Reactor} from '../public/reactor.js';
import {GPUScene} from '../public/gpu-scene.js';
import {ConstellationScene} from '../public/constellation-scene.js';

const budget=(mobile,quality='eco')=>({mobileRendering:mobile,quality,scale:1,slowFrames:0,fastFrames:0,frameAverage:16.7});
const frames=(state,count,ms,target=60)=>{state.frameAverage=ms;for(let i=0;i<count;i++)Reactor.prototype.adjustRenderScale.call(state,target);};
test('mobile balanced detail adapts to sustained overload, not one slow frame, and recovers gradually',()=>{
 const s=budget(true);frames(s,1,100);assert.equal(s.scale,1);
 frames(s,62,34);assert.ok(s.scale<1);frames(s,1000,40);assert.equal(s.scale,.55);
 frames(s,100,16.7);assert.equal(s.scale,.55);frames(s,2500,16.7);assert.equal(s.scale,1);
});
test('PC fixed detail and mobile high detail keep their existing render resolution',()=>{
 for(const s of [budget(false),budget(false,'high'),budget(true,'high')]){frames(s,1000,60);assert.equal(s.scale,1);}
 const auto=budget(false,'auto');frames(auto,70,34);assert.ok(auto.scale<1);
});
test('a selected 30 FPS target is not treated as thermal overload',()=>{
 const s=budget(true);frames(s,1000,33.4,30);assert.equal(s.scale,1);
});
test('mobile balanced resolution follows the budget without reducing ribbon coverage or desktop size',()=>{
 globalThis.devicePixelRatio=3;
 const input={width:412,height:915,quality:'eco',scale:1,dynamics:{portraitScene:true}};
 const full=GPUScene.prototype.dimensions.call({mobile:true},input);
 const low=GPUScene.prototype.dimensions.call({mobile:true},{...input,scale:.55});
 assert.ok(low.w*low.h<full.w*full.h*.32);assert.ok(full.w>full.h);
 assert.deepEqual(GPUScene.prototype.dimensions.call({mobile:false},{...input,scale:.55}),full);
 delete globalThis.devicePixelRatio;
});
test('Constellation caps Android pixels but preserves desktop and compact desktop detail',()=>{
 globalThis.devicePixelRatio=3;
 for(const [mobile,coarse,ratio] of [[true,true,1],[false,true,1.5],[false,false,2]]){
  const canvas={getBoundingClientRect:()=>({width:412,height:915})},scene={canvas,mobile,coarse};
  ConstellationScene.prototype.resize.call(scene);assert.equal(scene.ratio,ratio);assert.equal(canvas.width,Math.round(412*ratio));
 }
 delete globalThis.devicePixelRatio;
});
