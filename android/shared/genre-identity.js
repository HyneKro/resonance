import {artistNames,titleArtistCredits} from './artist-credits.js';
export const genreKey=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function genreTitle(track){
 let title=String(track.title||'').replace(/\s*\[[\w-]{11}\]$/,'').replace(/\s*[\[(](?:(?:4k|hd)\s+)?(?:official(?:\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music\s*video|clip officiel|official m\.?v\.?|lyrics?(?: video)?|audio|visuali[sz]er|[^)\]]{1,35} release)[\])]/gi,'').replace(/\s+official (?:music video|lyric video|audio|visuali[sz]er)$/i,'').trim();
 const parts=title.split(/\s+[-–—]\s+/);if(parts.length>1&&[track.artist,...artistNames(track)].some(a=>genreKey(a)===genreKey(parts[0])))title=parts.slice(1).join(' - ');
 return title.replace(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\s*[^)\]]+[)\]]/gi,'').replace(/\s+(?:feat\.?|ft\.?|featuring)\s*.*$/i,'').trim();
}
export function genreArtists(track){
 const names=track.artistIds?.length?track.artistIds.map(a=>a.name):artistNames(track);
 return [...new Map([...names,...titleArtistCredits(track)].filter(Boolean).map(n=>[genreKey(n),n])).values()];
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
 if(remix)return [remix];
 const names=genreArtists(track),out=[...names];
 for(const name of names){const m=name.match(/^([^()[\]]+)\s*[([]([^()[\]]+)[)\]]$/);if(!m)continue;const latin=s=>/^[\p{Script=Latin}\p{N}\p{P}\p{Zs}]+$/u.test(s);if(latin(m[1])!==latin(m[2]))out.push(m[1].trim(),m[2].trim());}
 return [...new Map(out.map(n=>[genreKey(n),n])).values()];
}
export function genreSearchTracks(track){
 const variants=[track];if(track.metadataLocks?.artist||['manual','confirmed'].includes(track.metadataStatus))return variants;
 // The uploader is a search clue, not an artist credit. Only a matching
 // recording may corroborate it; repost channels must not colour their uploads.
 if(!genreArtists(track).length&&track.channel){const artist=track.channel.replace(/\s+-\s+Topic$/i,'').replace(/\s+official$/i,'').trim();if(artist)variants.push({...track,artist,artists:undefined,artistIds:undefined,channelCandidate:true});}
 const parts=String(track.rawTitle||'').split(/\s+[-–—]\s+/);
 if(parts.length===2&&track.duration>0&&genreKey(parts[0])===genreKey(track.artist)&&genreKey(parts[1])===genreKey(track.title))variants.push({...track,title:parts[0],artist:parts[1],artists:undefined,artistIds:undefined,rawTitle:parts[0]});
 for(const candidate of [...variants]){
  const names=genreArtists(candidate);if(names.length!==1||!(candidate.duration>0))continue;
  const m=names[0].match(/^([^()[\]]+)\s*[([]([^()[\]]+)[)\]]$/);if(!m)continue;
  const left=m[1].trim(),right=m[2].trim(),latin=s=>/^[\p{Script=Latin}\p{N}\p{P}\p{Zs}]+$/u.test(s);
  if(latin(left)===latin(right))continue;
  for(const artist of [left,right])variants.push({...candidate,artist,artists:undefined,artistIds:undefined});
 }
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
