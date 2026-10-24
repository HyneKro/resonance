import test from 'node:test';import assert from 'node:assert/strict';
import {downloadFailure,fallbackCandidates,recordingQueries,cleanRecording,reviewRecordings,isMusicVideo} from '../public/recording-fallback.js';
import fs from 'node:fs/promises';import path from 'node:path';
import {PlaylistSync} from '../sync.mjs';
test('temporary restrictions take precedence over unavailable messages',()=>{
 for(const raw of ['Video unavailable. HTTP Error 429','Video unavailable: try again later','Sign in to confirm you’re not a bot','HTTP Error 503','Connection timed out'])assert.equal(downloadFailure(raw),'pause',raw);
 for(const raw of ['Video unavailable','This video has been removed','Private video'])assert.equal(downloadFailure(raw),'unavailable');
 for(const raw of ['HTTP Error 403','Requested format is not available','Sign in to confirm your age'])assert.equal(downloadFailure(raw),'other');
});
async function fixture(t){
 const parent=path.resolve('test-output/release-work');await fs.mkdir(parent,{recursive:true});const dir=await fs.mkdtemp(path.join(parent,'recording-fallback-')),settings=new Map(),tracks=new Map();
 const lib={root:dir,dataDir:dir,config:{sources:[{id:'s',playlist:'playlist',path:dir}]},scanJob:{running:false},getSetting:k=>settings.get(k),setSetting:(k,v)=>settings.set(k,structuredClone(v)),list:()=>[...tracks.values()],tracks,save:v=>tracks.set(v.id,v),applyPlaylistOrder:()=>{},scan:async()=>{},importDownloaded:async()=>{await lib.scan();return lib.list()[0]||{id:"local",sourceId:"s",youtubeId:"BBBBBBBBBBB"};}};
 const sync=new PlaylistSync(lib);sync.preview={entries:[{id:'AAAAAAAAAAA',title:'Moonlight',channel:'Mira',duration:210,sourceId:'s',playlistIndex:18,status:'new'}]};t.after(()=>fs.rm(dir,{recursive:true,force:true}));return {lib,sync,settings};
}
test('one unavailable recording finds a close alternative, keeps its playlist identity and avoids another download on refresh',async t=>{
 const {lib,sync,settings}=await fixture(t),calls=[];
 sync.run=async args=>{const target=args.at(-1);calls.push(target);if(target.endsWith('v=AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch8:'))return JSON.stringify({entries:[{id:'BBBBBBBBBBB',title:'Mira - Moonlight (Official Audio)',channel:'Mira',duration:211}]});assert.ok(target.endsWith('v=BBBBBBBBBBB'));return '';};
 lib.scan=async()=>lib.save({id:'local',youtubeId:'BBBBBBBBBBB',sourceId:'s',available:true});
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(calls.length,3);assert.equal(sync.job.downloaded,1);assert.equal(sync.job.phase,'complete');assert.equal(lib.tracks.get('local').originalYoutubeId,'AAAAAAAAAAA');assert.equal(settings.get('syncPreview').entries[0].playlistIndex,18);
 sync.run=async()=>JSON.stringify({entries:[{id:'AAAAAAAAAAA',title:'Moonlight',duration:210,channel:'Mira'}]});await sync.check();assert.equal(sync.preview.entries[0].status,'existing');assert.equal(sync.preview.entries[0].trackId,'local');assert.equal(lib.tracks.get('local').youtubeId,'BBBBBBBBBBB');
});
test('temporary blocks stop the batch without searching, and a blocked alternative search does not fan out',async t=>{
 for(const blockAt of [0,1]){const {sync}=await fixture(t);sync.preview.entries.push({...sync.preview.entries[0],id:'CCCCCCCCCCC'});let calls=0;sync.run=async()=>{if(calls++===blockAt)throw Error('Video unavailable. Too many requests, try again later');throw Error('Video unavailable');};await sync.download(['s:AAAAAAAAAAA','s:CCCCCCCCCCC']);assert.equal(calls,blockAt+1);assert.equal(sync.job.phase,'paused');assert.equal(sync.preview.entries[1].status,'new');}
});
test('missing alternatives do not block the next song; 403 never triggers replacement search',async t=>{
 const {sync}=await fixture(t),calls=[];sync.preview.entries.push({...sync.preview.entries[0],id:'CCCCCCCCCCC'});sync.run=async args=>{const target=args.at(-1);calls.push(target);if(target.endsWith('v=AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch8:'))return '{"entries":[]}';return '';};await sync.download(['s:AAAAAAAAAAA','s:CCCCCCCCCCC']);assert.equal(sync.job.downloaded,1);assert.equal(calls.length,5);assert.equal(sync.preview.entries[1].status,'existing');
 const second=await fixture(t);second.sync.run=async args=>{assert.ok(args.at(-1).endsWith('v=AAAAAAAAAAA'));throw Error('HTTP Error 403');};await second.sync.download(['s:AAAAAAAAAAA']);assert.equal(second.sync.job.downloaded,0);
});
test('alternatives need matching artist, title, version and duration',()=>{
 const track={id:'AAAAAAAAAAA',title:'Moonlight',channel:'Mira',duration:210};
 const make=(id,title,channel='Mira - Topic',duration=210)=>({id,title,channel,duration});
 const choices=[make('BBBBBBBBBBB','Mira - Moonlight (Official Audio)'),make('CCCCCCCCCCC','Moonlight (live)'),make('DDDDDDDDDDD','Moonlight','Another artist'),make('EEEEEEEEEEE','Moonlight','Mira',280),make('AAAAAAAAAAA','Moonlight'),make('FFFFFFFFFFF','Moonlight (sped up)')];
 assert.deepEqual(fallbackCandidates(track,choices).map(e=>e.id),['BBBBBBBBBBB']);assert.deepEqual(fallbackCandidates({...track,duration:0},choices),[]);assert.deepEqual(fallbackCandidates({...track,channel:''},choices),[]);
 assert.deepEqual(fallbackCandidates(track,[make('GGGGGGGGGGG','Moonlight','Miranda'),make('HHHHHHHHHHH','Moonlight Sonata')]),[]);
});

