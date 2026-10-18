import test from 'node:test';import assert from 'node:assert/strict';
import {buildSpace,groupConnections} from '../public/constellation-space.js';
import {groupTrail} from '../public/constellation-navigation.js';
import {videoCatalogueGenre,artistAlbumGenres,catalogueRegion} from '../genre-research.mjs';
import {genreResearchArtists} from '../public/genre-identity.js';
test('artist hubs connect every song, including a single member, independently of visible sprites',()=>{
 const data=buildSpace(Array.from({length:80},(_,i)=>({id:String(i),title:'Song '+i,artist:'Mira',genre:i%2?'Pop':'Rock'})));
 const edges=groupConnections(data,'artist:mira');assert.equal(edges.length,80);assert.equal(groupConnections(data,'artist:mira',new Set(['0'])).length,1);
 const single=buildSpace([{id:'solo',artist:'Solo',genre:'Jazz'}]);const [edge]=groupConnections(single,'artist:solo');assert.ok(Math.hypot(...edge.hub.position.map((v,i)=>v-edge.node.position[i]))>80);
 const trail=groupTrail(data,'artist:mira');assert.deepEqual(trail.map(p=>p.id.split(':')[0]),['home','genre','artist']);
 const pop=groupTrail(data,'artist:mira',[{id:'genre:pop'}]);assert.equal(pop[1].id,'genre:pop');
});
test('video genre lookup tolerates a short intro but rejects different artists or editions',()=>{
 const track={youtubeId:'AAAAAAAAAAA',title:'Moonlight',artist:'Mira',duration:190};
 const row={kind:'song',trackName:'Moonlight',artistName:'Mira',trackTimeMillis:180000,primaryGenreName:'Pop',trackViewUrl:'https://music.apple.com/us/album/test/123'};
 assert.equal(videoCatalogueGenre(track,[row])[0].scope,'release');assert.equal(videoCatalogueGenre({...track,youtubeId:''},[row]).length,0);
 for(const r of [{...row,artistName:'Cover band'},{...row,trackName:'Moonlight (Remix)'},{...row,trackTimeMillis:100000}])assert.equal(videoCatalogueGenre(track,[r]).length,0);
 assert.equal(catalogueRegion({title:'夜'}),'JP');assert.deepEqual(genreResearchArtists({artist:'KARDI(카디)'}),['KARDI(카디)','KARDI','카디']);
});
test('artist album consensus requires distinct releases and an exact catalogue identity',()=>{
 const identity={artistId:12,artistLinkUrl:'https://music.apple.com/us/artist/mira/12'},album=n=>({wrapperType:'collection',collectionName:n,artistId:12,artistName:'Mira',primaryGenreName:'Pop',collectionViewUrl:'https://music.apple.com/us/album/'+n+'/123'});
 assert.equal(artistAlbumGenres('Mira',identity,[album('a')]).length,0);assert.equal(artistAlbumGenres('Mira',identity,[album('a'),album('a')]).length,0);
 assert.equal(artistAlbumGenres('Mira',identity,[album('a'),album('b')])[0].confidence,'suggested');assert.equal(artistAlbumGenres('Mira',identity,[album('a'),{...album('b'),artistId:13}]).length,0);
});
