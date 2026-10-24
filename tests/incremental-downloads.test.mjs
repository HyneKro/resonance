import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {startServer} from '../server.mjs';
import {Library} from '../library.mjs';

function wav(){const b=Buffer.alloc(44+88200);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(88200,40);return b;}
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function fixture(t,ending='complete'){
 const base=path.resolve('test-output/release-work');await fs.mkdir(base,{recursive:true});const dir=await fs.mkdtemp(path.join(base,'incremental-downloads-')),music=path.join(dir,'music');await fs.mkdir(music);
 const app=await startServer({port:0,dataDir:path.join(dir,'data'),autoScan:false});
 const source={id:'source',type:'spotify',kind:'track',name:'Test playlist',playlist:'test-playlist',path:music};app.lib.config.sources=[source];app.lib.setSetting('config',app.lib.config);
 app.sync.preview={checkedAt:123,sources:[{id:source.id}],entries:['AAAAAAAAAAA','BBBBBBBBBBB'].map((id,i)=>({id,title:'Catalog song '+i,channel:'Catalog artist',sourceId:source.id,playlistIndex:i+7,status:'new',provider:'spotify',spotifyId:'spotify-'+i,spotifyUrl:'https://open.spotify.com/track/test-'+i}))};
 let scans=0;const scan=app.lib.scan.bind(app.lib);app.lib.scan=async()=>{scans++;return scan();};
 const waiting=deferred(),release=deferred();let pending;
 const partial=path.join(music,'Not finished [BBBBBBBBBBB].temp.wav');await fs.writeFile(partial,wav());
 app.sync.run=async(args,onLine)=>{
  assert.ok(args.includes('--no-simulate'));assert.ok(args.includes('after_move:RESONANCE_FILE %(filepath)j'));
  const id=args.at(-1).slice(-11);
  if(id==='BBBBBBBBBBB'){waiting.resolve();await release.promise;if(ending==='cancel')throw Error('Cancelled');if(ending==='pause')throw Error('HTTP Error 429: Too many requests');await fs.unlink(partial);}
  const file=path.join(music,`Test Artist - Saved song [${id}].wav`);await fs.writeFile(file,wav());
  await fs.writeFile(file.replace(/\.wav$/,'.info.json'),JSON.stringify({id,artist:'Test Artist',track:'Saved song',duration:1}));
  onLine('RESONANCE_FILE '+JSON.stringify(file));return '';
 };
 t.after(async()=>{release.resolve();if(pending)await pending;await new Promise(r=>app.server.close(r));app.lib.close();await fs.rm(dir,{recursive:true,force:true});});
 return {app,dir,music,source,waiting,release,scans:()=>scans,start:()=>pending=app.sync.download(app.sync.preview.entries.map(e=>e.sourceId+':'+e.id))};
}

test('a completed download is listed, playable and ordered while the next transfer is still pending',async t=>{
 const f=await fixture(t),{app}=f,finished=f.start();await f.waiting.promise;
 assert.equal(app.sync.job.running,true);assert.equal(app.sync.job.downloaded,1);assert.equal(f.scans(),0,'Per-song publication must not rescan a growing folder');
 const data=await(await fetch(app.url+'/api/library')).json();assert.equal(data.tracks.length,1,'Partial audio must not appear');
 const track=data.tracks[0];assert.equal(track.available,true);assert.equal(track.duration,1);assert.equal(track.spotifyId,'spotify-0');assert.equal(track.playlistIndex,7);assert.equal(track.artist,'Test Artist');
 assert.equal(app.sync.preview.entries[0].trackId,track.id);assert.equal(app.sync.preview.entries[1].status,'new');
 const audio=await fetch(app.url+'/audio/'+track.id,{headers:{Range:'bytes=0-3'}});assert.equal(audio.status,206);assert.equal(await audio.text(),'RIFF');
 app.lib.save({...app.lib.tracks.get(track.id),favorite:true,plays:4,position:.5});
 f.release.resolve();await finished;assert.equal(f.scans(),1);assert.equal(app.sync.job.downloaded,2);assert.equal(app.lib.list().length,2);
 const saved=app.lib.tracks.get(track.id);assert.equal(saved.favorite,true);assert.equal(saved.plays,4);assert.equal(saved.position,.5);assert.equal(saved.playlistIndex,7);
 const reopened=new Library(process.cwd(),path.join(f.dir,'data'));try{assert.equal(reopened.tracks.get(track.id).available,true);assert.equal(reopened.list().length,2);}finally{reopened.close();}
});

test('completed songs stay accessible if a later download is paused or cancelled',async t=>{
 for(const ending of ['pause','cancel']){
  const f=await fixture(t,ending),{app}=f,finished=f.start();await f.waiting.promise;
  const first=app.lib.list()[0];assert.ok(first?.available);if(ending==='cancel')app.sync.cancel();
  // Leave a temporary audio file behind, as an interrupted extractor can do.
  f.release.resolve();await finished;assert.equal(app.sync.job.phase,ending==='cancel'?'cancelled':'paused');
  assert.equal(app.sync.job.downloaded,1);assert.equal(app.lib.list().length,1);assert.equal(app.lib.tracks.get(first.id).available,true);
 }
});

test('incremental import accepts only completed nonempty audio inside its connected download source',async t=>{
 const f=await fixture(t),{app,source}=f;
 const outside=path.join(f.dir,'Outside.wav');await fs.writeFile(outside,wav());await assert.rejects(app.lib.importDownloaded(source,outside),/finished audio/);
 await assert.rejects(app.lib.importDownloaded(source,path.join(f.music,'Not finished [BBBBBBBBBBB].temp.wav')),/finished audio/);
 const empty=path.join(f.music,'Empty.wav');await fs.writeFile(empty,'');await assert.rejects(app.lib.importDownloaded(source,empty),/empty/);
 await assert.rejects(app.lib.importDownloaded(source,''),/finished audio/);assert.equal(app.lib.list().length,0);
});
