export const ARTIST_CREDIT_VERSION=3;
const key=s=>String(s||'').normalize('NFKC').toLocaleLowerCase().replace(/\s+-\s+topic$/i,'').replace(/[^\p{L}\p{N}]/gu,'');
const unique=names=>[...new Map(names.map(x=>String(x?.name||x||'').trim()).filter(Boolean).map(x=>[key(x),x])).values()];
export function splitArtistCredit(credit){
 return unique(String(credit||'').replace(/\s+-\s+Topic$/i,'').split(/\s*[([]?\b(?:feat\.?|ft\.?|featuring)\s+|\s+[x×]\s+|\s*;\s*/i).flatMap(part=>{
  part=part.trim();if(part.endsWith(')')&&!part.includes('(')||part.endsWith(']')&&!part.includes('['))part=part.slice(0,-1).trim();
  // Ampersands and commas may be part of a band's name. Structured provider
  // credits take precedence; don't split Earth, Wind & Fire or AC/DC blindly.
  return part.includes('&')||/,\s+the\s+/i.test(part)?[part]:part.split(/,\s+/);
 }));
}
const protectedArtist=t=>!!t.metadataLocks?.artist||['manual','confirmed'].includes(t.metadataStatus);
export function artistNames(track){
 if(protectedArtist(track))return splitArtistCredit(track.artist);
 if(track.artists?.length)return unique(track.artists);
 return splitArtistCredit(track.artist);
}
export const hasArtist=(track,name)=>artistNames(track).some(x=>key(x)===key(name));
// A dash before a version or video label belongs to the song title, not a credit.
const annotation=/^(?:v\.?i\.?p\.?|(?:official\s+)?(?:music\s+|lyric\s+)?video\b.*|(?:official\s+)?(?:audio|visuali[sz]er|lyrics?)\b.*|day\s+\d+\b.*|(?:extended|full|original|radio|album|instrumental|acoustic|live|remastered?)(?:\s+(?:version|mix|edit|audio|video|\d{4}))*|(?:sped\s+up|slowed)(?:\s*\+\s*reverb)?)$/i;
// Only parse a labelled performance credit in a title segment, not an arbitrary
// "by" in a song name or the game/film name before a dash.
const performanceRole='(?:(?:heavy|metal|rock|piano|guitar|acoustic|electric|orchestral|orchestra|symphonic|epic|jazz|vocal|violin|cello|bass|drum|drums|instrumental|english|japanese|full|official)\\s+){0,4}(?:cover(?:ed)?|arrangement|arranged|performed)';
function performanceCredit(track){
 const raw=String(track.rawTitle||track.title||'').replace(/\s*\[[\w-]{11}\]$/,'');
 const matches=[...raw.matchAll(new RegExp('(?:[([]|\\s+(?:[-–—]|\\|{1,2})\\s+)'+performanceRole+'\\s+(?:by\\s+|\\|{1,2}\\s+)([^()[\\]\\|]+)','gi'))];
 const known=unique([track.channel,...(track.recordingArtists||[]),...(track.musicbrainzArtists||[])]).map(key),names=[];
 for(const match of matches){
  const parts=match[1].trim().split(/\s+[-–—]\s+/),credit=parts[0].trim();
  if(parts.slice(1).some(p=>!annotation.test(p))||!credit||credit.length>100||!/[\p{L}]/u.test(credit)||/https?:|www\.|[@#]/i.test(credit)||annotation.test(credit))continue;
  for(const name of splitArtistCredit(credit)){
   const collaborators=name.split(/\s+(?:&|and|with)\s+/i);
   // Preserve band names such as Earth, Wind & Fire. A known performer must
   // corroborate an ampersand/"with" collaboration before splitting it.
   names.push(...(collaborators.length>1&&collaborators.some(n=>known.includes(key(n)))?collaborators:[name]));
  }
 }
 return unique(names);
}
function uploadCredit(track){
 const raw=String(track.rawTitle||track.title||'').replace(/^\[[^\]]+\]\s*/,'').trim();
 const parts=raw.split(/\s+[-–—]\s+/);let credit=parts[0],song=parts.slice(1).join(' - ');
 if(parts.length<2){const event=raw.split(/\s+\|\s+/);if(event.length!==2||!/(?:\blive\b|\bfestival\b|\bwinter\b|\bsummer\b|\b(?:19|20)\d{2}\b)/i.test(event[1]))return null;[credit,song]=event;}
 if(!credit||!song||annotation.test(song)||/^["'“‘].*["'”’]$/.test(credit))return null;
 if(key(song)===key(track.channel))return {names:splitArtistCredit(song),song:credit};
 return {names:splitArtistCredit(credit),song};
}
export function titleArtistCredits(track){
 if(protectedArtist(track))return [];
 const upload=uploadCredit(track),title=upload?upload.song:String(track.title||track.rawTitle||'');
 const guest=title.match(/\b(?:feat\.?|ft\.?|featuring)\s+([^)[\]]+)/i)?.[1]?.split(/\s+[-–—|]\s+/)[0];
 const remix=[...String(track.rawTitle||track.title||'').matchAll(/[([]([^()[\]]+?)\s+(?:(?:bootleg|official)\s+)?(?:remix|rework|bootleg)[)\]]/gi)].filter(m=>!annotation.test(m[1])&&!/^(?:official|club|dance|dub|bass|trap|house|drum\s*(?:&|and)\s*bass)$/i.test(m[1])).flatMap(m=>splitArtistCredit(m[1]));
 return unique([...(guest?splitArtistCredit(guest):[]),...remix]);
}
export function repairArtistCredits(track){
 const result={...track};
 if(protectedArtist(track)){result.artists=splitArtistCredit(track.artist);result.artistCreditVersion=ARTIST_CREDIT_VERSION;return result;}
 // Re-evaluate older guesses using the original credit, without deleting evidence.
 const original=track.artistCreditSource==='Upload title'&&track.artistCreditVersion!==ARTIST_CREDIT_VERSION?track.artistBeforeCreditRepair??track.artist:track.artist;
 const structured=unique(track.musicbrainzArtists||[]);
 const recording=unique((track.recordingArtists||[]).flatMap(a=>splitArtistCredit(a?.name||a)));
 const performance=performanceCredit(track),upload=uploadCredit(track),prefix=upload?.names||[],channel=key(track.channel);
 const intersects=prefix.some(n=>recording.some(r=>key(n)===key(r))),reversed=!!upload&&key(String(track.rawTitle||track.title||'').split(/\s+[-–—]\s+/).at(-1))===channel&&!!channel;
 let names=structured,source='Recording credits';
 if(!names.length&&performance.length){names=performance;source='Performance credit';}
 else if(!names.length){
  names=recording.length?recording:splitArtistCredit(original);
  const weak=!recording.length&&(!original||key(original)===channel||splitArtistCredit(original).some(n=>prefix.some(p=>key(p)===key(n)))||track.artistCreditSource==='Upload title');
  if(prefix.length&&(weak||reversed||recording.length>0&&recording.every(n=>key(n)===channel)||intersects)){
   // Exclude an uploader from combined fallback tags only when an upload
   // credits someone else. A self-uploading performer remains an artist.
   names=unique([...prefix,...recording.filter(n=>key(n)!==channel||prefix.some(p=>key(p)===channel))]);source='Upload title';
  }
 }
 const artist=names.join(', ');
 if(artist!==String(track.artist||'')){result.artistBeforeCreditRepair??=track.artist;result.artist=artist;}
 if(names.length)result.artistCreditSource=source;
 result.artists=unique([...names,...titleArtistCredits(track)]);
 result.artistCreditVersion=ARTIST_CREDIT_VERSION;return result;
}
