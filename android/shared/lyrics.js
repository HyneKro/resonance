import {genreTitle,genreArtists,genreKey} from './genre-identity.js';
import {parseLyricsfile} from './lyric-timing.js';

export const LYRICS_VERSION=3;
export const lyricsStamp=t=>[t?.title,t?.artist,t?.album,Math.round(t?.duration||0)].join('|');
const bounded=s=>String(s||'').slice(0,128000);
const timestamp=s=>{const m=s.match(/^(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?$/);return m?Number(m[1])*60+Number(m[2])+Number('0.'+(m[3]||'0')):NaN;};
/** Preserve real timing, including repeated timestamps and blank instrumental breaks. */
export function parseLyrics(value,duration=Infinity){
 const raw=bounded(value).replace(/\r/g,''),offset=Number(raw.match(/\[offset:([+-]?\d+)\]/i)?.[1]||0)/1000,lines=[];
 for(const row of raw.split('\n')){
  const stamps=[...row.matchAll(/\[(\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?)\]/g)];if(!stamps.length)continue;
  const content=row.replace(/\[(?:\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?)\]/g,'').trim(),text=content.replace(/<\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?>/g,'').trim();
  const tags=[...content.matchAll(/<(\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?)>([^<]*)/g)];
  for(const stamp of stamps){
   const time=Math.max(0,timestamp(stamp[1])-offset);if(!Number.isFinite(time)||time>duration+1)continue;
   const line={time,text},shift=timestamp(stamp[1])-timestamp(stamps[0][1])-offset;
   const words=tags.filter(m=>m[2]).map(m=>({text:m[2],start:Math.max(0,timestamp(m[1])+shift)}));
   if(tags.length<=401)for(let i=0;i<words.length;i++){const end=tags.find(m=>timestamp(m[1])+shift>words[i].start);if(end)words[i].end=timestamp(end[1])+shift;}
   if(words.length&&words.length<=400&&words.map(w=>w.text).join('').trim()===text&&words.every((w,i)=>w.start>=time&&w.start<=duration+1&&(!Number.isFinite(w.end)||w.end<=duration+1)&&(!i||w.start>=words[i-1].start)))line.words=words;
   lines.push(line);
  }
  if(lines.length>=2000)break;
 }
 lines.sort((a,b)=>a.time-b.time);
 const merged=[];for(const line of lines){const prior=merged.at(-1);if(prior?.time===line.time){if(line.text&&line.text!==prior.text){prior.text+='\n'+line.text;delete prior.words;}}else merged.push(line);}
 return merged;
}
export function lyricText(value){return bounded(value).replace(/\[(?:\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?|(?:ar|ti|al|by|offset|length|re|ve):[^\]]*)\]/gi,'').replace(/<\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?>/g,'').trim();}
export function lyricIdentity(t){
 return {title:genreTitle(t).replace(/^\[(?:edm|dnb|chill|dubstep|trap|house|nu disco|future bass)\]\s*[-â€“â€”]?\s*/i,'').trim(),artists:genreArtists(t)};
}
const versions=s=>[...String(s||'').toLowerCase().matchAll(/\b(remix|live|cover|acoustic|instrumental|nightcore|slowed|sped|remaster|extended|edit|version)\b/g)].map(m=>m[1]).sort().join('|');
export function lyricsMatch(t,r){
 if(!r)return {identity:false,timed:false};
 const a=lyricIdentity(t),b=lyricIdentity({title:r.trackName,artist:r.artistName});
 const names=a.artists.map(genreKey),other=b.artists.map(genreKey),title=genreKey(a.title);
 const credits=names.length&&other.length&&names[0]===other[0]&&(names.every(n=>other.includes(n))||other.every(n=>names.includes(n)));
 const identity=!!title&&title===genreKey(b.title)&&!!credits&&versions(t.rawTitle||t.title)===versions(r.trackName);
 const difference=Math.abs(Number(r.duration)-Number(t.duration));
 return {identity,timed:identity&&t.duration>0&&r.duration>0&&difference<=3,difference};
}
export function lyricsQueries(t){
 const {title,artists}=lyricIdentity(t);if(!title||t.kind==='mix')return [];if(!artists.length)return [{track_name:title}];
 const all=artists.join(', '),queries=[{track_name:title,artist_name:all}];
 if(artists.length>1)queries.push({track_name:title,artist_name:artists[0]});
 return queries;
}
export function chooseLyrics(t,records,{textOnly=true}={}){
 return records.filter(r=>(r.plainLyrics||r.syncedLyrics||r.lyricsfile||r.instrumental)&&lyricsMatch(t,r).identity)
  .filter(r=>lyricsMatch(t,r).timed||textOnly&&!r.instrumental&&r.plainLyrics&&lyricsMatch(t,r).difference<=Math.max(15,Number(t.duration)*.08))
  .sort((a,b)=>Number(lyricsMatch(t,b).timed)-Number(lyricsMatch(t,a).timed)||Number(!!b.hasWordSync)-Number(!!a.hasWordSync)||Number(!!b.syncedLyrics)-Number(!!a.syncedLyrics)||Math.abs(a.duration-t.duration)-Math.abs(b.duration-t.duration))[0]||null;
}
export function lyricDocument(t,r,{confirmed=false,local=false}={}){
 const timed=local||lyricsMatch(t,r).timed;
 const duration=t.duration>0?t.duration:Infinity,rich=parseLyricsfile(r.lyricsfile,duration);
 const syncedLyrics=bounded(r.syncedLyrics),lines=timed?(rich?.lines.length?rich.lines:parseLyrics(syncedLyrics,duration)):[];
 const text=lyricText(r.plainLyrics||rich?.text||syncedLyrics),instrumental=!!r.instrumental&&!text;
 return {version:LYRICS_VERSION,stamp:lyricsStamp(t),savedAt:Date.now(),source:local?r.source||'Local lyrics':'LRCLIB',url:local?'':'https://lrclib.net/api/get/'+r.id,
  text,instrumental,syncedLyrics,lyricsfile:typeof r.lyricsfile==='string'?r.lyricsfile.slice(0,256000):'',language:rich?.language||'',lines,confirmed,status:instrumental?'instrumental':lines.some(l=>l.text)?'synced':text?'text':'missing',
  timingNotice:syncedLyrics&&!timed?'Lyrics found; timing needs checking for this recording.':''};
}
export function importedLyrics(track,value){
 const raw=String(value||'');if(new TextEncoder().encode(raw).length>256000)throw Error('Lyrics file is too large. Choose one smaller than 256 KB.');
 const rich=parseLyricsfile(raw,track.duration);
 if(!rich&&(/^\s*(?:\{|\[\s*\{)/.test(raw)&&!parseLyrics(raw,track.duration).length||/^\s*(?:---\s*)?version\s*:/m.test(raw)))throw Error('This lyrics file has invalid or unsupported timing. Choose LRC or Lyricsfile version 1.0.');
 const record=lyricDocument(track,{plainLyrics:rich?.text||raw,lyricsfile:rich?raw:'',syncedLyrics:rich?'':raw,source:'Imported lyrics'},{local:true,confirmed:true});
 if(!record.text)throw Error('No readable lyrics in this file.');return record;
}
export function lyricLineAt(lines,time){
 let lo=0,hi=lines.length-1,found=-1;while(lo<=hi){const mid=(lo+hi)>>1;if(lines[mid].time<=time){found=mid;lo=mid+1;}else hi=mid-1;}return found;
}
