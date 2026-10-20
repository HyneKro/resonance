import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {DEFAULT_PREFERENCES,preferencesWithDefaults} from '../public/default-preferences.js';
import {installListeningControls} from '../public/listening-controls.js';import {suggestions} from '../public/song-details.js';
import {TrackResearch,researchStamp} from '../track-research.mjs';import {createIdentityReader} from '../visual-identity.mjs';
import {lyricKey,exactLyrics,createLyricsReader} from '../track-lyrics.mjs';import {allowedRemote,remoteBytes,cacheWallpaper,imageSize} from '../remote-artwork.mjs';
test('approved defaults persist, removed options stay absent, and retired layers cannot reactivate',()=>{
 assert.equal(DEFAULT_PREFERENCES.responsiveness,2.55);assert.equal(DEFAULT_PREFERENCES.targetFPS,'auto');assert.equal(DEFAULT_PREFERENCES.quality,'high');assert.equal(DEFAULT_PREFERENCES.laserShow,undefined);
 assert.equal(preferencesWithDefaults({galaxyDensity:2,pointerForce:2,laserShow:true}).pointerForce,0);assert.equal(preferencesWithDefaults({galaxyDensity:2}).galaxyDensity,0);assert.equal(preferencesWithDefaults({laserShow:true}).laserShow,undefined);
});
test('clear background passes wheel and right drags; dock and open overlays stay protected',async()=>{
 const old={document:globalThis.document,window:globalThis.window};let captured=false,prevented=0,saved=0,skip=0;
 const nodes=new Map(),classes=new Set();function element(){return {hidden:true,open:false,value:'',style:{setProperty(){}},setAttribute(){},classList:{remove:x=>classes.delete(x),contains:x=>classes.has(x)},listeners:{},addEventListener(k,fn){this.listeners[k]=fn;},contains(){return true;},setPointerCapture(){captured=true;},hasPointerCapture(){return captured;},releasePointerCapture(){captured=false;},focus(){},closest(){return null;}};}
 const query=k=>{if(!nodes.has(k))nodes.set(k,element());return nodes.get(k);};const room=query('#listening-room');room.hidden=false;
 globalThis.document={querySelector:query,body:{classList:{contains:x=>classes.has(x),remove:x=>classes.delete(x)}},addEventListener(){},activeElement:null};globalThis.window={addEventListener(){}};
 const audio={volume:.5,muted:false,currentTime:100,duration:300,currentSrc:'song-a',addEventListener(){}};
 try{installListeningControls({audio,savePlayer:()=>saved++,nextTrack:n=>skip+=n,safe:fn=>fn,libraryOpen(){},icon:()=>''});
  const target={closest:()=>null},event=extra=>({target,preventDefault(){prevented++;},pointerId:1,button:2,clientX:0,clientY:0,deltaY:-100,deltaX:0,...extra});
  room.listeners.wheel(event());assert.equal(audio.volume,.52);assert.equal(prevented,1);
  room.listeners.pointerdown(event());assert.equal(captured,true);room.listeners.pointermove(event({clientX:100}));room.listeners.pointerup(event({clientX:100}));assert.equal(skip,1);assert.equal(captured,false);assert.equal(audio.currentTime,100);
  room.listeners.pointerdown(event());room.listeners.pointermove(event({clientY:-122}));room.listeners.pointerup(event({clientY:-122}));assert.equal(audio.currentTime,135);
  room.listeners.pointerdown(event({button:0}));assert.equal(captured,false,'left click on the background is not a transport gesture');
  const dock={closest:()=>({})};room.listeners.wheel(event({target:dock}));assert.equal(audio.volume,.52);
  classes.add('visual-settings-open');room.listeners.wheel(event());assert.equal(audio.volume,.54,'clear background still changes volume beside settings');
  room.listeners.pointerdown(event());assert.equal(captured,true);room.listeners.pointerup(event({clientX:100}));assert.equal(skip,2);assert.ok(classes.has('visual-settings-open'));
  room.listeners.pointerdown(event());room.listeners.pointerup(event({clientY:122}));assert.equal(audio.currentTime,100);
  room.listeners.pointerdown(event({target:dock}));assert.equal(captured,false,'settings controls remain protected');
  const count=prevented;room.listeners.contextmenu(event());assert.equal(prevented,count+1);
  classes.add('library-open');room.listeners.pointerdown(event());assert.equal(captured,false);classes.delete('library-open');
  query('#dialog').open=true;room.listeners.pointerdown(event());assert.equal(captured,false);query('#dialog').open=false;
  audio.currentTime=135;
  classes.clear();room.listeners.pointerdown(event());audio.currentSrc='song-b';room.listeners.pointerup(event({clientY:-200}));assert.equal(audio.currentTime,135,'a track change cancels delayed seeking');
  await new Promise(r=>setTimeout(r,190));assert.ok(saved>0);
 }finally{globalThis.document=old.document;globalThis.window=old.window;}
});
test('suggestions prefer available songs from the same artist then shared genres without duplicates',()=>{
 const t={id:'a',artist:'Artist',genre:'Ambient, Electronic'},tracks=[t,{id:'b',title:'B',artist:'artist',available:true},{id:'c',title:'C',artist:'Other',genre:'Ambient',available:true},{id:'d',title:'D',artist:'Artist',available:false},{id:'e',title:'E',artist:'Third',genre:'Rock',available:true}];
 const s=suggestions(t,tracks);assert.deepEqual(s.same.map(x=>x.id),['b']);assert.deepEqual(s.similar.map(x=>x.track.id),['c']);assert.deepEqual(suggestions({id:'x'},tracks),{same:[],similar:[]});
});
function memory(track){const settings=new Map();return {tracks:new Map([[track.id,track]]),getSetting:k=>settings.get(k),setSetting:(k,v)=>settings.set(k,v),settings,genres:{discoverTrack:async()=>{},entity:async()=>null},candidates:async()=>[]};}
const track={id:'t',path:path.resolve('test-output/missing-audio.mp3'),title:'Tidal',artist:'Test Artist',genre:'Ambient',album:'',duration:180,available:false,genreCheckedAt:Date.now()};
test('research validates recording identity, persists cues and lyrics, and rejects stale responses',async()=>{
 const lib=memory({...track}),read=createIdentityReader(lib),response={id:42,trackName:'Tidal',artistName:'Test Artist',duration:180,plainLyrics:'Ocean waves moon'},r=new TrackResearch(lib,read,{enabled:false,json:async()=>response,cacheImage:async()=>null});
 assert.equal(exactLyrics(track,{...response,trackName:'Tidal remix'}),false);assert.equal(exactLyrics(track,{...response,duration:190}),false);
 await r.research('t');assert.equal(lib.getSetting('characterResearch:t').stamp,researchStamp(track));assert.equal(lib.getSetting('trackLyrics:t').text,response.plainLyrics);assert.equal(lib.getSetting('trackCharacter:t').status,'searched');assert.ok(lib.getSetting('trackCharacter:t').themes[0]>.2);assert.equal(r.due(track),false);
 lib.tracks.set('t',{...track,title:'Different'});assert.equal(r.due(lib.tracks.get('t')),true);assert.equal((await read('t')).status,'local');
 const stale=new TrackResearch(lib,read,{enabled:false,json:async()=>{lib.tracks.set('t',{...track,title:'Edited while searching'});return response;},cacheImage:async()=>null});await stale.research('t');assert.equal(lib.getSetting('characterResearch:t').stamp,researchStamp(track),'old request did not overwrite with a wrong match');
});
test('network failure preserves matching evidence and retries later; ambiguous covers are skipped',async()=>{
 const lib=memory({...track}),prior={trackKey:lyricKey(track),cues:[2,0,0,0,0,0],sources:[{name:'LRCLIB'}]};lib.setSetting('characterResearch:t',prior);let images=0;
 lib.candidates=async()=>[{confidence:94,releaseId:'00000000-0000-0000-0000-000000000000'}];const r=new TrackResearch(lib,createIdentityReader(lib),{enabled:false,json:async()=>{throw Error('offline');},cacheImage:async()=>{images++;}});
 await r.research('t');assert.equal(images,0);assert.deepEqual(lib.getSetting('characterResearch:t').cues,prior.cues);assert.equal(r.due(track),false);lib.getSetting('characterResearch:t').checkedAt-=86400001;assert.equal(r.due(track),true);
});
test('lyrics prefer local files, reuse the persistent network cache, and never use mismatched versions',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/lyrics-')),lib=memory({...track,path:path.join(dir,'song.mp3')}),r={id:2,trackName:track.title,artistName:track.artist,duration:180,plainLyrics:'A test lyric'};let calls=0;
 const reader=createLyricsReader(lib,{json:async()=>{calls++;return r;}});assert.equal((await reader('t')).text,'A test lyric');assert.equal((await reader('t')).source,'LRCLIB');assert.equal(calls,2);
 await fs.writeFile(path.join(dir,'song.lrc'),'[00:01.00]My local lyric');assert.equal((await reader('t')).text,'My local lyric');assert.equal(calls,2);
 lib.tracks.set('t',{...track,path:path.join(dir,'other.mp3'),title:'Tidal live'});assert.equal((await reader('t')).text,'');assert.equal(calls,4);
});
test('artwork downloads reject private redirects, oversized responses and low resolution placeholders',async()=>{
 assert.equal(allowedRemote('https://127.0.0.1/a'),false);assert.equal(allowedRemote('https://i.ytimg.com.evil.org/a'),false);assert.equal(allowedRemote('https://x.archive.org/a'),true);
 await assert.rejects(remoteBytes('https://i.ytimg.com/a',{fetcher:async()=>new Response(null,{status:302,headers:{location:'http://127.0.0.1/private'}})}),/Unsupported/);
 await assert.rejects(remoteBytes('https://i.ytimg.com/a',{max:5,fetcher:async()=>new Response('123456')}),/too large/);
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(320,16);png.writeUInt32BE(180,20);assert.equal(imageSize(png).width,320);
 assert.equal(await cacheWallpaper({dataDir:'unused'},'https://i.ytimg.com/a',{}, {fetcher:async()=>new Response(png)}),null);
});
