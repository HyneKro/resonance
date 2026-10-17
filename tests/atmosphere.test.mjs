import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {createTrackCharacter,CharacterMixer,themeCues,characterThemes,atmosphereRecipe} from '../public/track-character.js';
import {TempoTracker} from '../public/tempo.js';import {SoundRoles,sanitizeRoles} from '../public/sound-roles.js';
import {SPECTRAL_WINDOWS} from '../public/analysis.js';import {gestureAxis,seekPosition} from '../public/listening-controls.js';
import {createIdentityReader} from '../visual-identity.mjs';import {startServer} from '../server.mjs';
import {interfaceAccent,luminance} from '../public/interface-accent.js';
test('interface accents follow cover hue and keep contrast on dark controls, including monochrome covers',()=>{
 for(const color of [[.02,.08,.03],[.05,.03,.1],[.5,.03,.02],[.15,.15,.15]]){const accent=interfaceAccent([color,color,color]).map(v=>v/255);assert.ok(luminance(accent)>.477);assert.ok((luminance(accent)+.05)/(luminance([21/255,19/255,28/255])+.05)>7);if(color[1]>color[0])assert.ok(accent[1]>accent[0]);}
 const gray=interfaceAccent([[.2,.2,.2],[.5,.5,.5],[.8,.8,.8]]);assert.equal(gray[0],gray[1]);assert.equal(gray[1],gray[2]);assert.deepEqual(interfaceAccent(null),[195,162,255]);
});
test('track identity is stable, cue-based and listen variations stay within the same character',()=>{
 const track={id:'ocean',artist:'A',title:'Moonlit tide',genre:'Ambient'},p=createTrackCharacter(track);
 assert.deepEqual(p,createTrackCharacter({...track}));assert.notDeepEqual(p.signature,createTrackCharacter({...track,id:'other'}).signature);
 assert.ok(p.themes[0]>p.themes[2]);assert.deepEqual(themeCues('star star STAR lune'),[0,2,0,0,0,0]);
 const a=new CharacterMixer(),b=new CharacterMixer();a.select(p,'first');b.select(p,'second');const aa=a.update(1,{amount:1}),bb=b.update(1,{amount:1});
 assert.notDeepEqual(aa.signature,bb.signature);assert.deepEqual(aa.themes,bb.themes);assert.ok(aa.character.every((v,i)=>Math.abs(v-bb.character[i])<=.24));
 const before=a.update(0);a.select(createTrackCharacter({id:'new',genre:'metal'}),'third');assert.deepEqual(a.update(.1,{frozen:true}).signature,before.signature);
 const after=a.update(1/165);assert.ok(after.signature.every((v,i)=>Math.abs(v-before.signature[i])<.01));
});
function feedTempo(t,bpm,seconds=24,{miss=0,jitter=0}={}){let beat=0,index=0;for(let n=0;n<seconds*120;n++){let hit=0;if(n/120>=beat){hit=miss&&index%miss===0?0:1;beat+=60/bpm+Math.sin(index*2.4)*jitter;index++;}t.update(1/120,[hit,0,0]);}return t.output;}
test('same-genre tracks have stable individual fluid recipes, bounded listen variation and inertial transitions',()=>{
 const profiles=Array.from({length:24},(_,id)=>createTrackCharacter({id:'ambient-'+id,genre:'Ambient'})),recipes=profiles.map(p=>atmosphereRecipe(p));
 assert.equal(new Set(recipes.map(JSON.stringify)).size,24);assert.equal(new Set(profiles.map(p=>JSON.stringify(characterThemes(p)))).size,24);
 for(const p of profiles){const a=atmosphereRecipe(p,'a',1),b=atmosphereRecipe(p,'b',1);assert.deepEqual(a,atmosphereRecipe({...p},'a',1));assert.ok(a.every((x,i)=>x>=0&&x<=1&&Math.abs(x-b[i])<=.2));}
 const m=new CharacterMixer();m.select(profiles[0],'a');const before=m.update(0);m.select(profiles[1],'b');const after=m.update(1/165);assert.ok(after.recipe.every((x,i)=>Math.abs(x-before.recipe[i])<.01));assert.deepEqual(m.update(.1,{frozen:true}).recipe,after.recipe);
});
test('character changes silhouette strongly, including cached profiles, and eases back to the original when disabled',()=>{
 for(const genre of ['Ambient','Metal','Jazz','Techno','Cinematic']){const p=createTrackCharacter({id:genre,genre}),weights=characterThemes(p);assert.ok(Math.max(...weights)>.55);assert.ok(Math.abs(weights.reduce((a,b)=>a+b)-1)<1e-9);}
 const unknown=createTrackCharacter({id:'unknown'});assert.deepEqual(characterThemes(unknown),characterThemes({...unknown}));assert.equal(Math.max(...characterThemes(unknown)),.8);
 assert.deepEqual(characterThemes(unknown,false),[0,0,0,0,0,0]);
 const mixer=new CharacterMixer();mixer.select(createTrackCharacter({id:'ocean',genre:'Ambient'}),'a');const on=mixer.update(0),first=mixer.update(1/165,{enabled:false});assert.ok(first.themes.every((x,i)=>Math.abs(x-on.themes[i])<.01));
 let off;for(let i=0;i<1200;i++)off=mixer.update(1/120,{enabled:false});assert.ok(off.themes.reduce((a,b)=>a+b)<.001);
 const still=mixer.update(0,{enabled:true,reduced:true});assert.ok(still.themes.reduce((a,b)=>a+b)>.99);assert.deepEqual(mixer.update(.1,{enabled:false,frozen:true}).themes,still.themes);
});
test('tempo follows 90, 120 and 174 BPM with timing jitter; silence fades confidence and freeze holds phase',()=>{
 for(const bpm of [90,120,174]){const t=new TempoTracker(),o=feedTempo(t,bpm,24,{jitter:.004,miss:7});assert.ok(Math.abs(o.bpm-bpm)<3,`${bpm}: ${o.bpm}`);assert.ok(o.confidence>.5);const phase=o.phase;t.update(.1,[1,0,0],{frozen:true});assert.equal(t.output.phase,phase);for(let i=0;i<1800;i++)t.update(1/120,[0,0,0],{active:false});assert.ok(t.output.confidence<.005);assert.ok(t.output.phase>phase);}
 const empty=new TempoTracker();for(let i=0;i<2400;i++)empty.update(1/120);assert.equal(empty.output.confidence,0);assert.equal(empty.output.pulse,0);
 const changing=new TempoTracker();feedTempo(changing,90);const o=feedTempo(changing,140,30);assert.ok(Math.abs(o.bpm-140)<3);assert.ok(o.confidence>.5);
});
test('sound-role lanes isolate bass and brightness, honor custom ranges and fade without changing samples',()=>{
 const f={spectrum:new Float32Array(48),accents:[0,0,0]};const bassIndex=SPECTRAL_WINDOWS.findIndex(w=>w.center>100);f.spectrum[bassIndex]=1;const original=Array.from(f.spectrum),r=new SoundRoles();
 for(let i=0;i<240;i++)r.update(f,1/120);assert.ok(r.output.bass>.1);assert.equal(r.output.shimmer,0);assert.equal(r.output.drums,0);assert.deepEqual(Array.from(f.spectrum),original);
 r.config=sanitizeRoles({shimmer:{low:80,high:160,gain:2}});for(let i=0;i<120;i++)r.update(f,1/120);assert.ok(r.output.shimmer>.2);
 r.config.shimmer.gain=0;for(let i=0;i<240;i++)r.update(f,1/120);assert.ok(r.output.shimmer<.001);
 for(let i=0;i<480;i++)r.update(f,1/120,{active:false});assert.ok(Object.values(r.output).every(x=>x<.002));
 const cfg=sanitizeRoles({bass:{low:50000,high:-1,gain:100},lead:{low:null,high:'invalid',gain:-8}});assert.equal(cfg.bass.low,15000);assert.equal(cfg.bass.high,15020);assert.equal(cfg.bass.gain,3);assert.equal(cfg.lead.gain,0);
});
test('right-drag seeking has a dead zone, distinct axis, fine adjustment and bounded timeline',()=>{
 assert.equal(gestureAxis(10,0),'');assert.equal(gestureAxis(70,70),'');assert.equal(gestureAxis(100,10),'x');assert.equal(gestureAxis(10,-100),'y');
 assert.equal(seekPosition(50,-122,200),85);assert.equal(seekPosition(50,-122,200,true),57);assert.equal(seekPosition(50,22,200),50);
 assert.equal(seekPosition(20,200,200),0);assert.equal(seekPosition(180,-200,200),199.95);assert.equal(seekPosition(0,-100,Infinity),null);assert.equal(seekPosition(0,NaN,200),null);
});
test('local lyric cues cache, invalidate when lyrics change, and retain usable cues only on read failure',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/identity-')),track={id:'t',path:path.join(dir,'song.mp3'),available:true,mtime:1,size:42,title:'Song'},settings=new Map();let calls=0,fail=false;
 const lib={tracks:new Map([['t',track]]),getSetting:k=>settings.get(k),setSetting:(k,v)=>settings.set(k,v)};
 const read=createIdentityReader(lib,{parse:async()=>{calls++;if(fail)throw Error('offline');return {common:{lyrics:[]}};}});
 await fs.writeFile(path.join(dir,'song.lrc'),'[00:01] Ocean waves moon');const p=await read('t');assert.ok(p.basis.includes('Local lyric cues'));assert.equal(calls,0);
 await read('t');assert.equal(calls,0);assert.equal(settings.get('visualLyrics:t').cues[0],2);
 await fs.writeFile(path.join(dir,'song.lrc'),'');const empty=await read('t');assert.ok(!empty.basis.includes('Local lyric cues'));assert.equal(calls,1);
 await fs.writeFile(path.join(dir,'song.lrc'),'Stars in the galaxy');await read('t');await fs.writeFile(path.join(dir,'song.lrc'),'');fail=true;const offline=await read('t');assert.ok(offline.basis.includes('Local lyric cues'));
 settings.set('visualNotes:t','fire sun');assert.ok((await read('t')).basis.includes('Your theme hints'));assert.equal((await read('t')).notes,'fire sun');
});
test('appearance and role preferences persist with bounds; identity writes require authentication; all new assets load',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/atmosphere-')),app=await startServer({port:0,dataDir:dir,autoScan:false});
 const post=async(route,body,auth=true)=>fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Resonance-Token':app.token}:{})},body:JSON.stringify(body)});
 try{
  const response=await post('/api/config',{preferences:{bloom:99,contrast:-1,motionAmount:99,glassOpacity:.23,responsiveness:7.5,visualTheme:'cosmic',autoDirection:false,soundRoles:{bass:{low:75,high:190,gain:1.6}},unknown:500}}),cfg=await response.json();
  assert.equal(cfg.preferences.bloom,2.5);assert.equal(cfg.preferences.contrast,.7);assert.equal(cfg.preferences.motionAmount,3.5);assert.equal(cfg.preferences.glassOpacity,.23);assert.equal(cfg.preferences.responsiveness,7.5);assert.equal(cfg.preferences.visualTheme,'cosmic');assert.equal(cfg.preferences.unknown,undefined);assert.deepEqual(app.lib.getSetting('config').preferences,cfg.preferences);
  app.lib.tracks.set('t',{id:'t',path:path.join(dir,'offline.mp3'),available:false,title:'Starlight',genre:'Ambient'});
  assert.equal((await post('/api/visual-identity',{id:'t',notes:'ocean'},false)).status,403);
  const identity=await (await post('/api/visual-identity',{id:'t',notes:'ocean'})).json();assert.equal(identity.notes,'ocean');assert.equal(app.lib.getSetting('visualNotes:t'),'ocean');assert.equal((await fetch(app.url+'/api/visual-identity?id=missing')).status,404);
  for(const name of ['interface-accent.js','atmosphere-ui.js','atmosphere.css','visual-settings.js','track-character.js','tempo.js','sound-roles.js'])assert.equal((await fetch(app.url+'/'+name)).status,200,name);
 }finally{await new Promise(r=>app.server.close(r));app.lib.close();}
});
