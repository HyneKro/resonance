import test from 'node:test';import assert from 'node:assert/strict';
import {downloadFailure,fallbackCandidates} from '../public/recording-fallback.js';
import fs from 'node:fs/promises';import path from 'node:path';
import {PlaylistSync} from '../sync.mjs';
test('temporary restrictions take precedence over unavailable messages',()=>{
 for(const raw of ['Video unavailable. HTTP Error 429','Video unavailable: try again later','Sign in to confirm you’re not a bot','HTTP Error 503','Connection timed out'])assert.equal(downloadFailure(raw),'pause',raw);
 for(const raw of ['Video unavailable','This video has been removed','Private video'])assert.equal(downloadFailure(raw),'unavailable');
 for(const raw of ['HTTP Error 403','Requested format is not available','Sign in to confirm your age'])assert.equal(downloadFailure(raw),'other');
});
async function fixture(t){
 const parent=path.resolve('test-output/release-work');await fs.mkdir(parent,{recursive:true});const dir=await fs.mkdtemp(path.join(parent,'recording-fallback-')),settings=new Map(),tracks=new Map();
 const lib={root:dir,dataDir:dir,config:{sources:[{id:'s',playlist:'playlist',path:dir}]},scanJob:{running:false},getSetting:k=>settings.get(k),setSetting:(k,v)=>settings.set(k,structuredClone(v)),list:()=>[...tracks.values()],tracks,save:v=>tracks.set(v.id,v),applyPlaylistOrder:()=>{},scan:async()=>{}};
 const sync=new PlaylistSync(lib);sync.preview={entries:[{id:'AAAAAAAAAAA',title:'Moonlight',channel:'Mira',duration:210,sourceId:'s',playlistIndex:18,status:'new'}]};t.after(()=>fs.rm(dir,{recursive:true,force:true}));return {lib,sync,settings};
}
test('one unavailable recording finds a close alternative, keeps its playlist identity and avoids another download on refresh',async t=>{
 const {lib,sync,settings}=await fixture(t),calls=[];
 sync.run=async args=>{const target=args.at(-1);calls.push(target);if(target.endsWith('v=AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch5:'))return JSON.stringify({entries:[{id:'BBBBBBBBBBB',title:'Mira - Moonlight (Official Audio)',channel:'Mira',duration:211}]});assert.ok(target.endsWith('v=BBBBBBBBBBB'));return '';};
 lib.scan=async()=>lib.save({id:'local',youtubeId:'BBBBBBBBBBB',sourceId:'s',available:true});
 await sync.download(['s:AAAAAAAAAAA']);assert.equal(calls.length,3);assert.equal(sync.job.downloaded,1);assert.equal(sync.job.phase,'complete');assert.equal(lib.tracks.get('local').originalYoutubeId,'AAAAAAAAAAA');assert.equal(settings.get('syncPreview').entries[0].playlistIndex,18);
 sync.run=async()=>JSON.stringify({entries:[{id:'AAAAAAAAAAA',title:'Moonlight',duration:210,channel:'Mira'}]});await sync.check();assert.equal(sync.preview.entries[0].status,'existing');assert.equal(sync.preview.entries[0].trackId,'local');assert.equal(lib.tracks.get('local').youtubeId,'BBBBBBBBBBB');
});
test('temporary blocks stop the batch without searching, and a blocked alternative search does not fan out',async t=>{
 for(const blockAt of [0,1]){const {sync}=await fixture(t);sync.preview.entries.push({...sync.preview.entries[0],id:'CCCCCCCCCCC'});let calls=0;sync.run=async()=>{if(calls++===blockAt)throw Error('Video unavailable. Too many requests, try again later');throw Error('Video unavailable');};await sync.download(['s:AAAAAAAAAAA','s:CCCCCCCCCCC']);assert.equal(calls,blockAt+1);assert.equal(sync.job.phase,'paused');assert.equal(sync.preview.entries[1].status,'new');}
});
test('missing alternatives do not block the next song; 403 never triggers replacement search',async t=>{
 const {sync}=await fixture(t),calls=[];sync.preview.entries.push({...sync.preview.entries[0],id:'CCCCCCCCCCC'});sync.run=async args=>{const target=args.at(-1);calls.push(target);if(target.endsWith('v=AAAAAAAAAAA'))throw Error('Video unavailable');if(target.startsWith('ytsearch5:'))return '{"entries":[]}';return '';};await sync.download(['s:AAAAAAAAAAA','s:CCCCCCCCCCC']);assert.equal(sync.job.downloaded,1);assert.equal(calls.length,3);assert.equal(sync.preview.entries[1].status,'existing');
 const second=await fixture(t);second.sync.run=async args=>{assert.ok(args.at(-1).endsWith('v=AAAAAAAAAAA'));throw Error('HTTP Error 403');};await second.sync.download(['s:AAAAAAAAAAA']);assert.equal(second.sync.job.downloaded,0);
});
test('alternatives need matching artist, title, version and duration',()=>{
 const track={id:'AAAAAAAAAAA',title:'Moonlight',channel:'Mira',duration:210};
 const make=(id,title,channel='Mira - Topic',duration=210)=>({id,title,channel,duration});
 const choices=[make('BBBBBBBBBBB','Mira - Moonlight (Official Audio)'),make('CCCCCCCCCCC','Moonlight (live)'),make('DDDDDDDDDDD','Moonlight','Another artist'),make('EEEEEEEEEEE','Moonlight','Mira',280),make('AAAAAAAAAAA','Moonlight'),make('FFFFFFFFFFF','Moonlight (sped up)')];
 assert.deepEqual(fallbackCandidates(track,choices).map(e=>e.id),['BBBBBBBBBBB']);assert.deepEqual(fallbackCandidates({...track,duration:0},choices),[]);assert.deepEqual(fallbackCandidates({...track,channel:''},choices),[]);
 assert.deepEqual(fallbackCandidates(track,[make('GGGGGGGGGGG','Moonlight','Miranda'),make('HHHHHHHHHHH','Moonlight Sonata')]),[]);
});
