import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {describe,summarizeProfile,makeMap,cleanMapState,neighbours,reasons,journey,queueWithJourney} from '../public/constellation-model.js';
import {ContinuousQueue} from '../public/queue.js';
import {audioStamp} from '../audio-research.mjs';
import {startServer} from '../server.mjs';
const track=(id,genre='',extra={})=>({id,title:id,artist:id,genre,duration:180,available:true,...extra});
const profile={savedAt:12,timeline:[[0,-100,0,0,0],[1,-20,.2,.3,.4],[2,-10,.8,.7,.6]]};

test('sound summaries omit silence and invalid rows; unknown songs never claim measured evidence',()=>{
 const s=summarizeProfile(profile);assert.deepEqual(s.v.slice(0,3),[.5,.5,.5]);assert.ok(Math.abs(s.v[3]-.9)<1e-9);assert.equal(s.opening,.2);assert.equal(s.closing,.8);
 assert.equal(summarizeProfile({timeline:[[0,-100,0,0,0],[1,-10,NaN,.4,.5]]}),null);
 const n=describe(track('a'));assert.equal(n.known,false);assert.match(reasons(n,describe(track('b')))[0],/limited/);
 const same=describe(track('c','Ambient',{artist:'a'}));assert.ok(reasons(describe(track('a','Ambient')),same).includes('Same artist'));
});
test('map coordinates survive new analysis, filters and added tracks; explicit refinement can move them',()=>{
 const a=describe(track('a')),b=describe(track('b','Metal')),initial=makeMap([a,b],null);
 const updated=[describe(track('a'),{v:[.9,.9,.9,.9]}),b,describe(track('c','Ambient'))];
 const map=makeMap(updated,initial);assert.deepEqual(map.positions.a,initial.positions.a);assert.deepEqual(map.positions.b,initial.positions.b);assert.ok(map.positions.c);
 assert.notDeepEqual(makeMap(updated,{positions:{}}).positions.a,initial.positions.a);
 assert.deepEqual(makeMap([b],map).positions,{b:map.positions.b});
 const offline=makeMap([b],{...map,places:[{id:'a',name:'Home',zoom:2}]},['a','b','c']);assert.deepEqual(offline.positions.a,map.positions.a);assert.equal(offline.places[0].id,'a');
});
test('stored map state is bounded, accepts only known songs and cannot inject styles',()=>{
 const map=cleanMapState({positions:{a:[10,20],b:[NaN,4],unknown:[1,2]},colors:{a:'#aABB12',b:'red;display:none'},places:[{id:'a',name:'x'.repeat(100),zoom:100},{id:'unknown',name:'x'}],seed:Infinity},['a','b']);
 assert.deepEqual(map.positions,{a:[10,20]});assert.deepEqual(map.colors,{a:'#aABB12'});assert.equal(map.places.length,1);assert.equal(map.places[0].name.length,60);assert.equal(map.places[0].zoom,8);assert.equal(map.seed,0);assert.equal(cleanMapState(null,[]).places.length,0);
});
test('relationships find shared sound evidence without depending on names or list order',()=>{
 const a=describe(track('a'),{v:[.2,.3,.4,.2]}),b=describe(track('b'),{v:[.21,.31,.4,.2]}),c=describe(track('c'),{v:[.9,.9,.9,.9]});
 assert.equal(neighbours([c,b,a],'a')[0].id,'b');assert.match(reasons(a,b).join(' '),/texture/);assert.equal(neighbours([a,b,c],'a',5,['b']).length,1);
});
test('journeys reserve endpoints and pinned stops, exclude unavailable songs and continue toward a mood after stops',()=>{
 const nodes=Array.from({length:80},(_,i)=>describe(track('s'+i,i<40?'Ambient':'Electronic',{plays:i%10,favorite:i%4===0}),{v:[i/80,.4,.3,.4],opening:.3,closing:.5}));
 nodes.push(describe(track('missing','',{available:false})));const opts={start:'s0',end:'s79',stops:['s24','s48'],minutes:30,seed:1};
 const r=journey(nodes,opts);assert.equal(r.ids[0],'s0');assert.equal(r.ids.at(-1),'s79');assert.ok(r.ids.indexOf('s24')<r.ids.indexOf('s48'));assert.equal(new Set(r.ids).size,r.ids.length);assert.ok(!r.ids.includes('missing'));assert.ok(Math.abs(r.duration-1800)<=180);
 assert.deepEqual(journey(nodes,opts),r);assert.notDeepEqual(journey(nodes,{...opts,seed:13}).ids,r.ids);
 const mood=journey(nodes,{start:'s0',stops:['s24'],minutes:30,mood:'lift'});assert.ok(mood.ids.indexOf('s24')<mood.ids.length-1);
 const short=journey(nodes,{start:'s0',end:'s79',stops:['s24','s48'],minutes:5});assert.deepEqual(short.ids,['s0','s24','s48','s79']);assert.equal(short.duration,720);assert.equal(short.limited,true);
 assert.throws(()=>journey(nodes,{start:'missing'}));
});
test('2500-song library keeps a bounded route and separates discovery from familiar favourites',()=>{
 const nodes=Array.from({length:2500},(_,i)=>describe(track('t'+i,'Electronic',{plays:i<1250?100:0,favorite:i<1250})));const before=performance.now();
 const familiar=journey(nodes,{start:'t0',minutes:90,explore:0}),explore=journey(nodes,{start:'t0',minutes:90,explore:1});assert.ok(familiar.ids.length<=60);assert.ok(explore.ids.slice(1).every(id=>+id.slice(1)>=1250));assert.ok(familiar.ids.slice(1).every(id=>+id.slice(1)<1250));assert.ok(performance.now()-before<4000);
});
test('applying a journey preserves playback history and cursor; refill follows the reviewed sequence',()=>{
 const result=queueWithJourney(['past','now','old'],1,'now',['now','b','c'],'after');assert.deepEqual(result,{queue:['past','now','b','c'],index:1,start:false});
 const q=new ContinuousQueue(()=>['past','now','b','c','d','old'].map(id=>track(id)));q.items=result.queue;q.cursor=result.index;q.context=['now','b','c'];q.ensure();assert.deepEqual(q.items.slice(0,4),['past','now','b','c']);assert.equal(q.cursor,1);
 assert.deepEqual(queueWithJourney([],0,null,['a','b'],'after'),{queue:['a','b'],index:0,start:true});assert.equal(queueWithJourney(['x'],0,'x',['a'],'now').start,true);
});
test('local endpoints save validated maps across reopen, expose compact profiles and protect writes',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/constellation-'));let app=await startServer({port:0,dataDir:dir,autoScan:false});
 try{
  const t=track('a','Electronic',{path:path.join(dir,'test.wav'),size:10,mtime:1});app.lib.save(t);app.lib.setSetting('audioProfile:a',{...profile,version:1,stamp:audioStamp(t)});
  const data=await(await fetch(app.url+'/api/constellation')).json();assert.equal(data.profiles.a.v.length,4);assert.equal(data.profiles.a.timeline,undefined);assert.equal(data.canPrepare,true);
  const value={positions:{a:[400,500]},space:{a:[-200,100,300]},places:[{id:'a',name:'Orbit',zoom:3}]};
  assert.equal((await fetch(app.url+'/api/constellation',{method:'POST',body:JSON.stringify(value)})).status,403);
  assert.equal((await fetch(app.url+'/api/constellation',{method:'POST',headers:{'X-Resonance-Token':app.token},body:JSON.stringify(value)})).status,200);
  await new Promise(r=>app.server.close(r));app.lib.close();app=await startServer({port:0,dataDir:dir,autoScan:false});const saved=(await(await fetch(app.url+'/api/constellation')).json()).saved;assert.deepEqual(saved.positions.a,[400,500]);assert.equal(saved.places[0].name,'Orbit');
  assert.deepEqual(saved.space.a,[-200,100,300]);
  for(const file of ['constellation.js','constellation-model.js','constellation-space.js','constellation-scene.js','constellation.css']){assert.equal((await fetch(app.url+'/'+file)).status,200);assert.equal(await fs.readFile('public/'+file,'utf8'),await fs.readFile('android/shared/'+file,'utf8'));}
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
