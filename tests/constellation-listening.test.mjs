import test from 'node:test';
import assert from 'node:assert/strict';
import {listeningPath,pointOnLink,discoveryPicks} from '../public/constellation-listening.js';
import {describe} from '../public/constellation-model.js';
import {createProjector,projectSegment} from '../public/constellation-space.js';
import {upcomingIds} from '../android/web/mobile-queue.js';

test('phone path reads a bounded horizon in native shuffle order without copying a whole library',()=>{
 const snapshot={id:'c',queue:['a','b','c','d','e'],playbackOrder:['a','e','c','b','d']};
 assert.deepEqual(upcomingIds(snapshot,3),['c','b','d']);
 assert.deepEqual(upcomingIds(snapshot,5),['c','b','d','a','e']);
 assert.deepEqual(upcomingIds(snapshot),['c','b','d','a','e']);
 assert.deepEqual(upcomingIds(snapshot,0),[]);
});

test('live path preserves actual shuffled order, caps its horizon and stops at missing stars',()=>{
 const snapshot={id:'a',ids:['a','e','b','d','c','f'],duration:200,time:70};
 assert.deepEqual(listeningPath(snapshot).path,['a','e','b','d','c']);
 assert.deepEqual(listeningPath(snapshot,new Set(['a','e','d','c'])).path,['a','e']);
 assert.deepEqual(listeningPath({...snapshot,id:''}).path,[]);
 assert.deepEqual(listeningPath(snapshot,new Set()).path,[]);
 assert.deepEqual(snapshot.ids,['a','e','b','d','c','f']);
});
test('travel uses the audible range, pause and seeks exactly; unknown duration invents no progress',()=>{
 const snapshot={id:'a',ids:['a','b'],duration:220,range:{start:10,end:210},time:60};
 assert.equal(listeningPath(snapshot).progress,.25);
 assert.equal(listeningPath({...snapshot,paused:true}).progress,.25);
 assert.equal(listeningPath({...snapshot,time:160}).progress,.75);
 assert.equal(listeningPath({...snapshot,time:-10}).progress,0);
 assert.equal(listeningPath({...snapshot,time:999}).progress,1);
 assert.equal(listeningPath({...snapshot,duration:NaN}).measured,false);
 assert.equal(listeningPath({...snapshot,duration:0}).progress,0);
 assert.equal(listeningPath({...snapshot,range:{start:NaN,end:Infinity}}).progress,60/220);
});
test('repeat-one circles the current star; queue cycles retain their actual repeated entry',()=>{
 const state={id:'a',ids:['a','b','c','a','d'],duration:100,time:50};
 assert.deepEqual(listeningPath({...state,repeatOne:true}).ids,['a']);
 assert.deepEqual(listeningPath(state).path,['a','b','c']);
 assert.equal(listeningPath(state).returning,true);
 assert.deepEqual(listeningPath(state).ids,state.ids);
});
test('progress remains in world space when zooming, panning and clipping the connection',()=>{
 const a=[-1000,100,-400],b=[1200,-300,600],point=pointOnLink(a,b,.4);
 assert.deepEqual(point,[-120,-60,0]);
 for(const pose of [{yaw:0,pitch:0,zoom:1,center:[0,0,0]},{yaw:.5,pitch:.2,zoom:3,center:[300,40,0]}]){
  const project=createProjector(pose,1000,600,50),head=project(point),edge=projectSegment(a,point,pose,1000,600,{top:50,clipWidth:2000,clipHeight:1000});
  if(head&&edge&&head.x>=0&&head.x<=2000&&head.y>=0&&head.y<=1000){assert.ok(Math.abs(head.x-edge.b.x)<.001);assert.ok(Math.abs(head.y-edge.b.y)<.001);}
 }
 assert.deepEqual(pointOnLink(a,b,2),b);assert.deepEqual(pointOnLink(a,b,NaN),a);
});
test('discoveries explain local evidence, avoid current and queued songs, and vary on request',()=>{
 const tracks=Array.from({length:60},(_,i)=>describe({id:String(i),title:'Track '+i,artist:'Artist '+i,genre:i%3?'Electronic':'Jazz',plays:i%4===0?0:3,available:i!==59}));
 const results=discoveryPicks(tracks,'1',{excluded:['2','3','4']});
 assert.equal(results.length,3);assert.equal(new Set(results.map(x=>x.track.id)).size,3);
 for(const r of results){assert.ok(!['1','2','3','4','59'].includes(r.track.id));assert.ok(r.reason);}
 assert.equal(results.find(r=>r.label==='A first listen').track.plays,0);
 assert.equal(results.find(r=>r.label==='A different direction').track.genre,'Jazz');
 assert.ok(new Set(Array.from({length:20},(_,seed)=>discoveryPicks(tracks,'1',{seed})[0].track.id)).size>1);
 assert.deepEqual(discoveryPicks([],''),[]);
 const unknown=[describe({id:'a',artist:'One'}),describe({id:'b',artist:'Two'})];
 assert.ok(discoveryPicks(unknown,'a').every(p=>!p.reason.includes('Similar')&&!p.reason.includes('genre family')));
});
