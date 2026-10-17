import {normalize,searchTitle,searchArtist,matchScore} from './metadata.mjs';
export function spotifyPlaylistId(value){
 let url;try{url=new URL(String(value||'').trim());}catch{throw Error('Paste a public Spotify playlist link.');}
 const id=url.pathname.match(/^\/(?:intl-[a-z-]+\/)?playlist\/([A-Za-z0-9]{22})\/?$/)?.[1];
 if(url.protocol!=='https:'||url.hostname!=='open.spotify.com'||url.port||url.username||url.password||!id)throw Error('Use an open.spotify.com/playlist/… link. Only public playlists are supported.');return id;
}
export function parseSpotifyPlaylist(html,id){
 const text=html.match(/<script\b[^>]*id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)?.[1];let entity;
 try{entity=JSON.parse(text).props.pageProps.state.data.entity;}catch{throw Error('Spotify did not expose this playlist. It may be private or temporarily unavailable.');}
 if(entity?.type!=='playlist'||entity.id!==id||!Array.isArray(entity.trackList))throw Error('Spotify returned an unsupported playlist page.');
 const tracks=entity.trackList.flatMap((t,index)=>{
  const trackId=t.uri?.match(/^spotify:track:([A-Za-z0-9]{22})$/)?.[1];
  if(!trackId||typeof t.title!=='string'||!t.title.trim())return [];
  return [{spotifyId:trackId,title:t.title.slice(0,500),artist:String(t.subtitle||'').replaceAll('\u00a0',' ').slice(0,500),duration:Number.isFinite(t.duration)?t.duration/1000:0,playlistIndex:index+1,spotifyUrl:'https://open.spotify.com/track/'+trackId}];
 });
 if(!tracks.length)throw Error('No public music tracks were exposed by Spotify. Private tracks and podcast episodes cannot be imported.');
 return {title:String(entity.title||entity.name||'Spotify playlist').slice(0,200),tracks,url:'https://open.spotify.com/playlist/'+id,limited:entity.trackList.length>=100,skipped:entity.trackList.length-tracks.length};
}
export async function readSpotifyPlaylist(id,{fetchImpl=fetch,signal}={}){
 if(!/^[A-Za-z0-9]{22}$/.test(id))throw Error('Invalid Spotify playlist.');
 const response=await fetchImpl('https://open.spotify.com/embed/playlist/'+id,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),redirect:'error',headers:{'User-Agent':'Resonance/1.0','Accept':'text/html'}});
 if(!response.ok)throw Error(`Spotify playlist unavailable (${response.status}). Check that it is public and try again later.`);
 if(Number(response.headers.get('content-length'))>5e6)throw Error('Spotify response is too large.');
 const reader=response.body.getReader(),chunks=[];let size=0;try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5e6)throw Error('Spotify response is too large.');chunks.push(value);}}finally{await reader.cancel();}
 return parseSpotifyPlaylist(Buffer.concat(chunks).toString('utf8'),id);
}
export function spotifyCandidates(track,entries){
 const primary=track.artist.split(',')[0].trim(),reference={...track,artist:primary};
 return entries.filter(e=>/^[\w-]{11}$/.test(e.id)&&e.title&&e.duration>0&&!e.is_live).map(e=>{
  const channel=e.channel||e.uploader||'',artist=searchArtist(channel),title=searchTitle(e.title,primary);
  const credit=normalize(channel).includes(normalize(primary))||normalize(e.title).startsWith(normalize(primary));
  const score=matchScore(reference,{title,artist:credit?primary:artist,duration:e.duration});
  return {id:e.id,title:e.title.slice(0,500),channel:channel.slice(0,300),duration:e.duration,score:Math.round(score*100),url:'https://www.youtube.com/watch?v='+e.id};
 }).sort((a,b)=>b.score-a.score).slice(0,3);
}
export async function spotifyEntries(sync,source,archived,{read=readSpotifyPlaylist}={}){
 const playlist=await read(source.playlist,{signal:sync.spotifyAbort?.signal}),local=sync.lib.list().filter(t=>t.sourceId===source.id&&t.available),entries=[],cache=sync.lib.getSetting('spotifyMatches')||{};
 for(const [index,track]of playlist.tracks.entries()){
  if(sync.cancelled)break;sync.job.message=`${source.name} · matching ${index+1} / ${playlist.tracks.length}: ${track.title}`;
  const exact=local.find(t=>t.spotifyId===track.spotifyId),matches=local.filter(t=>matchScore(track,t)>=.98),existing=exact||(matches.length===1?matches[0]:null);
  if(existing){entries.push({...track,id:existing.youtubeId||track.spotifyId,title:track.title,channel:track.artist,sourceId:source.id,status:'existing',trackId:existing.id,reason:'Already in this collection',provider:'spotify'});continue;}
  let candidates=cache[track.spotifyId]?.candidates;
  if(!candidates?.length||Date.now()-cache[track.spotifyId].at>7*864e5){
   try{const query=[track.artist.split(',')[0],track.title,'audio'].join(' ').slice(0,450);const output=await sync.run(['--flat-playlist','--dump-single-json','--socket-timeout','20','--playlist-end','3','ytsearch3:'+query],null,60000);candidates=spotifyCandidates(track,JSON.parse(output).entries||[]);cache[track.spotifyId]={at:Date.now(),candidates};sync.lib.setSetting('spotifyMatches',cache);}
   catch(error){if(sync.cancelled)break;sync.job.errors.push(`${track.title}: matching unavailable. ${error.message.slice(0,180)}`);candidates=[];}
  }
  const best=candidates.find(c=>c.id===cache[track.spotifyId]?.chosenId)||candidates[0],found=best&&local.find(t=>t.youtubeId===best.id),downloaded=best&&(archived.has(best.id)||found);
  entries.push({...track,id:best?.id||track.spotifyId,title:track.title,channel:track.artist,sourceId:source.id,provider:'spotify',status:downloaded?'existing':best?'review':'unavailable',trackId:found?.id,reason:downloaded?'Downloaded YouTube match':best?'Confirm the YouTube recording':'No YouTube match found',candidates,matchedTitle:best?.title,matchedChannel:best?.channel,matchedDuration:best?.duration});
 }
 const notices=[...(playlist.limited?['Spotify exposed its first 100 tracks; this import may be incomplete. The remaining tracks were not checked.']:[]),...(playlist.skipped?[`${playlist.skipped} unsupported entries skipped.`]:[])];
 return {entries,source:{id:source.id,name:playlist.title,count:entries.length,url:playlist.url,provider:'spotify'},notices};
}
