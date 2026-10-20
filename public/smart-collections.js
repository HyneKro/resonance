const text=value=>typeof value==='string'?value.trim().slice(0,120):'';
const fold=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const COLLECTION_TEMPLATES=[
 {id:'unheard',name:'Still to discover',rules:{unplayed:true},sort:'added'},
 {id:'rediscover',name:'Favorites rediscovered',rules:{favorite:true,notPlayedDays:30},sort:'oldest'},
 {id:'fresh',name:'Fresh arrivals',rules:{addedDays:30},sort:'added'},
 {id:'short',name:'A little interlude',rules:{maxMinutes:4},sort:'title'},
];
export function normalizeCollections(value){
 if(!Array.isArray(value))return [];
 const seen=new Set();
 return value.slice(0,50).filter(c=>c&&typeof c==='object').map(c=>{
  const id=text(c.id).replace(/[^a-zA-Z0-9_-]/g,'');if(!id||seen.has(id))return null;seen.add(id);
  const r=c.rules||{},rules={};
  for(const k of ['genre','artist','query'])if(text(r[k]))rules[k]=text(r[k]);
  for(const k of ['favorite','unplayed'])if(r[k]===true)rules[k]=true;
  for(const [k,max]of [['notPlayedDays',3650],['addedDays',3650],['maxMinutes',1440]])if(Number.isFinite(r[k])&&r[k]>0)rules[k]=Math.min(max,r[k]);
  return {id,name:text(c.name)||'My collection',rules,sort:['title','added','oldest','plays'].includes(c.sort)?c.sort:'title'};
 }).filter(Boolean);
}
export function collectionTracks(tracks,collection,now=Date.now()){
 const c=normalizeCollections([collection])[0];if(!c)return [];
 const r=c.rules,day=86400000;
 return tracks.filter(t=>{
  if(t.available===false)return false;
  if(r.favorite&&!t.favorite||r.unplayed&&Number(t.plays)>0)return false;
  if(r.notPlayedDays&&Number(t.lastPlayed)>now-r.notPlayedDays*day)return false;
  if(r.addedDays&&!(Number(t.addedAt)>=now-r.addedDays*day))return false;
  if(r.maxMinutes&&!(Number(t.duration)>0&&Number(t.duration)<=r.maxMinutes*60))return false;
  if(r.genre&&!fold(t.genre).includes(fold(r.genre)))return false;
  if(r.artist&&!fold(t.artist).includes(fold(r.artist)))return false;
  return !r.query||fold(r.query).split(/\s+/).every(word=>fold([t.title,t.artist,t.album,t.genre].join(' ')).includes(word));
 }).sort((a,b)=>(c.sort==='added'?Number(b.addedAt||0)-Number(a.addedAt||0):c.sort==='oldest'?Number(a.lastPlayed||0)-Number(b.lastPlayed||0):c.sort==='plays'?Number(b.plays||0)-Number(a.plays||0):0)||String(a.title||'').localeCompare(String(b.title||''))||String(a.id).localeCompare(String(b.id)));
}
export function collectionPlaylists(tracks,definitions){
 return normalizeCollections(definitions).map(c=>({id:'smart:'+c.id,name:c.name,tracks:collectionTracks(tracks,c).map(t=>t.id)}));
}
