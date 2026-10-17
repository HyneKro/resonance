import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';
import {spotifyPlaylistId,parseSpotifyPlaylist,spotifyCandidates,spotifyEntries} from '../spotify.mjs';import {PlaylistSync} from '../sync.mjs';import {validateSource} from '../sources.mjs';import {startServer} from '../server.mjs';
const id='4rArRoeiRH1x8yQWrmU4Bz',tid='5o3DSHw1ORhM3lWxqGRvEf',track={spotifyId:tid,title:'All Blues',artist:'Miles Davis',duration:692,playlistIndex:1,spotifyUrl:'https://open.spotify.com/track/'+tid};
test('Spotify source URLs are strictly public playlist URLs, validate writable folders and reject duplicates',async()=>{
 const url='https://open.spotify.com/playlist/'+id;assert.equal(spotifyPlaylistId(url+'?si=test'),id);assert.equal(spotifyPlaylistId('https://open.spotify.com/intl-fr/playlist/'+id),id);
 for(const bad of ['http://open.spotify.com/playlist/'+id,'https://open.spotify.com.evil/playlist/'+id,'https://open.spotify.com/track/'+tid,'https://user@open.spotify.com/playlist/'+id])assert.throws(()=>spotifyPlaylistId(bad));
 const dir=await fs.mkdtemp(path.resolve('test-output/spotify-source-')),source=await validateSource({type:'spotify',name:'Jazz',url,path:dir},[]);assert.equal(source.playlist,id);assert.equal(source.type,'spotify');await assert.rejects(validateSource({...source,url,id:'another'},[source]),/already connected/);
});
test('Spotify public parser preserves original order and artist names, ignores preview audio and marks truncation',()=>{
 const item={uri:'spotify:track:'+tid,title:'All Blues',subtitle:'Miles Davis',duration:692000,audioPreview:{url:'https://never-download.test/preview'}};
 const html=items=>'<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{state:{data:{entity:{id,type:'playlist',title:'Jazz',trackList:items}}}}}})+'</script>';
 const p=parseSpotifyPlaylist(html([item,{uri:'spotify:episode:'+tid,title:'Talk'},item]),id);assert.equal(p.tracks.length,2);assert.equal(p.tracks[1].playlistIndex,3);assert.equal(p.tracks[0].duration,692);assert.equal(p.tracks[0].audioPreview,undefined);assert.equal(p.limited,false);assert.equal(p.skipped,1);
 assert.equal(parseSpotifyPlaylist(html(Array(100).fill(item)),id).limited,true);assert.throws(()=>parseSpotifyPlaylist('<html>Login</html>',id),/private/);
});
test('YouTube match ranking favors artist, title and duration and flags different versions',()=>{
 const candidates=spotifyCandidates(track,[{id:'aaaaaaaaaaa',title:'Miles Davis - All Blues (Official Audio)',channel:'Miles Davis',duration:694},{id:'bbbbbbbbbbb',title:'All Blues (live)',channel:'Miles Davis',duration:692},{id:'ccccccccccc',title:'All Blues',channel:'Another artist',duration:692}]);
 assert.equal(candidates[0].id,'aaaaaaaaaaa');assert.equal(candidates[0].score,100);assert.ok(candidates.find(c=>c.id==='bbbbbbbbbbb').score<=60);
});
test('Spotify checks reuse cached searches and leave every new recording unchecked for review',async()=>{
 const settings=new Map(),lib={root:process.cwd(),getSetting:k=>settings.get(k),setSetting:(k,v)=>settings.set(k,v),list:()=>[],config:{sources:[{id:'s',type:'spotify',playlist:id}]}};const sync=new PlaylistSync(lib);let calls=0;
 sync.run=async()=>{calls++;return JSON.stringify({entries:[{id:'aaaaaaaaaaa',title:'All Blues',channel:'Miles Davis',duration:692},{id:'bbbbbbbbbbb',title:'All Blues (live)',channel:'Miles Davis',duration:692}]});};
 const read=async()=>({tracks:[track],title:'Jazz',limited:false,skipped:0,url:'https://open.spotify.com/playlist/'+id}),source=lib.config.sources[0];
 const a=await spotifyEntries(sync,source,new Set(),{read});assert.equal(a.entries[0].status,'review');sync.preview={entries:a.entries};assert.throws(()=>sync.selectSpotifyMatch('s',tid,'zzzzzzzzzzz'),/reviewed/);assert.equal(sync.selectSpotifyMatch('s',tid,'bbbbbbbbbbb').matchedTitle,'All Blues (live)');
 const again=await spotifyEntries(sync,source,new Set(),{read});assert.equal(calls,1);assert.equal(again.entries[0].id,'bbbbbbbbbbb');
});
test('Spotify source and candidate choices persist locally and reject unauthorized or invented match requests',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/spotify-api-')),music=path.join(dir,'music');await fs.mkdir(music);const app=await startServer({port:0,dataDir:dir,autoScan:false});
 const post=(route,body,auth=true)=>fetch(app.url+route,{method:'POST',headers:{'Content-Type':'application/json',...(auth?{'X-Resonance-Token':app.token}:{})},body:JSON.stringify(body)});
 try{
  const source=await app.lib.saveSource({type:'spotify',name:'Public jazz',url:'https://open.spotify.com/playlist/'+id,path:music});
  app.sync.preview={entries:[{...track,id:'aaaaaaaaaaa',sourceId:source.id,provider:'spotify',status:'review',candidates:[{id:'aaaaaaaaaaa',title:'All Blues',channel:'Miles Davis',duration:692}]}]};
  const body={sourceId:source.id,spotifyId:tid,videoId:'aaaaaaaaaaa'};assert.equal((await post('/api/sync/match',body,false)).status,403);assert.equal((await post('/api/sync/match',{...body,videoId:'bbbbbbbbbbb'})).status,400);assert.equal((await post('/api/sync/match',body)).status,200);assert.equal(app.lib.getSetting('syncPreview').entries[0].matchedTitle,'All Blues');
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();}
});
