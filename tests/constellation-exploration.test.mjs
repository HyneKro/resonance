import test from 'node:test';
import assert from 'node:assert/strict';
import {describe,cleanMapState} from '../public/constellation-model.js';
import {buildSpace,sameArtistIds,OrbitCamera,projectPoint} from '../public/constellation-space.js';
import {ConstellationScene} from '../public/constellation-scene.js';
import {genreResearchArtists,genreSearchTracks,localGenreCatalogue,localCatalogueEvidence,sameGenreRecording} from '../public/genre-identity.js';
import {canonicalGenre} from '../genres.mjs';
import {ContinuousQueue,queueTimeline} from '../public/queue.js';
import {Reactor} from '../public/reactor.js';
const songs=Array.from({length:2500},(_,i)=>describe({id:'song'+i,title:'Song '+i,artist:'Artist '+i%45,genre:['House','Ambient','Metal'][i%3],available:true}));

test('dense artist catalogues retain a minimum 3D gap, stable placement and varied stars',()=>{
 const data=buildSpace(songs),positions=Object.fromEntries(data.points.map(p=>[p.id,p.position]));
 assert.equal(new Set(data.points.map(p=>p.appearance.type)).size,8);
 let min=Infinity;for(let i=0;i<data.points.length;i++)for(let j=0;j<i;j++)min=Math.min(min,Math.hypot(...data.points[i].position.map((v,k)=>v-data.points[j].position[k])));
 assert.ok(min>=33.99,'minimum separation '+min);
 assert.deepEqual(buildSpace([...songs].reverse(),positions).points.map(p=>p.position).reverse(),data.points.map(p=>p.position));
 assert.equal(cleanMapState({spaceVersion:3,space:positions},songs.map(t=>t.id)).spaceVersion,3);
 assert.equal(cleanMapState({spaceVersion:2},[]).spaceVersion,0);
});
test('group focus fits portrait and desktop viewports without jumping or starting audio',()=>{
 const data=buildSpace(songs),points=new Map(data.points.map(p=>[p.id,p]));
 for(const [width,height] of [[1440,900],[412,690]])for(const [yaw,pitch] of [[0,0],[1.2,2.4]]){
  const camera=new OrbitCamera();camera.yaw=yaw;camera.pitch=pitch;
  const scene=Object.assign(Object.create(ConstellationScene.prototype),{camera,data,byId:points,visible:new Set(points.keys()),width,height,viewport:()=>({top:120,bottom:160})});
  const group=scene.focusGroup('genre:electronic');assert.ok(group);assert.deepEqual(camera.pose.center,[0,0,0]);
  camera.update(.016,true);for(const id of group.ids){const p=projectPoint(points.get(id).position,camera.pose,width,height-280);assert.ok(p&&p.x>0&&p.x<width&&p.y>0&&p.y<height-280);}
 }
 const peers=sameArtistIds(data.points,'song0');assert.ok(peers.size>32);assert.ok(peers.has('song2475'));assert.ok(!peers.has('song1'));
 const single=buildSpace([describe({id:'solo',title:'Solo',artist:'Only artist',genre:'Jazz'})]);assert.equal(single.artistGroups[0].count,1);
});
test('one queue timeline retains real history, duplicate plays and editable queue indices',()=>{
 const q=new ContinuousQueue(()=>songs.slice(0,6));q.start('song0',songs.slice(0,6).map(t=>t.id));q.recordPlayed('song0','a',100);q.select('song1',1);q.recordPlayed('song1','b',200);q.select('song0',0);q.recordPlayed('song0','c',300);
 const timeline=queueTimeline(q,'c');assert.deepEqual(timeline.slice(0,3).map(r=>[r.kind,r.id]),[['history','song0'],['history','song1'],['current','song0']]);
 assert.equal(timeline[3].index,q.cursor+1);assert.equal(new Set(timeline.map(r=>r.key)).size,timeline.length);
 q.move(timeline[3].index,1);assert.equal(queueTimeline(q,'c')[3].id,'song2');
 assert.deepEqual(queueTimeline(new ContinuousQueue(),''),[]);
});
test('genre fallbacks use explicit local evidence, distinguish remixes and protect exact recording identity',()=>{
 assert.equal(canonicalGenre('Electronic Music'),'Electronic');assert.equal(canonicalGenre('Chillstep'),'Chillstep');assert.equal(canonicalGenre('Music'),'');
 const known=[{id:'a',title:'One',artist:'Aster',genre:'House'},{id:'b',title:'Two',artist:'Aster',genre:'House'},{id:'c',title:'Three',artist:'Aster',genre:'Ambient',genreBasis:'artist'}];
 assert.equal(localCatalogueEvidence({id:'d',artist:'Aster'},localGenreCatalogue(known))[0].name,'House');
 assert.deepEqual(localCatalogueEvidence({id:'d',artist:'Aster'},localGenreCatalogue([known[0],known[0],known[2]])),[]);
 assert.deepEqual(genreResearchArtists({title:'Song (Nova Remix)',artist:'Aster'}),['Nova']);
 const t={title:'Daughter',artist:'Youth',rawTitle:'Youth - Daughter',duration:250},candidate={title:'Youth',artist:'Daughter',duration:251};
 assert.equal(genreSearchTracks(t).length,2);assert.ok(sameGenreRecording(genreSearchTracks(t)[1],candidate));assert.ok(!sameGenreRecording(genreSearchTracks(t)[1],{...candidate,duration:300}));assert.equal(genreSearchTracks({...t,metadataStatus:'confirmed'}).length,1);
});
test('entering the map frees graphics, bypasses analysis and leaves playback untouched',()=>{
 const saved={document:globalThis.document,cancel:globalThis.cancelAnimationFrame};let disposed=0,cleared=0,reset=0,started=0,eq=0;
 globalThis.document={querySelectorAll:()=>[],dispatchEvent:()=>{}};globalThis.cancelAnimationFrame=()=>{};
 try{
  const r=Object.assign(Object.create(Reactor.prototype),{sceneSuspended:false,musicOnly:false,audio:{paused:false,pause(){assert.fail('audio paused');}},gpu:{dispose(){disposed++;}},visualSync:{clear(){cleared++;}},sceneReveal:{cancel(){},begin(){}},resetAnalysis(){reset++;},start(){started++;},eq(){eq++;}});
  r.setSceneSuspended(true);r.setSceneSuspended(true);assert.equal(disposed,1);assert.equal(cleared,1);assert.equal(r.gpu,null);assert.equal(r.audio.paused,false);assert.equal(r.musicOnly,false);assert.equal(started,0);
  r.setSceneSuspended(false);assert.equal(reset,1);assert.equal(started,1);assert.equal(eq,2);
 }finally{globalThis.document=saved.document;globalThis.cancelAnimationFrame=saved.cancel;}
});
