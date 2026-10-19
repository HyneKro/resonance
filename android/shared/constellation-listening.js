import {distance,fold,hash,reasons} from './constellation-model.js';
import {artistSignature,genreStyle} from './constellation-space.js';

const finite=(n,fallback=0)=>Number.isFinite(n)?n:fallback;
const clamp=n=>Math.max(0,Math.min(1,n));

// The player supplies its actual order (including shuffle), never a new forecast.
// A repeated star cannot occupy two places at once: stop the spatial trail at
// that occurrence, while retaining the complete short list for the queue panel.
export function listeningPath(snapshot={},known){
 const id=snapshot.id||'',valid=id&&(!known||known.has(id));
 const ids=valid?[id]:[],order=Array.isArray(snapshot.ids)?snapshot.ids:[];
 const startAt=order[0]===id?1:0;
 if(valid&&!snapshot.repeatOne)for(const next of order.slice(startAt)){if(ids.length>=5)break;if(!known||known.has(next))ids.push(next);else break;}
 const path=[],seen=new Set();let returning=false;
 for(const next of ids){if(seen.has(next)){returning=true;break;}seen.add(next);path.push(next);}
 const duration=Math.max(0,finite(snapshot.duration)),start=Math.min(duration,Math.max(0,finite(snapshot.range?.start))),end=Math.min(duration,Math.max(start,finite(snapshot.range?.end,duration)));
 const measured=duration>0&&end>start,progress=measured?clamp((finite(snapshot.time)-start)/(end-start)):0;
 return {id:valid?id:'',ids,path,returning,progress,measured,paused:!!snapshot.paused,waiting:!!snapshot.waiting,repeatOne:!!snapshot.repeatOne,start,end,remaining:measured?Math.max(0,end-Math.max(start,finite(snapshot.time))):null};
}

// Interpolate BEFORE perspective projection. Interpolating the clipped 2D line
// makes the light slide to the wrong time when panning, zooming or near-clipping.
export function pointOnLink(a,b,progress){return a.map((v,i)=>v+(b[i]-v)*clamp(finite(progress)));}

export function discoveryPicks(nodes,id,{excluded=[],seed=0}={}){
 const source=nodes.find(n=>n.id===id);if(!source)return [];
 const blocked=new Set([id,...excluded]),artists=new Set(artistSignature(source).names.map(fold)),region=genreStyle(source).id;
 const pool=nodes.filter(n=>n.available!==false&&!blocked.has(n.id)).map(n=>({n,d:distance(source,n),same:artistSignature(n).names.some(a=>artists.has(fold(a))),region:genreStyle(n).id,plays:Math.max(0,n.plays||0),tie:hash(id+n.id+seed)}));
 const result=[],used=new Set();
 function choose(label,candidates,reason){
  const shortlist=candidates.filter(x=>!used.has(x.n.id)).slice(0,5).sort((a,b)=>a.tie-b.tie),pick=shortlist[0];if(!pick)return;
  used.add(pick.n.id);result.push({track:pick.n,label,reason:reason(pick)});
 }
 const near=[...pool].sort((a,b)=>a.d-b.d||a.tie-b.tie);
 choose('Stay in this feeling',near,p=>p.same?'Another song by an artist on this track':reasons(source,p.n)[0]);
 const minimum=pool.length?Math.min(...pool.map(p=>p.plays)):0;
 choose(minimum===0?'A first listen':'Rediscover',near.filter(p=>p.plays===minimum),p=>p.plays===0?'Not played in this library yet':`Only ${p.plays} ${p.plays===1?'play':'plays'} in your library`);
 choose('A different direction',near.filter(p=>!p.same&&p.region!=='unknown'&&region!=='unknown'&&p.region!==region),p=>`${genreStyle(p.n).name} · a different genre family`);
 return result;
}
