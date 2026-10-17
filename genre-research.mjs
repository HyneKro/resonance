import {sameGenreRecording,genreTitle,genreArtists} from './public/genre-identity.js';
export const GENRE_RESEARCH_VERSION=4;
export function trustedRecording(track,candidates=[]){
 const matches=candidates.filter(c=>sameGenreRecording(track,c));
 if(!matches.length)return null;
 const identities=new Set(matches.map(c=>c.artistIds?.[0]?.id).filter(Boolean));
 if(identities.size>1)return null;
 // Different recordings of an identical artist/title can share genre evidence;
 // explicit remixes and incompatible durations never cross this boundary.
 return matches.sort((a,b)=>b.confidence-a.confidence)[0];
}
export async function wikidataGenres(entity,read){
 const url=(entity?.relations||[]).filter(r=>r.type==='wikidata').map(r=>r.url?.resource).find(url=>/^https?:\/\/www\.wikidata\.org\/wiki\/Q\d+$/.test(url||''));
 if(!url)return [];
 const id=url.split('/').pop(),data=await read(id),item=data?.entities?.[id];
 const ids=[...new Set((item?.claims?.P136||[]).filter(c=>c.rank!=='deprecated').map(c=>c.mainsnak?.datavalue?.value?.id).filter(x=>/^Q\d+$/.test(x||'')))].slice(0,6);
 const genres=[];for(const genreId of ids){const g=await read(genreId),name=g?.entities?.[genreId]?.labels?.en?.value;if(name)genres.push({name,scope:'artist',source:'Wikidata',url:'https://www.wikidata.org/wiki/'+id,confidence:'suggested'});}
 return genres;
}
// Catalogue genres are accepted only for the same recording, never from a
// similarly named song or a cover version. A duration is required here.
export function catalogueGenre(track,results=[]){
 if(!(track.duration>0))return [];
 const matches=results.map(r=>({...r,title:r.trackName,artist:r.artistName,duration:r.trackTimeMillis/1000})).filter(r=>r.kind==='song'&&r.primaryGenreName&&trustedRecording(track,[r])&&/^https:\/\/(music|itunes)\.apple\.com\//.test(r.trackViewUrl||''));
 const labels=[...new Set(matches.map(r=>r.primaryGenreName))];
 return labels.length===1?[{name:labels[0],scope:'recording',source:'Apple Music catalogue',url:matches[0].trackViewUrl,confidence:'catalogued'}]:[];
}
let catalogueQueue=Promise.resolve(),catalogueAt=0;
export function searchCatalogue(track){
 const task=async()=>{await new Promise(r=>setTimeout(r,Math.max(0,catalogueAt-Date.now())));catalogueAt=Date.now()+3200;
  const query=new URLSearchParams({term:(genreArtists(track)[0]||track.artist)+' '+genreTitle(track),country:'US',media:'music',entity:'song',limit:'25'});
  const response=await fetch('https://itunes.apple.com/search?'+query,{signal:AbortSignal.timeout(15000)});
  if(response.status===429)catalogueAt=Date.now()+Math.max(60000,(Number(response.headers.get('retry-after'))||60)*1000);
  if(!response.ok)throw Error('Apple catalogue returned '+response.status);
  const body=await response.text();if(body.length>1e6)throw Error('Catalogue response too large');return JSON.parse(body).results||[];
 };const result=catalogueQueue.then(task,task);catalogueQueue=result.catch(()=>{});return result;
}
let wikidataQueue=Promise.resolve(),last=0;
export function readWikidata(id){
 if(!/^Q\d+$/.test(id))throw Error('Invalid Wikidata item');
 const task=async()=>{await new Promise(r=>setTimeout(r,Math.max(0,1100-(Date.now()-last))));last=Date.now();const response=await fetch('https://www.wikidata.org/wiki/Special:EntityData/'+id+'.json',{headers:{'User-Agent':'Resonance/1.3 (local music metadata research)'},signal:AbortSignal.timeout(15000)});if(response.status===429)last=Date.now()+Math.max(60000,(Number(response.headers.get('retry-after'))||60)*1000);if(!response.ok)throw Error('Wikidata returned '+response.status);if(Number(response.headers.get('content-length'))>3e6)throw Error('Wikidata response too large');const text=await response.text();if(text.length>3e6)throw Error('Wikidata response too large');return JSON.parse(text);};
 const result=wikidataQueue.then(task,task);wikidataQueue=result.catch(()=>{});return result;
}
