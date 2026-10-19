import {artistNames} from './artist-credits.js';
import {genreKey,genreTitle,sameGenreRecording} from './genre-identity.js';
import {metadataLocked} from './metadata-locks.js';

export function artistExplanation(t){
 if(metadataLocked(t,'artist'))return {review:false,label:'Your saved credits',text:'These artist credits are protected from automatic changes.'};
 if(!artistNames(t).length)return {review:true,label:'Artist missing',text:'No performer has been identified yet.'};
 if(t.musicbrainzArtists?.length)return {review:false,label:'Recording credits',text:'Named performers from the matched MusicBrainz recording.'};
 if(t.artistCreditSource==='Performance credit')return {review:false,label:'Named performer',text:'The upload explicitly names the cover performer or arranger.'};
 if(t.artistCreditSource==='Upload title')return {review:true,label:'Title-based credits',text:'Read from the upload title. A title prefix can also be a game, film or song name; check it before confirming.'};
 if(genreKey(t.artist)===genreKey(t.channel))return {review:true,label:'Uploader may be the artist',text:'The credit matches the upload channel. This may be the performer or a repost channel.'};
 return {review:false,label:'File / recording tags',text:'Saved artist tags, with explicitly named featured performers included.'};
}
export function genreExplanation(t){
 if(metadataLocked(t,'genre'))return {review:false,kind:'saved',label:'Your saved genre',text:t.genre?'Your choice is protected from automatic research.':'You chose to leave the genre empty.'};
 if(t.genreIdentityStale)return {review:true,kind:'stale',label:'Identity changed',text:'The artist or title was corrected after this genre was found. Research this recording again.'};
 if(!t.genre)return {review:true,kind:'missing',label:'Genre missing',text:t.genreError?'The last lookup could not finish. Saved details are unchanged.':t.genreCheckedAt?'Research found no sufficiently supported genre yet.':'No genre evidence is saved yet.'};
 if(t.genreBasis==='artist'||/≈|suggestion/i.test(t.genreSource||''))return {review:true,kind:'estimate',label:'Artist-level estimate',text:'Based on the artist’s catalogue, not a confirmed genre for this recording.'};
 return {review:false,kind:'evidence',label:'Track / source evidence',text:'Supported by saved recording, release, file or upload details.'};
}
export function libraryIssues(t){
 const issues=[];
 if(artistExplanation(t).review)issues.push('artists');
 if(genreExplanation(t).review)issues.push('genres');
 if(t.metadataStatus==='review')issues.push('recording');
 if(['album','date'].some(k=>!t[k]&&!metadataLocked(t,k)))issues.push('details');
 return issues;
}
// Only group candidates with the same credited lead artist and base title.
// A group is a comparison aid, never a command to merge or remove audio.
export function recordingGroups(tracks){
 const buckets=new Map();
 for(const t of tracks){if(t.available===false||t.kind==='mix')continue;
  const artist=genreKey(artistNames(t)[0]),title=genreKey(genreTitle(t).replace(/\s*[([][^()[\]]*\b(?:remix|live|cover|acoustic|instrumental|remaster(?:ed)?|radio edit|extended mix|slowed|sped up)\b[^()[\]]*[)\]]/gi,''));
  if(!artist||!title)continue;const k=artist+':'+title;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(t);
 }
 return [...buckets.values()].filter(a=>a.length>1).map(items=>{
  const first=items[0],sameSource=!!first.youtubeId&&items.every(t=>t.youtubeId===first.youtubeId);
  const same=sameSource||items.every(t=>t.duration>0&&sameGenreRecording(first,t));
  return {id:items.map(t=>t.id).sort().join('|'),tracks:items,type:same?'copies':'versions',label:sameSource?'Same source, multiple files':same?'Possible duplicate recordings':'Related versions',reason:sameSource?'These files share a YouTube recording ID.':same?'Matching title, artist credits, version and similar duration. Audio has not been fingerprinted.':'The title and lead artist agree, but the version, credits or length differ. Keep versions separate unless you confirm otherwise.'};
 });
}
export function libraryInsights(tracks){
 const available=tracks.filter(t=>t.available!==false),issues=new Map(available.map(t=>[t.id,libraryIssues(t)])),groups=recordingGroups(available);
 return {tracks:available,issues,groups,counts:{all:available.filter(t=>issues.get(t.id).length).length,artists:available.filter(t=>issues.get(t.id).includes('artists')).length,genres:available.filter(t=>issues.get(t.id).includes('genres')).length,versions:groups.length},missing:available.filter(t=>!t.genre&&!metadataLocked(t,'genre')).length,estimates:available.filter(t=>genreExplanation(t).kind==='estimate').length};
}
