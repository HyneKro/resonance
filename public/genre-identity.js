import {artistNames,splitArtistCredit} from './artist-credits.js';
export const genreKey=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function genreTitle(track){
 let title=String(track.title||'').replace(/\s*\[[\w-]{11}\]$/,'').replace(/\s*[\[(](?:(?:4k|hd)\s+)?(?:official(?:\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music video|lyrics?(?: video)?|audio|visuali[sz]er|[^)\]]{1,35} release)[\])]/gi,'').replace(/\s+official (?:music video|lyric video|audio|visuali[sz]er)$/i,'').trim();
 const parts=title.split(/\s+[-–—]\s+/);if(parts.length>1&&[track.artist,...artistNames(track)].some(a=>genreKey(a)===genreKey(parts[0])))title=parts.slice(1).join(' - ');
 return title.replace(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\s*[^)\]]+[)\]]/gi,'').replace(/\s+(?:feat\.?|ft\.?|featuring)\s*.*$/i,'').trim();
}
export function genreArtists(track){
 const names=track.artistIds?.length?track.artistIds.map(a=>a.name):artistNames(track),guest=String(track.title||'').match(/\b(?:feat\.?|ft\.?|featuring)\s*([^)[\]]+)/i)?.[1];
 return [...new Map([...names,...(guest?splitArtistCredit(guest):[])].filter(Boolean).map(n=>[genreKey(n),n])).values()];
}
const versions=s=>[...String(s||'').toLowerCase().matchAll(/\b(remix|live|cover|acoustic|instrumental|nightcore|slowed|sped|remaster)\b/g)].map(x=>x[1]).sort().join(',');
export function sameGenreRecording(track,candidate){
 if(!genreKey(genreTitle(track))||genreKey(genreTitle(track))!==genreKey(genreTitle(candidate)))return false;
 if(versions(track.rawTitle||track.title)!==versions(candidate.rawTitle||candidate.title))return false;
 const a=genreArtists(track).map(genreKey),b=genreArtists(candidate).map(genreKey);if(!a.length||!b.length)return false;
 const identical=a.length===b.length&&a.every(x=>b.includes(x)),primary=a[0]===b[0];
 if(!identical&&(!primary||!a.every(x=>b.includes(x))&&!b.every(x=>a.includes(x))))return false;
 if(track.duration>0&&candidate.duration>0)return Math.abs(track.duration-candidate.duration)<=5;
 // Do not relax featured-credit matching without corroborating duration.
 return identical;
}

export function genreResearchArtists(track){
 const remix=String(track.rawTitle||track.title||'').match(/[([]([^()[\]]{1,65})\s+(?:remix|rework|bootleg)[)\]]/i)?.[1]?.trim();
 return remix?[remix]:genreArtists(track);
}
export function genreSearchTracks(track){
 const variants=[track];if(track.metadataLocks?.artist||['manual','confirmed'].includes(track.metadataStatus))return variants;
 const parts=String(track.rawTitle||'').split(/\s+[-–—]\s+/);
 if(parts.length===2&&track.duration>0&&genreKey(parts[0])===genreKey(track.artist)&&genreKey(parts[1])===genreKey(track.title))variants.push({...track,title:parts[0],artist:parts[1],artists:undefined,artistIds:undefined,rawTitle:parts[0]});
 return variants;
}
export function localGenreCatalogue(tracks){
 const catalogue=new Map();for(const t of tracks){if(!t.genre||t.kind==='mix'||t.genreBasis==='artist'||t.genreEvidence?.length&&!t.genreEvidence.some(e=>e.scope!=='artist'))continue;
  const primary=genreResearchArtists(t)[0];if(!primary)continue;const key=genreKey(primary);if(!catalogue.has(key))catalogue.set(key,new Map());catalogue.get(key).set(genreKey(genreTitle(t)),{id:t.id,names:t.genre.split(/[,;]/).map(s=>s.trim()).filter(Boolean)});
 }return catalogue;
}
export function localCatalogueEvidence(track,catalogue){
 if(track.kind==='mix')return [];const artist=genreResearchArtists(track)[0],peers=[...(catalogue.get(genreKey(artist))?.values()||[])].filter(p=>p.id!==track.id);if(peers.length<2)return [];
 const counts=new Map();for(const p of peers)for(const name of new Set(p.names))counts.set(name,(counts.get(name)||0)+1);
 return [...counts].filter(([,count])=>count>=2&&count>=peers.length*.6).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([name,count])=>({name,scope:'artist',source:'Your local artist catalogue',confidence:'suggested',artist,support:count,total:peers.length}));
}