test('repost titles supply artist identity and reviewed alternatives retain the original playlist key',async t=>{
 const {sync,lib,settings}=await fixture(t);const entry=sync.preview.entries[0];entry.title='Mira - Moonlight';entry.channel='Repost Channel';
 const candidate={id:'BBBBBBBBBBB',title:'Moonlight',channel:'Mira - Topic',duration:211};
 assert.equal(fallbackCandidates(entry,[candidate]).length,1);
 sync.run=async()=>JSON.stringify({entries:[candidate]});const choices=await sync.searchAlternatives('s','AAAAAAAAAAA','Mira Moonlight');assert.equal(choices.length,1);
 assert.throws(()=>sync.selectAlternative('s','AAAAAAAAAAA','CCCCCCCCCCC'));
 const picked=sync.selectAlternative('s','AAAAAAAAAAA','BBBBBBBBBBB');assert.equal(picked.originalYoutubeId,'AAAAAAAAAAA');assert.equal(picked.alternativeSelected,true);assert.equal(settings.get('syncPreview').entries[0].id,'BBBBBBBBBBB');
});

test('exact phrase fallback recovers reported recordings without accepting a remaster',async t=>{
 const {sync}=await fixture(t);Object.assign(sync.preview.entries[0],{title:'The Archive',channel:'Aineth - Topic',duration:319});
 const queries=[];sync.run=async args=>{const target=args.at(-1);if(target.endsWith('AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch')){queries.push(target);return JSON.stringify({entries:target.includes('"The Archive"')?[{id:'BBBBBBBBBBB',title:'THE ARCHIVE [REMASTERED]',channel:'AINETH',duration:319},{id:'CCCCCCCCCCC',title:'The Archive',channel:'Aineth - Topic',duration:319}]:[]});}assert.ok(target.endsWith('CCCCCCCCCCC'));return '';};
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(sync.job.downloaded,1);assert.deepEqual(queries,recordingQueries({title:'The Archive',channel:'Aineth - Topic'}).slice(0,2));assert.ok(queries[1].includes('"The Archive" "Aineth"'));
 assert.notEqual(cleanRecording('Music'),cleanRecording(''));assert.notEqual(cleanRecording('Audio Video'),cleanRecording(''));
});

test('manual search serializes downloader work and releases it on failure',async t=>{
 const {sync}=await fixture(t);let release;sync.run=()=>new Promise((resolve,reject)=>{release=()=>reject(Error('offline'));});const pending=sync.searchAlternatives('s','AAAAAAAAAAA','Moonlight');
 await assert.rejects(sync.searchAlternatives('s','AAAAAAAAAAA','Second search'),/Wait/);await assert.rejects(sync.download(['s:AAAAAAAAAAA']),/already running/);release();await assert.rejects(pending,/offline/);assert.equal(sync.job.running,false);assert.equal(sync.alternativeReview,null);
});

