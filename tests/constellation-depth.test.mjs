import test from 'node:test';
import assert from 'node:assert/strict';
import {backdropStars,projectBackdrop} from '../public/constellation-sky.js';
import {placeMapLabels} from '../public/constellation-space.js';
import {SceneReveal} from '../public/scene-reveal.js';

test('background layers have true depth parallax, stable positions and bounded density',()=>{
 const stars=backdropStars(),phone=backdropStars(true);assert.deepEqual(stars,backdropStars());assert.ok(stars.length<1800);assert.ok(phone.length<1000);
 const radii=new Set(stars.map(s=>Math.round(Math.hypot(...s.point))));assert.ok(radii.size>stars.length*.85,'continuous depth rather than shared spherical shells');
 const pose={yaw:0,pitch:0,zoom:1,center:[0,0,0]},moved={...pose,center:[200,0,0]};
 const shift=distance=>{const star={point:[0,0,distance]};return Math.abs(projectBackdrop(star,moved,1200,800).x-projectBackdrop(star,pose,1200,800).x);};
 assert.ok(shift(5200)>shift(13000)*1.7);assert.ok(shift(13000)>shift(34000)*1.7);
 const a=projectBackdrop({point:[0,0,5200]},pose,1200,800),b=projectBackdrop({point:[0,0,5200]},{...pose,yaw:.2},1200,800);assert.notEqual(a.x,b.x);
});

test('crowded map labels never overlap each other, song captions or reserved UI',()=>{
 const bounds={x:20,y:190,width:720,height:340},caption={x:280,y:280,width:160,height:26};
 const candidates=Array.from({length:25},(_,i)=>({id:i,x:290+i%4*70,y:280+i%3*50,width:135,height:32}));
 const labels=placeMapLabels(candidates,bounds,[caption],8);assert.ok(labels.length>0&&labels.length<=8);
 for(const [i,a] of labels.entries()){
  assert.ok(a.x>=bounds.x&&a.y>=bounds.y&&a.x+a.width<=bounds.x+bounds.width&&a.y+a.height<=bounds.y+bounds.height);
  for(const b of [caption,...labels.slice(i+1)])assert.ok(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y);
 }
 assert.deepEqual(placeMapLabels(candidates,{x:0,y:0,width:20,height:20}),[]);
});

test('Constellation return has its own loading surface and cannot reveal Music only',()=>{
 const classes=new Set(),statuses=new Map(),buttons=new Map(),timers=[];
 const root={classList:{add:(...x)=>x.forEach(v=>classes.add(v)),remove:(...x)=>x.forEach(v=>classes.delete(v))},querySelector(selector){
  if(selector.includes('loading')){if(!statuses.has(selector))statuses.set(selector,{hidden:true,querySelector:()=>({textContent:''})});return statuses.get(selector);}
  if(!buttons.has(selector))buttons.set(selector,{setAttribute(){},removeAttribute(){}});return buttons.get(selector);
 }};
 const reveal=new SceneReveal(root,{schedule:fn=>{timers.push(fn);return timers.length;},unschedule(){}});
 reveal.begin('constellation');assert.ok(classes.has('constellation-return'));assert.ok(!classes.has('visualizer-return'));assert.equal(statuses.get('#scene-loading').hidden,false);
 reveal.ready();reveal.begin('constellation');timers[0]();assert.ok(classes.has('visualizer-preparing'));
 reveal.cancel();assert.equal(classes.size,0);assert.equal(statuses.get('#scene-loading').hidden,true);
 reveal.begin();assert.ok(classes.has('visualizer-return'));assert.ok(!classes.has('constellation-return'));reveal.cancel();
});
