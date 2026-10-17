const key=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+-\s+topic$/i,'').replace(/[^\p{L}\p{N}]/gu,'');
const unique=names=>[...new Map(names.map(x=>String(x?.name||x||'').trim()).filter(Boolean).map(x=>[key(x),x])).values()];
export function splitArtistCredit(credit){
 return unique(String(credit||'').replace(/\s+-\s+Topic$/i,'').split(/\s*[([]?\b(?:feat\.?|ft\.?|featuring)\s+|\s+[x×]\s+|\s*;\s*/i).flatMap(part=>{
  part=part.replace(/[)\]]\s*$/,'').trim();
  // Ampersands and commas may be part of a band's name. Structured provider
  // credits take precedence; don't split Earth, Wind & Fire or AC/DC blindly.
  return part.includes('&')?[part]:part.split(/,\s+/);
 }));
}
export function artistNames(track){
 if(track.metadataStatus==='manual'||track.metadataLocks?.artist)return splitArtistCredit(track.artist);
 if(track.artists?.length)return unique(track.artists);
 return splitArtistCredit(track.artist);
}
export const hasArtist=(track,name)=>artistNames(track).some(x=>key(x)===key(name));
export function repairArtistCredits(track){
 const result={...track};
 const protectedEdit=['manual','confirmed'].includes(track.metadataStatus);
 const recording=unique(track.recordingArtists||[]).filter(name=>key(name)!==key(track.channel));
 const structured=track.musicbrainzArtists?.length?unique(track.musicbrainzArtists):recording;
 if(!protectedEdit&&(!track.artist||key(track.artist)===key(track.channel))){
  const explicit=structured.join(', ');
  const prefix=String(track.rawTitle||'').replace(/^\[[^\]]+\]\s*/,'').split(/\s+[-–—]\s+/);
  const guessed=prefix.length>1&&key(prefix[0])!==key(track.channel)?prefix[0].trim():'';
  if(explicit||guessed){result.artistBeforeCreditRepair??=track.artist;result.artist=explicit||guessed;result.artistCreditSource=explicit?'Recording credits':'Upload title';}
 }
 const names=track.metadataStatus!=='manual'&&structured.length?structured:splitArtistCredit(result.artist);
 // A guest credit in the title belongs to that artist's library page too.
 const guest=String(track.title||track.rawTitle||'').match(/\b(?:feat\.?|ft\.?|featuring)\s+([^)[\]]+)/i)?.[1];
 result.artists=unique([...names,...(guest?splitArtistCredit(guest):[])]);
 result.artistCreditVersion=1;return result;
}