test('a Topic failure searches music videos as a last resort and saves audio with its original playlist identity',async t=>{
 const {sync,lib}=await fixture(t),queries=[];sync.preview.entries[0].channel='Mira - Topic';
 const clip={id:'BBBBBBBBBBB',title:'Mira - Moonlight (Official Music Video) [4K]',channel:'MiraVEVO',duration:213};
 sync.run=async args=>{const target=args.at(-1);if(target.endsWith('v=AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch8:')){queries.push(target);return JSON.stringify({entries:target.endsWith('official music video')?[clip]:[]});}
  assert.ok(target.endsWith('v=BBBBBBBBBBB'));assert.equal(args[args.indexOf('-f')+1],'bestaudio/best');assert.ok(args.includes('-x'));assert.equal(args[args.indexOf('--audio-format')+1],'best');return '';
 };
 lib.scan=async()=>lib.save({id:'local',youtubeId:clip.id,sourceId:'s',available:true});
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(sync.job.downloaded,1);assert.equal(queries.length,3);assert.match(queries[2],/Mira Moonlight official music video$/);
 assert.equal(lib.tracks.get('local').originalYoutubeId,'AAAAAAAAAAA');assert.equal(lib.tracks.get('local').alternativeKind,'music-video');assert.equal(sync.preview.entries[0].playlistIndex,18);
});

test('video labels and resolution tags do not hide close matches, but different versions still require review',()=>{
 const original={id:'local',youtubeId:'AAAAAAAAAAA',title:'Moonlight',artist:'Mira',duration:210};
 for(const suffix of ['(Official Music Video) [4K]','[Official Video HD]','(Official MV)','(Clip officiel)','| Official Music Video']){
  const clip={id:'BBBBBBBBBBB',title:'Mira - Moonlight '+suffix,channel:'Mira',duration:211};
  assert.equal(fallbackCandidates(original,[clip]).length,1,suffix);assert.equal(isMusicVideo(clip),true,suffix);
 }
 const choices=[
  {id:'BBBBBBBBBBB',title:'Mira - Moonlight (Official Music Video)',channel:'Mira',duration:260},
  {id:'CCCCCCCCCCC',title:'Mira - Moonlight (Live) (Official Music Video)',channel:'Mira',duration:210},
  {id:'DDDDDDDDDDD',title:'Mira - Moonlight (Remix) [4K]',channel:'Mira',duration:210},
  {id:'AAAAAAAAAAA',title:'Mira - Moonlight (Music Video)',channel:'Mira',duration:210},
 ];
 assert.deepEqual(fallbackCandidates(original,choices),[]);const review=reviewRecordings(original,choices);assert.equal(review.length,3);assert.equal(review[0].safe,false);assert.equal(review[0].musicVideo,true);assert.equal(review[0].duration,260);
 assert.equal(cleanRecording('Music Video'),'music video');assert.equal(cleanRecording('Audio Video'),'audio video');
});

test('music video search still pauses on throttling and never retries the same unavailable upload',async t=>{
 const {sync}=await fixture(t);let searches=0,attempts=0;
 sync.run=async args=>{const target=args.at(-1);if(target.startsWith('ytsearch')){searches++;if(searches===3)throw Error('HTTP Error 429: Too many requests');return JSON.stringify({entries:[{id:'BBBBBBBBBBB',title:'Mira - Moonlight (Official Video)',duration:210,channel:'Mira'}]});}attempts++;throw Error('Video unavailable');};
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(searches,3);assert.equal(attempts,2);assert.equal(sync.job.phase,'paused');assert.equal(sync.job.downloaded,0);
});

test('failed audio alternatives leave one of the three download attempts for a music video',async t=>{
 const {sync}=await fixture(t),requests=[];
 sync.run=async args=>{const target=args.at(-1);requests.push(target);if(target.startsWith('ytsearch'))return JSON.stringify({entries:(target.endsWith('official music video')?['DDDDDDDDDDD']:['BBBBBBBBBBB','CCCCCCCCCCC']).map(id=>({id,title:'Mira - Moonlight (Official Video)',channel:'Mira',duration:210}))});if(target.endsWith('v=DDDDDDDDDDD'))return '';throw Error('Video unavailable');};
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(sync.job.downloaded,1);assert.equal(requests.filter(r=>r.startsWith('https:')).length,4);assert.equal(requests.filter(r=>r.startsWith('ytsearch')).length,2);assert.equal(sync.preview.entries[0].id,'DDDDDDDDDDD');
});
