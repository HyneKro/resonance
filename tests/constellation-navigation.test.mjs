import test from 'node:test';
import assert from 'node:assert/strict';
import {MapTrail,artistLabel,refreshMapTrack,journeyStart} from '../public/constellation-navigation.js';
import {describe} from '../public/constellation-model.js';
import {catalogueGenre,catalogueArtistGenre} from '../genre-research.mjs';
import {genreSearchTracks} from '../public/genre-identity.js';

test('map history restores camera locations and truncates forward history on a new branch',()=>{
 const history=new MapTrail(),home=history.current.path,camera={yaw:8,pitch:-4,zoom:2,center:[30,40,50]};
 history.enter([...home,{id:'genre:electronic',label:'Electronic'}],camera);
 camera.center[0]=900;assert.equal(history.entries[0].camera.center[0],30);
 history.enter([...history.current.path,{id:'artist:aster',label:'Aster'}],camera);
 assert.equal(history.move(-1,camera).path.at(-1).id,'genre:electronic');
 assert.equal(history.move(1,camera).path.at(-1).id,'artist:aster');
 history.move(-1,camera);history.enter([...home,{id:'genre:ambient',label:'Ambient'}],camera);
 assert.equal(history.entries.length,3);assert.equal(history.move(1).path.at(-1).id,'genre:ambient');
});
test('song details follow fresh player metadata without discarding the saved sound profile',()=>{
 const old={id:'a',title:'Old',artist:'',v:[.2,.3,.4,.5],measured:true,opening:.2};
 const fresh=refreshMapTrack(old,{id:'a',title:'Guts',artist:'',channel:'Ellie Dixon',genre:'Pop'});
 assert.equal(artistLabel(fresh),'Ellie Dixon');assert.equal(fresh.genre,'Pop');assert.deepEqual(fresh.v,old.v);
 assert.equal(artistLabel(refreshMapTrack(fresh,{id:'a',artist:'Verified artist'})),'Verified artist');
 assert.equal(refreshMapTrack(old,{id:'b',artist:'Different'}),old);
});
test('automatic journeys vary the first song while explicit starting stars remain fixed',()=>{
 const songs=Array.from({length:20},(_,i)=>describe({id:String(i),artist:'Aster',title:'Track '+i,genre:'House'}));
 let previous='',starts=new Set();for(let seed=1;seed<25;seed++){const id=journeyStart(songs,{current:'0',previous,seed});assert.notEqual(id,'0');assert.notEqual(id,previous);starts.add(id);previous=id;}
 assert.ok(starts.size>3);assert.equal(journeyStart(songs,{pinned:'4',current:'0',previous:'4',seed:3}),'4');assert.equal(journeyStart([],{}),'');
});
test('uploader search clues need corroborating recording identity, never relabel a repost by itself',()=>{
 const song={title:'Guts',artist:'',channel:'Ellie Dixon',duration:126};const clue=genreSearchTracks(song)[1];
 const match={kind:'song',trackName:'Guts',artistName:'Ellie Dixon',trackTimeMillis:126000,primaryGenreName:'Pop',trackViewUrl:'https://music.apple.com/us/song/guts/1'};
 assert.equal(catalogueGenre(clue,[match])[0].name,'Pop');assert.deepEqual(catalogueGenre({...clue,artist:'Repost Channel'},[match]),[]);
 assert.equal(genreSearchTracks({...song,metadataLocks:{artist:true}}).length,1);
});
test('artist catalogue fallback rejects homonyms and labels accepted genres as suggestions',()=>{
 const a={wrapperType:'artist',artistName:'Aster',artistId:1,artistLinkUrl:'https://music.apple.com/us/artist/aster/1',primaryGenreName:'Electronic'};
 assert.equal(catalogueArtistGenre('Aster',[a])[0].scope,'artist');assert.deepEqual(catalogueArtistGenre('Aster',[a,{...a,artistId:2}]),[]);assert.deepEqual(catalogueArtistGenre('Repost',[a]),[]);
});
