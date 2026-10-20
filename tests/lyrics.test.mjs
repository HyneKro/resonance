import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {TimestampFormat} from 'music-metadata';
import {parseLyrics,lyricDocument,lyricsStamp,lyricsMatch,chooseLyrics,lyricsQueries,lyricLineAt} from '../public/lyrics.js';
import {findExactLyrics,createLyricsReader,embeddedLyrics} from '../track-lyrics.mjs';
import {lyricsJSON} from '../lyrics-provider.mjs';

// Original, deliberately simple fixture lines.
const track={id:'a',title:'Paper Satellites (Official Video)',artist:'Test Singer',duration:180,album:'',path:path.resolve('test-output/nonexistent-lyrics.mp3'),available:false};
const record={id:101,trackName:'Paper Satellites',artistName:'Test Singer',duration:181,plainLyrics:'A paper sky\nA silver line',syncedLyrics:'[00:01.20]A paper sky\n[00:05.50]A silver line\n[00:10.00]\n[00:14]We drift again'};
const memory=()=>{const values=new Map();return {tracks:new Map([['a',track]]),getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v)};};

test('timed lyrics preserve repeated lines, offsets, blank breaks and seeks in either direction',()=>{
 const lines=parseLyrics('[ar:Example]\n[offset:200]\n[00:01.20][00:11.20]A paper sky\n[00:05.50]A silver line\n[00:08.00]\n[99:00]Too late\nbad line',180);
 assert.deepEqual(lines,[{time:1,text:'A paper sky'},{time:5.3,text:'A silver line'},{time:7.8,text:''},{time:11,text:'A paper sky'}]);
 assert.deepEqual([0,1,8,11,2].map(t=>lyricLineAt(lines,t)),[-1,0,2,3,0]);
 assert.deepEqual(parseLyrics('[00:02]<00:02.01>One <00:02.50>line'),[{time:2,text:'One line',words:[{text:'One ',start:2.01,end:2.5},{text:'line',start:2.5}]}]);
 assert.equal(parseLyrics('[00:90]Bad').length,0);
});
test('matching cleans upload decoration, accepts featured credits and keeps recording versions separate',()=>{
 assert.equal(lyricsMatch(track,record).timed,true);
 assert.equal(lyricsMatch({...track,artist:'Test Singer feat. Guest'},record).timed,true);
 for(const title of ['Paper Satellites (Live)','Paper Satellites (Remix)','Paper Satellites (Cover)'])assert.equal(lyricsMatch({...track,title},record).identity,false);
 assert.equal(lyricsMatch(track,{...record,artistName:'Someone Else'}).identity,false);
 assert.equal(lyricsQueries({...track,artist:''})[0].track_name,'Paper Satellites');
});
test('text can match an extended music video without pretending its timecodes match',()=>{
 const video={...track,duration:190},doc=lyricDocument(video,record);
 assert.equal(chooseLyrics(video,[record]),record);assert.equal(chooseLyrics(video,[record],{textOnly:false}),null);
 assert.equal(doc.status,'text');assert.deepEqual(doc.lines,[]);assert.ok(doc.timingNotice);
 assert.equal(chooseLyrics({...track,duration:300},[record]),null);
 assert.equal(lyricDocument(track,{...record,plainLyrics:'',syncedLyrics:'',instrumental:true}).status,'instrumental');
});
test('exact endpoint outages still reach catalogue search; rate limits stop immediately',async()=>{
 const calls=[];assert.equal((await findExactLyrics(track,async url=>{calls.push(url);if(url.includes('/get?'))throw Object.assign(Error('Unavailable'),{status:503});return [record];})).id,101);
 assert.equal(calls.length,2);
 let attempts=0;await assert.rejects(findExactLyrics(track,async()=>{attempts++;throw Object.assign(Error('Slow down'),{status:429});}));assert.equal(attempts,1);
});
test('a plain exact result is upgraded to a timed catalogue match and survives an offline search',async()=>{
 assert.ok((await findExactLyrics(track,async url=>url.includes('/get?')?{...record,syncedLyrics:''}:[record])).syncedLyrics);
 assert.equal((await findExactLyrics(track,async url=>{if(url.includes('/get?'))return {...record,syncedLyrics:''};throw Error('offline');})).plainLyrics,record.plainLyrics);
});
test('old text cache upgrades once, then timed results remain available offline',async()=>{
 const lib=memory();lib.setSetting('trackLyrics:a',{stamp:lyricsStamp(track),text:record.plainLyrics});
 let calls=0;const read=createLyricsReader(lib,{json:async()=>{calls++;return record;}});
 assert.equal((await read('a')).status,'synced');assert.equal((await read('a')).lines[0].time,1.2);assert.equal(calls,1);
 const offline=createLyricsReader(lib,{json:async()=>{throw Error('Should not fetch cached lyrics');}});
 assert.equal((await offline('a')).status,'synced');
});
test('an outage does not become a cached missing result; stale lookup cannot persist over an edit',async()=>{
 const lib=memory(),offline=createLyricsReader(lib,{json:async()=>{throw Error('offline');}});
 lib.setSetting('trackLyrics:a',{stamp:lyricsStamp(track),text:'',savedAt:Date.now()});assert.equal((await offline('a')).status,'unavailable');lib.setSetting('trackLyrics:a',undefined);assert.equal(lib.getSetting('trackLyrics:a'),undefined);
 const read=createLyricsReader(lib,{json:async()=>{lib.tracks.set('a',{...track,title:'Changed song'});return record;}});
 await read('a');assert.equal(lib.getSetting('trackLyrics:a'),undefined);
});
test('local and embedded timestamps survive without network access',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/lyrics-timing-'));
 try{
  const lib=memory();lib.tracks.set('a',{...track,path:path.join(dir,'song.mp3')});await fs.writeFile(path.join(dir,'song.lrc'),record.syncedLyrics);
  const read=createLyricsReader(lib,{json:async()=>{throw Error('Must stay local');}});
  const doc=await read('a');assert.equal(doc.source,'Local lyrics');assert.equal(doc.lines.length,4);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
 const tag={timeStampFormat:TimestampFormat.milliseconds,syncText:[{timestamp:1200,text:'First line'},{timestamp:65100,text:'Later line'}]};
 assert.deepEqual(parseLyrics(embeddedLyrics([tag])),[{time:1.2,text:'First line'},{time:65.1,text:'Later line'}]);
 assert.equal(parseLyrics(embeddedLyrics([{...tag,timeStampFormat:TimestampFormat.mpegFrame}])).length,0);
});
test('lyric requests send identification, serialize and honor non-JSON rate-limit replies',async()=>{
 let active=0,max=0;const fetcher=async(url,options)=>{assert.match(options.headers['User-Agent'],/^Resonance\//);active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,10));active--;return new Response('[]');};
 await Promise.all([lyricsJSON('https://lrclib.net/api/search',{fetcher}),lyricsJSON('https://lrclib.net/api/search',{fetcher})]);assert.equal(max,1);
 await assert.rejects(lyricsJSON('https://lrclib.net/api/search',{fetcher:async()=>new Response('rest',{status:429,headers:{'retry-after':'60'}})}),e=>e.status===429);
 await assert.rejects(lyricsJSON('https://lrclib.net/api/search',{fetcher:()=>{throw Error('Must not run');}}),/resting/);
});
test('Android lightweight playback snapshots retain queue order until it changes',async()=>{
 globalThis.window={};
 const {NativeAudio}=await import('../android/web/native.js');
 const audio=new NativeAudio();audio.update({id:'a',playing:false,queue:['a','b','c'],playbackOrder:['a','c','b'],queueRevision:1});
 audio.update({id:'c',playing:false,position:500,queueRevision:1});
 assert.deepEqual(audio.snapshot.queue,['a','b','c']);assert.deepEqual(audio.snapshot.playbackOrder,['a','c','b']);
 audio.update({id:'c',playing:false,queue:['c'],playbackOrder:['c'],queueRevision:2});assert.deepEqual(audio.snapshot.queue,['c']);
 delete globalThis.window;
});
