import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {deezerPlaylistId,readDeezerPlaylist,deezerPageUrl} from '../deezer.mjs';
import {catalogEntries} from '../spotify.mjs';
import {PlaylistSync} from '../sync.mjs';
import {validateSource} from '../sources.mjs';
import {startServer} from '../server.mjs';
import {syncEntryMarkup,syncComparisonMarkup,syncEntryKey} from '../public/sync-review.js';

const id='908622995',url='https://www.deezer.com/playlist/'+id;
const song=n=>({id:n+1,title:'Song '+n,artist:{name:'Test artist'},duration:180,preview:'https://never-download.test/preview',readable:false});
const meta={id:Number(id),type:'playlist',public:true,title:'Discovery'};
const response=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
test('Deezer validates canonical/localized public playlist links, folders and duplicates',async()=>{
 for(const input of [url,url+'?utm_source=test','https://deezer.com/fr/playlist/'+id,'https://www.deezer.com/en-US/playlist/'+id+'/'])assert.equal(deezerPlaylistId(input),id);
 for(const input of ['http://deezer.com/playlist/'+id,'https://deezer.com.evil/playlist/'+id,'https://user@deezer.com/playlist/'+id,'https://deezer.com/track/'+id,'https://link.deezer.com/s/abc','https://deezer.com:444/playlist/'+id])assert.throws(()=>deezerPlaylistId(input));
 const dir=await fs.mkdtemp(path.resolve('test-output/deezer-source-')),source=await validateSource({type:'deezer',url,name:'Discovery',path:dir},[]);
 assert.equal(source.playlist,id);await assert.rejects(validateSource({...source,id:'another',url},[source]),/already connected/);
});
test('Deezer reads all 2,501 entries in order, never requests preview audio and includes region-unavailable catalogue entries',async()=>{
 let calls=0;const read=await readDeezerPlaylist(id,{fetchImpl:async(input,options)=>{
  calls++;assert.equal(options.redirect,'error');const u=new URL(input);assert.equal(u.hostname,'api.deezer.com');
  if(u.pathname==='/playlist/'+id)return response(meta);
  const start=Number(u.searchParams.get('index')),end=Math.min(start+100,2501);
  return response({data:Array.from({length:end-start},(_,i)=>song(start+i)),total:2501,...(end<2501?{next:`http://api.deezer.com/playlist/${id}/tracks?index=${end}&limit=100`}:{})});
 }});
 assert.equal(calls,27);assert.equal(read.tracks.length,2501);assert.equal(read.tracks[2500].playlistIndex,2501);assert.equal(read.tracks[2500].deezerId,'2501');assert.equal(read.tracks[0].preview,undefined);assert.equal(read.limited,false);
});
test('Deezer refuses private, incomplete, looping, changing and unsafe pagination without accepting a partial list',async()=>{
 const cases=[{metadata:{error:{code:800}},match:/public/},{metadata:{...meta,public:false},match:/public/},{page:{data:[song(0)],total:2},match:/incomplete/},{page:{data:[],total:2,next:`https://api.deezer.com/playlist/${id}/tracks?index=100`},match:/incomplete/},{page:{data:[song(0)],total:2,next:`https://api.deezer.com/playlist/${id}/tracks?index=0`},match:/repeated/},{page:{data:[song(0)],total:2,next:'https://untrusted.test/tracks'},match:/unexpected/},{page:{data:[],total:10001},match:/10,000/}];
 for(const c of cases)await assert.rejects(readDeezerPlaylist(id,{fetchImpl:async input=>response(new URL(input).pathname.endsWith('/tracks')?c.page:c.metadata||meta)}),c.match);
 for(const next of ['https://api.deezer.com/playlist/1/tracks','https://api.deezer.com/playlist/'+id+'/tracks?index=-1','https://user@api.deezer.com/playlist/'+id+'/tracks'])assert.throws(()=>deezerPageUrl(next,id));
});
test('Deezer skips malformed entries without shifting order, keeps credits and accepts empty public lists',async()=>{
 let read=await readDeezerPlaylist(id,{fetchImpl:async input=>response(input.includes('/tracks')?{data:[null,{...song(1),contributors:[{name:'Guest'},{name:'Test artist'}]}],total:2}:meta)});
 assert.equal(read.skipped,1);assert.equal(read.tracks[0].playlistIndex,2);assert.equal(read.tracks[0].artist,'Test artist, Guest');
 read=await readDeezerPlaylist(id,{fetchImpl:async input=>response(input.includes('/tracks')?{data:[],total:0}:meta)});assert.deepEqual(read.tracks,[]);
 const controller=new AbortController();await assert.rejects(readDeezerPlaylist(id,{signal:controller.signal,fetchImpl:async()=>{controller.abort();return response(meta);}}),{name:'AbortError'});
});
test('Deezer review, cache, saved identity and API requests stay separate from Spotify',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/deezer-api-')),music=path.join(dir,'music');await fs.mkdir(music);
 const app=await startServer({port:0,dataDir:dir,autoScan:false});
 try{
  const source=await app.lib.saveSource({type:'deezer',url,name:'Discovery',path:music});
  const track={deezerId:'123',deezerUrl:'https://www.deezer.com/track/123',title:'All Blues',artist:'Miles Davis',duration:692,playlistIndex:1};let calls=0;
  app.sync.run=async()=>{calls++;return JSON.stringify({entries:[{id:'aaaaaaaaaaa',title:'All Blues',channel:'Miles Davis',duration:692},{id:'bbbbbbbbbbb',title:'All Blues (live)',channel:'Miles Davis',duration:692}]});};
  const options={provider:'deezer',read:async()=>({title:'Jazz',tracks:[track],url})};
  const result=await catalogEntries(app.sync,source,new Set(),options);app.sync.preview={entries:result.entries,sources:[result.source]};
  assert.equal(result.entries[0].status,'review');assert.equal(result.entries[0].provider,'deezer');assert.equal(app.lib.getSetting('spotifyMatches'),null);
  const post=(body,auth=true)=>fetch(app.url+'/api/sync/match',{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Resonance-Token':app.token}:{})},body:JSON.stringify(body)});
  const body={sourceId:source.id,provider:'deezer',trackId:'123',videoId:'bbbbbbbbbbb'};
  assert.equal((await post(body,false)).status,403);assert.equal((await post({...body,provider:'spotify'})).status,400);assert.equal((await post({...body,videoId:'ccccccccccc'})).status,400);assert.equal((await post(body)).status,200);
  const again=await catalogEntries(app.sync,source,new Set(),options);assert.equal(calls,1);assert.equal(again.entries[0].id,'bbbbbbbbbbb');
  app.lib.save({id:'local-song',sourceId:source.id,youtubeId:'bbbbbbbbbbb',available:true,title:'All Blues',artist:'Miles Davis',duration:692,path:path.join(music,'song.opus')});
  Object.assign(app.sync.preview.entries[0],{status:'existing',id:'bbbbbbbbbbb'});app.sync.saveCatalogLinks();
  assert.equal(app.lib.tracks.get('local-song').deezerId,'123');assert.equal(app.lib.tracks.get('local-song').deezerUrl,track.deezerUrl);
  const saved=await catalogEntries(app.sync,source,new Set(),options);assert.equal(saved.entries[0].status,'existing');assert.equal(calls,1);
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();}
});
test('Deezer review uses the correct source and keeps unchecked choices stable',()=>{
 const entry={provider:'deezer',deezerId:'123',id:'aaaaaaaaaaa',sourceId:'s',title:'Song',channel:'Artist',duration:180,status:'review',candidates:[]};const format={esc:String,duration:String};
 const html=syncEntryMarkup(entry,null,{name:'Deezer songs'},0,format);assert.match(html,/data-provider="deezer"/);assert.match(html,/deezer.com\/track\/123/);assert.doesNotMatch(html,/checked|Spotify/);assert.match(syncComparisonMarkup(entry,null,format),/Deezer entry/);assert.equal(syncEntryKey(entry),syncEntryKey({...entry,id:'bbbbbbbbbbb'}));
});
