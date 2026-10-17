import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {genreArtists,genreTitle,sameGenreRecording,genreSearchTracks} from '../public/genre-identity.js';
import {genreTaxonomy,localGenreEvidence} from '../genres.mjs';
import {genreStyle,flowingPosition,OrbitCamera,projectPoint,buildSpace} from '../public/constellation-space.js';
import {skyDirection} from '../public/constellation-sky.js';
const t={title:'Café (feat. Guest) [Official Audio]',artist:'Aster - Topic',duration:180};
test('decorated source labels and bilingual recording queries recover evidence without guessing genres',()=>{
 assert.deepEqual(localGenreEvidence({description:'🎵 Genre: Future Bounce\n• Styles：Artcore / Colour Bass\nI love House music'}).map(x=>x.name),['Future Bounce','Artcore','Colour Bass']);
 assert.deepEqual(localGenreEvidence({sourceTags:['ElectronicMusic','FutureBounceMusic','MusicVideo']}).map(e=>e.name),['Electronic','Future Bounce']);
 assert.deepEqual(localGenreEvidence({description:'My favourite genre: pop\nOur house is lovely'}),[]);
 assert.equal(genreTitle({title:'Eclipse (MusicVideo) (Clip Officiel)'}),'Eclipse');
 const song={artist:'KARDI(카디)',title:'WatchOut',duration:180};assert.deepEqual(genreSearchTracks(song).map(x=>x.artist),['KARDI(카디)','KARDI','카디']);
 assert.equal(genreSearchTracks({...song,artist:'Aster (Official)'}).length,1);
 assert.equal(genreSearchTracks({...song,metadataLocks:{artist:true}}).length,1);
});
test('genre identity handles featured credits, accents, reordered structured credits and upload suffixes',()=>{
 assert.equal(genreTitle(t),'Café');assert.deepEqual(genreArtists(t),['Aster','Guest']);
 assert.ok(sameGenreRecording(t,{title:'Cafe',artist:'Aster feat. Guest',duration:182}));
 assert.ok(sameGenreRecording({...t,artists:['Guest','Aster']},{title:'Cafe',artist:'Aster feat. Guest',duration:180}));
 for(const c of [{title:'Cafe (remix)',artist:'Aster',duration:180},{title:'Cafe',artist:'Cover Band',duration:180},{title:'Cafe',artist:'Aster',duration:210},{title:'Cafe',artist:'Aster feat. Another',duration:180}])assert.equal(sameGenreRecording(t,c),false);
 assert.equal(sameGenreRecording({...t,duration:0},{title:'Cafe',artist:'Aster',duration:180}),false);
 assert.deepEqual(genreArtists({artist:'Earth, Wind & Fire'}),['Earth, Wind & Fire']);
 assert.deepEqual(genreArtists({artist:'My correction',artists:['Old name'],metadataLocks:{artist:true},metadataStatus:'confirmed'}),['My correction']);
});
test('Android genre tag dictionary matches PC aliases exactly',async()=>assert.deepEqual(JSON.parse(await fs.readFile('android/web/genre-taxonomy.json','utf8')),genreTaxonomy()));
test('specific electronic subgenres stay out of the funk/soul region and outrank generic labels',()=>{
 for(const genre of ['Neurofunk','Electronic, Future Garage','Drumstep','Future Funk','IDM'])assert.equal(genreStyle({genre}).id,'electronic');
 assert.equal(genreStyle({genre:'Electronic, Ambient'}).id,'ambient');assert.equal(genreStyle({genre:'Phonk'}).id,'hiphop');assert.equal(genreStyle({genre:''}).id,'unknown');
});
test('pan stays screen-aligned at arbitrary yaw/pitch, and focus approaches without teleporting',()=>{
 for(const [yaw,pitch] of [[0,0],[2,1.3],[19,-8]]){const camera=new OrbitCamera();Object.assign(camera,{yaw,pitch});Object.assign(camera.pose,{yaw,pitch});const before=projectPoint([0,0,0],camera.pose,900,600);camera.pan(40,25,900,600);camera.update(.016,true);const after=projectPoint([0,0,0],camera.pose,900,600);assert.ok(Math.abs(after.x-before.x-40)<1e-6);assert.ok(Math.abs(after.y-before.y-25)<1e-6);}
 const camera=new OrbitCamera();camera.focus([200,100,-20],3);const p=camera.update(1/60);assert.ok(p.center[0]>0&&p.center[0]<20);assert.ok(p.zoom>1&&p.zoom<1.2);for(let i=0;i<300;i++)camera.update(1/60);assert.ok(Math.abs(camera.pose.center[0]-200)<.001);
});
test('flow is bounded over long sessions, with continuous 360-degree sky directions',()=>{
 const n=buildSpace([{id:'star',artist:'Artist',genre:'House',v:[.5,.5,.5,.5]}]).points[0];
 for(const time of [0,1,3600,86400,1e7]){const a=flowingPosition(n,time),b=flowingPosition(n,time+.016);assert.ok(a.every((v,i)=>Math.abs(v-n.position[i])<=7));assert.ok(b.every((v,i)=>Math.abs(v-a[i])<.02));}
 const a=skyDirection(.3,.7,.2,.9),b=skyDirection(.3,.7,.2+Math.PI*2,.9+Math.PI*2);assert.ok(a.every((v,i)=>Math.abs(v-b[i])<1e-10));assert.ok(Math.abs(Math.hypot(...a)-1)<1e-10);
});
