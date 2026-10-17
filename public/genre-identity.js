import {artistNames,splitArtistCredit} from './artist-credits.js';
export const genreKey=s=>String(s||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function genreTitle(track){
 let title=String(track.title||'').replace(/\s*\[[\w-]{11}\]$/,'').replace(/\s*[\[(](?:(?:4k|hd)\s+)?(?:official(?:\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music video|lyrics?(?: video)?|audio|visuali[sz]er|monstercat release)[\])]/gi,'').replace(/\s+official (?:music video|lyric video|audio|visuali[sz]er)$/i,'').trim();
 const parts=title.split(/\s+[-–—]\s+/);if(parts.length>1&&[track.artist,...artistNames(track)].some(a=>genreKey(a)===genreKey(parts[0])))title=parts.slice(1).join(' - ');
 return title.replace(/\s*[([]\s*(?:feat\.?|ft\.?|featuring)\s+[^)\]]+[)\]]/gi,'').replace(/\s+(?:feat\.?|ft\.?|featuring)\s+.*$/i,'').trim();
}
export function genreArtists(track){
 const names=track.artistIds?.length?track.artistIds.map(a=>a.name):artistNames(track),guest=String(track.title||'').match(/\b(?:feat\.?|ft\.?|featuring)\s+([^)[\]]+)/i)?.[1];
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
