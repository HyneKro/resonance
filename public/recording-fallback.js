// Last resort only. Never turn an account/network restriction into more requests.
export function downloadFailure(raw=''){
 const text=String(raw).toLowerCase();
 if(/429|too many requests|rate.?limit|try again later|confirm.{0,10}not a bot|temporar|timed out|connection|network|http error 5\d\d|no space|disk full|permission denied|certificate|ffmpeg not found/.test(text))return 'pause';
 if(/video unavailable|video is unavailable|video has been removed|video was removed|private video|no longer available|not available in your country|blocked.{0,30}copyright/.test(text))return 'unavailable';
 return 'other';
}
export const cleanRecording=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[([]\s*(?:official\s+)?(?:music video|video|audio|lyrics?|visuali[sz]er|hd|hq)\s*[)\]]/g,' ').replace(/\s+-\s+topic$|\s+(?:official\s+(?:music\s+)?(?:video|audio)|lyrics?\s+video)$/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
const versions=s=>(String(s).toLowerCase().match(/\b(remix|live|cover|acoustic|instrumental|sped|slowed|nightcore|karaoke|extended|edit|remaster\w*)\b/g)||[]).sort().join(' ');
const withoutArtist=(title,artist)=>(' '+title+' ').replace(' '+artist+' ',' ').trim();
export function fallbackCandidates(track,entries){
 const identity=recordingIdentity(track),title=cleanRecording(identity.title),artist=cleanRecording(identity.artist),duration=Number(track.duration);
 if(title.length<3||!artist||!(duration>15&&duration<1200))return [];
 return entries.filter(e=>e.id!==track.id&&/^[\w-]{11}$/.test(e.id)&&!e.is_live&&e.duration>0).map(e=>{
  const name=cleanRecording(e.title),channel=cleanRecording(e.channel||e.uploader),credit=(name+' '+channel),words=title.split(' '),overlap=words.filter(w=>name.split(' ').includes(w)).length/words.length;
  const artistMatch=(' '+credit+' ').includes(' '+artist+' '),delta=Math.abs(e.duration-duration),versionMatch=versions(identity.title)===versions(e.title);
  const exact=withoutArtist(title,artist)===withoutArtist(name,artist)&&artistMatch&&versionMatch&&delta<=Math.max(4,duration*.02);
  return {...e,score:overlap*.6+(artistMatch?.25:0)+(delta<=4?.15:0),safe:exact};
 }).filter(e=>e.safe).sort((a,b)=>b.score-a.score).slice(0,2);
}

export function recordingIdentity(track){
 let title=String(track.title||'').trim(),artist=String(track.artist||track.channel||'').replace(/\s+-\s+Topic$/i,'').trim();
 const parts=title.split(/\s+[-–—]\s+/);if(parts.length===2&&parts[0].length<100){artist=parts[0].trim();title=parts[1].trim();}
 return {title,artist};
}
export function recordingQueries(track,query=''){
 if(query.trim())return ['ytsearch10:'+query.trim().slice(0,300)];
 const {title,artist}=recordingIdentity(track);if(!title||/^(unavailable|deleted|private) video$/i.test(title))return [];
 const quote=s=>'"'+s.replaceAll('"','')+'"';
 return [...new Set([`ytsearch8:${artist} ${title} audio`,`ytsearch8:${quote(title)} ${quote(artist)}`].map(s=>s.slice(0,450)))];
}
export function reviewRecordings(track,entries){
 const safe=new Set(fallbackCandidates(track,entries).map(e=>e.id));
 return [...new Map(entries.filter(e=>/^[\w-]{11}$/.test(e?.id||'')&&e.id!==(track.id||track.youtubeId)&&!e.is_live).map(e=>[e.id,{id:e.id,title:String(e.title||''),channel:String(e.channel||e.uploader||''),duration:Number(e.duration)||0,safe:safe.has(e.id)}])).values()].sort((a,b)=>Number(b.safe)-Number(a.safe)).slice(0,20);
}
