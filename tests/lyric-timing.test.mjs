import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {parseLyricsfile,exportLyricsfile,wordProgress,timingOffset} from '../public/lyric-timing.js';
import {lyricDocument,parseLyrics} from '../public/lyrics.js';
import {recognizedWords,alignLyrics} from '../lyric-alignment.mjs';
import {LyricsWorkbench} from '../lyrics-workbench.mjs';

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
function transcript(lines,shift=0){
 return {result:{language:'en'},transcription:lines.map(l=>({tokens:l.text.split(' ').map((text,i)=>({text:(i?' ':'')+text,id:100+i,p:.98,offsets:{from:Math.round((l.time+shift+i*.4)*1000),to:Math.round((l.time+shift+i*.4+.3)*1000)}}))}))};
}
const lines=[{time:1,text:'A paper sky'},{time:10,text:'The silver sea'},{time:22,text:'We drift again'},{time:34,text:'A quiet home'},{time:48,text:'We see daylight'}],base={text:lines.map(l=>l.text).join('\n'),lines,source:'Local'};
test('audio alignment keeps good cues and corrects a consistent recording offset without changing words',()=>{
 const verified=alignLyrics(base,transcript(lines),60);assert.equal(verified.analysis.method,'verified');assert.equal(verified.analysis.wordLines,5);assert.equal(verified.text,base.text);
 const shifted=alignLyrics(base,transcript(lines,2.4),60);assert.equal(shifted.analysis.method,'offset');assert.ok(Math.abs(shifted.analysis.shift-2.4)<.01);
 assert.ok(shifted.lines.some(l=>Math.abs(l.time-3.4)<.001&&l.words?.[0].start===3.4));
});
test('untimed known lyrics align in order; unrelated speech and uncertain repetitions are rejected',()=>{
 const aligned=alignLyrics({text:base.text},transcript(lines),60);assert.equal(aligned.analysis.method,'realigned');assert.equal(aligned.analysis.coverage,1);
 assert.throws(()=>alignLyrics(base,transcript([{time:1,text:'Other words are being spoken somewhere else'}]),60),/reliably/);
 assert.throws(()=>alignLyrics(base,transcript([lines[0],lines[0],lines[0]]),60),/reliably/);
});
test('token fragments are grouped before comparing words and non-text tokens are ignored',()=>{
 const r={result:{language:'en'},transcription:[{tokens:[{id:1,text:' sil',p:.9,offsets:{from:1000,to:1100}},{id:2,text:'ver',p:.8,offsets:{from:1100,to:1400}},{id:50364,text:'[_BEG_]',p:1,offsets:{from:0,to:0}}]}]};
 assert.deepEqual(recognizedWords(r,10).map(w=>[w.key,w.start,w.end]),[['silver',1,1.4]]);
});
test('partial recognition can enrich timed verses without moving or losing the other cues',()=>{
 const many=['Paper skies glow','Silver oceans gleam','Quiet mountains sleep','Golden rivers flow','Soft rain falls','Red leaves scatter','Blue clouds gather','Bright dawn rises','Cold nights fade','Warm sunlight returns'].map((text,i)=>({time:1+i*5,text}));
 const record={text:many.map(l=>l.text).join('\n'),lines:[...many,{time:49,text:''}]};
 const result=alignLyrics(record,transcript(many.filter((_,i)=>![2,5,7].includes(i)),.2),55);
 assert.equal(result.analysis.method,'enriched');
 assert.deepEqual(result.lines.filter(l=>l.text).map(l=>l.time),many.map(l=>l.time));
 assert.ok(result.lines.some(l=>l.time===49&&!l.text));
 assert.equal(result.analysis.wordLines,7);
 const roundtrip=parseLyricsfile(exportLyricsfile({...t,duration:55},result),55);
 assert.equal(roundtrip.lines.filter(l=>l.words).length,7);
 const adjusted=alignLyrics({...base,offset:2},transcript(lines,2),60);
 assert.equal(adjusted.analysis.method,'verified');assert.equal(adjusted.lines[0].time,3);assert.equal(adjusted.offset,0);
});
function memory(){const values=new Map();return {dataDir:path.resolve('test-output/lyrics-workbench'),tracks:new Map([['one',{...t}]]),getSetting:k=>values.get(k),setSetting:(k,v)=>values.set(k,v),values};}
const done=async wb=>{for(let i=0;i<100&&wb.job.running;i++)await new Promise(r=>setTimeout(r,5));assert.equal(wb.job.running,false);};
test('analysis is a proposal until applied; restore and changed-file protection preserve original lyrics',async()=>{
 const lib=memory(),wb=new LyricsWorkbench(lib,async()=>base,{check:async()=>true,analyze:async()=>alignLyrics(base,transcript(lines,2),60)});
 wb.start('one','analyze');await done(wb);let state=await wb.status('one');
 assert.ok(state.proposal);assert.equal(state.record.lines[0].time,1);
 await wb.change('one','apply',{proposalId:state.proposal.id});state=await wb.status('one');assert.equal(state.improved,true);assert.equal(state.record.lines[0].time,3);
 await wb.change('one','offset',{value:-.4});assert.equal((await wb.status('one')).record.offset,-.4);
 lib.tracks.get('one').mtime=2;assert.equal((await wb.status('one')).record.lines[0].time,1);assert.equal((await wb.status('one')).record.offset,0);
 await wb.change('one','restore');assert.equal((await wb.status('one')).improved,false);
});
test('cancellation, changed lyrics and concurrent requests cannot replace saved timings',async()=>{
 let release;const lib=memory();let record=base;
 const wb=new LyricsWorkbench(lib,async()=>record,{check:async()=>true,analyze:()=>new Promise(r=>release=r)});
 wb.start('one','analyze');assert.throws(()=>wb.start('one','analyze'),/already running/);
 while(!release)await new Promise(r=>setTimeout(r,1));
 record={...base,text:'Edited words'};release(base);await done(wb);assert.match(wb.job.message,/changed/);assert.equal((await wb.status('one')).proposal,null);
 wb.start('one','analyze');await new Promise(r=>setTimeout(r,5));wb.cancel();release(base);await done(wb);assert.match(wb.job.message,/Cancelled/);
});
test('import and offset remain separate from the original provider cache',async()=>{
 const lib=memory(),wb=new LyricsWorkbench(lib,async()=>base,{check:async()=>false});
 const state=await wb.change('one','import',{text:JSON.stringify(rich)});assert.equal(state.record.lines[0].words.length,3);assert.equal(state.improved,true);
 assert.equal((await wb.change('one','restore')).record.text,base.text);
 await assert.rejects(wb.change('one','import',{text:'x'.repeat(256001)}),/too large/);
});
test('analysis uses imported lyrics and rejects a proposal after a manual timing edit',async()=>{
 let release,input;
 const lib=memory(),wb=new LyricsWorkbench(lib,async()=>base,{check:async()=>true,analyze:async(_dir,_track,record)=>{input=record;return new Promise(r=>release=r);}});
 await wb.change('one','import',{text:JSON.stringify(rich)});wb.start('one','analyze');
 while(!release)await new Promise(r=>setTimeout(r,1));
 assert.equal(input.text,'A paper sky');
 await wb.change('one','offset',{value:1});release(input);await done(wb);
 assert.match(wb.job.message,/changed/);assert.equal((await wb.status('one')).proposal,null);
 wb.start('one','analyze');await new Promise(r=>setTimeout(r,5));release(input);await done(wb);
 const proposal=(await wb.status('one')).proposal;assert.ok(proposal);
 await wb.change('one','offset',{value:2});
 await assert.rejects(wb.change('one','apply',{proposalId:proposal.id}),/out of date/);
});
