import {lyricsQueries,chooseLyrics} from './public/lyrics.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let tail=Promise.resolve(),nextAt=0;
/** One polite request lane, shared by details, playback and background research. */
export function lyricsJSON(url,{signal,fetcher=fetch}={}){
 const task=tail.catch(()=>{}).then(async()=>{
  if(signal?.aborted)throw signal.reason;
  const wait=nextAt-Date.now();if(wait>30000)throw Error('Lyrics service is resting. Try again later.');
  if(wait>0)await sleep(wait);
  const r=await fetcher(url,{headers:{'User-Agent':'Resonance/1.23.3 (https://github.com/HyneKro/resonance)'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
  nextAt=Date.now()+400;
  if(r.status===404){await r.body?.cancel();return null;}
  if(!r.ok){const retry=r.headers.get('retry-after'),seconds=Number(retry),until=retry?(Number.isFinite(seconds)?Date.now()+Math.max(0,seconds)*1000:Date.parse(retry)):NaN;nextAt=Math.max(nextAt,Number.isFinite(until)?until:Date.now()+1500);await r.body?.cancel();const error=Error('Lyrics service unavailable ('+r.status+'). Try again later.');error.status=r.status;throw error;}
  let size=0;const chunks=[];for await(const chunk of r.body){size+=chunk.length;if(size>6e6)throw Error('Lyrics response too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 });tail=task;return task;
}
export async function searchLyrics(t,json=lyricsJSON,options={}){
 const found=new Map();let error;
 for(const query of lyricsQueries(t)){
  try{const result=await json('https://lrclib.net/api/search?'+new URLSearchParams(query),options);for(const r of Array.isArray(result)?result:[])if(Number.isSafeInteger(r.id)&&r.id>0)found.set(r.id,r);}catch(e){error=e;if(e.status===429||options.signal?.aborted)throw e;}
  if(chooseLyrics(t,[...found.values()],{textOnly:false})?.syncedLyrics)break;
 }
 if(!found.size&&error)throw error;return [...found.values()];
}
