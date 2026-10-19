const ID=/^[1-9][0-9]{0,19}$/;
const MAX_TRACKS=10000;
export function deezerPlaylistId(value){
 let url;try{url=new URL(String(value||'').trim());}catch{throw Error('Paste a public Deezer playlist link.');}
 const id=url.pathname.match(/^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?playlist\/([1-9][0-9]{0,19})\/?$/i)?.[1];
 if(url.protocol!=='https:'||!['www.deezer.com','deezer.com'].includes(url.hostname)||url.port||url.username||url.password||!id)throw Error('Use a full deezer.com/playlist/… link from your browser. Only public playlists are supported.');
 return id;
}
export function deezerPageUrl(value,id){
 const url=new URL(value);
 // Read only this playlist's track list. Never follow arbitrary provider URLs.
 if(!['http:','https:'].includes(url.protocol)||url.hostname!=='api.deezer.com'||url.port||url.username||url.password||url.pathname!==`/playlist/${id}/tracks`||url.hash)throw Error('Deezer returned an unexpected playlist page.');
 const index=url.searchParams.get('index');
 if(index!==null&&(!/^\d{1,6}$/.test(index)||Number(index)>MAX_TRACKS))throw Error('Deezer returned an invalid playlist position.');
 return `https://api.deezer.com/playlist/${id}/tracks?limit=100&index=${Number(index||0)}`;
}
async function json(url,{fetchImpl,signal}){
 const response=await fetchImpl(url,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(20000)]):AbortSignal.timeout(20000),headers:{Accept:'application/json','User-Agent':'Resonance/1.0'}});
 if(!response.ok)throw Error(`Deezer playlist unavailable (${response.status}). Check that it is public and try again later.`);
 if(Number(response.headers.get('content-length'))>5e6)throw Error('Deezer response is too large.');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>5e6)throw Error('Deezer response is too large.');chunks.push(value);}}finally{await reader.cancel();}
 const data=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(data.error)throw Error('Deezer could not read this playlist. Make it public and try again later.');
 return data;
}
export async function readDeezerPlaylist(id,{fetchImpl=fetch,signal}={}){
 if(!ID.test(id))throw Error('Invalid Deezer playlist.');
 const options={fetchImpl,signal},meta=await json(`https://api.deezer.com/playlist/${id}`,options);
 if(String(meta.id)!==id||meta.public===false||meta.type!=='playlist')throw Error('Deezer playlist unavailable. Only public playlists are supported.');
 let next=`https://api.deezer.com/playlist/${id}/tracks?limit=100&index=0`,count=0,total=null;
 const seen=new Set(),tracks=[];
 while(next){
  signal?.throwIfAborted();
  if(seen.has(next))throw Error('Deezer repeated a playlist page. Try checking again.');seen.add(next);
  const page=await json(next,options);
  if(!Array.isArray(page.data)||!Number.isInteger(page.total)||page.total<0||page.total>MAX_TRACKS)throw Error('Deezer returned an unsupported playlist (maximum 10,000 songs).');
  if(total!==null&&total!==page.total)throw Error('The Deezer playlist changed while reading it. Check it again.');total=page.total;
  for(const t of page.data){
   count++;if(count>MAX_TRACKS)throw Error('Deezer playlist exceeds 10,000 songs.');
   if(!t||!ID.test(String(t.id))||typeof t.title!=='string'||!t.title.trim()||!t.artist?.name)continue;
   const artists=[t.artist,...(Array.isArray(t.contributors)?t.contributors:[])].map(a=>String(a?.name||'').trim()).filter(Boolean);
   tracks.push({deezerId:String(t.id),title:t.title.trim().slice(0,500),artist:[...new Set(artists)].join(', ').slice(0,500),duration:Number.isFinite(t.duration)&&t.duration>0?t.duration:0,playlistIndex:count,deezerUrl:'https://www.deezer.com/track/'+t.id});
  }
  if(page.next&&!page.data.length)throw Error('Deezer returned an incomplete playlist. Try checking again.');
  next=page.next?deezerPageUrl(page.next,id):null;
 }
 if(count!==total)throw Error('Deezer returned an incomplete playlist. Try checking again.');
 return {title:String(meta.title||'Deezer playlist').slice(0,200),url:'https://www.deezer.com/playlist/'+id,tracks,skipped:count-tracks.length,limited:false};
}
