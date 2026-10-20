import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {audioStamp} from '../audio-research.mjs';
import {parseLyricsfile,exportLyricsfile,wordProgress,timingOffset} from '../public/lyric-timing.js';
import {lyricDocument,parseLyrics} from '../public/lyrics.js';
import {LyricsSettings} from '../lyrics-settings.mjs';
import {hasWordTimings,wordTimingCoverage} from '../public/lyric-highlight.js';

const rich={version:'1.0',lines:[{text:'A paper sky',start_ms:1000,end_ms:3000,words:[{text:'A ',start_ms:1000,end_ms:1200},{text:'paper ',start_ms:1300,end_ms:2000},{text:'sky',start_ms:2200,end_ms:3000}]}]};
const t={id:'one',title:'Paper Sky',artist:'Test Singer',duration:60,path:'song.wav',size:30,mtime:1,available:true};
test('provider YAML and JSON preserve real word boundaries, gaps and Unicode',()=>{
 const json=parseLyricsfile(JSON.stringify(rich),60);
 assert.deepEqual(json.lines[0].words[1],{text:'paper ',start:1.3,end:2});
 const yaml=parseLyricsfile("version: '1.0'\nlines:\n  - text: å¤œç©º\n    start_ms: 1000\n    words:\n      - text: å¤œ\n        start_ms: 1000\n      - text: ç©º\n        start_ms: 2000\n",10);
 assert.equal(yaml.lines[0].words[1].text,'ç©º');assert.equal(yaml.lines[0].words[1].end,undefined);
 const doc=lyricDocument(t,{trackName:t.title,artistName:t.artist,duration:60,lyricsfile:JSON.stringify(rich)});
 assert.equal(doc.status,'synced');assert.equal(doc.lines[0].words.length,3);
 assert.equal(lyricDocument(t,{trackName:t.title,artistName:t.artist,duration:100,lyricsfile:JSON.stringify(rich)}).lines.length,0);
});
test('hostile or malformed lyrics files cannot expand aliases or manufacture word timing',()=>{
 for(const value of ["version: '1.0'\nlines: &a [*a]","version: '1.0'\nversion: '2.0'\nlines: []",'!<tag:yaml.org,2002:js/function> function(){}',JSON.stringify({...rich,version:'9.0'}),'x'.repeat(256001)])assert.equal(parseLyricsfile(value),null);
 const wrong=structuredClone(rich);wrong.lines[0].words[0].text='wrong';assert.equal(parseLyricsfile(JSON.stringify(wrong)).lines[0].words,undefined);
 const negative=structuredClone(rich);negative.lines[0].start_ms=-1;assert.equal(parseLyricsfile(JSON.stringify(negative)),null);
});
test('enhanced LRC repeats word cues correctly and merging voices falls back to full line text',()=>{
 const r=parseLyrics('[offset:100]\n[00:01][00:11]<00:01>A <00:02>sky<00:03>');
 assert.equal(r[1].words[0].start,10.9);assert.equal(r[1].words[1].end,12.9);
 assert.equal(parseLyrics('[00:01]<00:01>A\n[00:01]B')[0].words,undefined);
});
test('export bakes the user offset once and reimports without losing word boundaries',()=>{
 const record={text:'A paper sky',lines:parseLyricsfile(JSON.stringify(rich)).lines,offset:2};
 const imported=parseLyricsfile(exportLyricsfile(t,record));assert.equal(imported.lines[0].time,3);assert.equal(imported.lines[0].words[1].start,3.3);
 assert.equal(timingOffset(Infinity),60);assert.equal(timingOffset(-100),-60);
 assert.deepEqual([0,1,1.5,2,9].map(time=>wordProgress({start:1,end:2},time)),[0,0,.5,1,1]);
 assert.equal(wordProgress({start:1},1.2),1);
});

const base={text:'A paper sky',lines:[{time:1,text:'A paper sky'}],source:'Local'};
function memory(){const values=new Map();return {tracks:new Map([['one',{...t}]]),getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v),values};}
test('saved word timings and offsets survive the removal of the recognition tool',async()=>{
 const lib=memory(),settings=new LyricsSettings(lib,async()=>base);
 const record={...base,lines:parseLyricsfile(JSON.stringify(rich)).lines,analysis:{method:'enriched',coverage:1}};
 // An accepted analysis from the old release uses exactly this persisted format.
 const hash=createHash('sha256').update(JSON.stringify([base.text,base.lines,base.source,base.syncedLyrics,0])).digest('hex');
 lib.values.set('lyricTiming:one',{fileStamp:audioStamp(t),base:hash,record});
 lib.values.set('lyricOffset:one',{fileStamp:audioStamp(t),value:.4});
 assert.deepEqual((await settings.status('one')).record,{...record,offset:.4});
 assert.equal((await settings.status('one')).improved,true);
 lib.tracks.get('one').mtime=2;
 assert.equal((await settings.status('one')).improved,false);
 assert.deepEqual((await settings.status('one')).record,{...base,offset:0});
});
test('import, offset and restore leave provider lyrics intact; analysis actions are gone',async()=>{
 const lib=memory(),settings=new LyricsSettings(lib,async()=>base);
 assert.equal((await settings.change('one','import',{text:JSON.stringify(rich)})).record.lines[0].words.length,3);
 assert.equal((await settings.change('one','offset',{value:-.4})).record.offset,-.4);
 assert.deepEqual((await settings.change('one','restore')).record,{...base,offset:0});
 for(const action of ['install','analyze','apply','cancel'])await assert.rejects(settings.change('one',action),/Unknown lyrics action/);
 await assert.rejects(settings.change('one','import',{text:'x'.repeat(256001)}),/too large/);
 await assert.rejects(settings.change('one','offset',{value:'oops'}),/Invalid timing/);
});
test('word highlights require matching words and real timestamps, never line duration guesses',()=>{
 const cue=parseLyricsfile(JSON.stringify(rich)).lines[0];
 assert.equal(hasWordTimings(cue),true);
 assert.equal(hasWordTimings({time:1,end:3,text:'A paper sky'}),false);
 assert.equal(hasWordTimings({...cue,words:[{text:'Other words',start:1,end:3}]}),false);
 assert.equal(hasWordTimings({...cue,words:cue.words.map(w=>({...w,start:NaN}))}),false);
 assert.deepEqual(wordTimingCoverage({lines:[cue,{time:4,text:''},{time:9,text:'A silver line'}]}),{lines:2,wordLines:1,sweepLines:1});
 assert.deepEqual(wordTimingCoverage({lines:[{...cue,words:cue.words.map(({end,...w})=>w)}]}),{lines:1,wordLines:1,sweepLines:0});
});
