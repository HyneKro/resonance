// Deterministic, local-only music relationships. No audio or library data leaves the device.
const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,Number.isFinite(n)?n:a));
const mean=a=>a.length?a.reduce((s,n)=>s+n,0)/a.length:0;
export const fold=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619);}return (n>>>0)/4294967296;}
export function summarizeProfile(p){
 const rows=p?.timeline?.filter(r=>Array.isArray(r)&&r.length>=5&&r.slice(0,5).every(Number.isFinite)&&r[1]>-60)||[];
 if(!rows.length)return null;
 const energy=rows.map(r=>clamp(r[2])),e=mean(energy),edge=Math.max(1,Math.ceil(rows.length*.1));
 return {v:[e,mean(rows.map(r=>clamp(r[3]))),mean(rows.map(r=>clamp(r[4]))),clamp(Math.sqrt(mean(energy.map(n=>(n-e)**2)))*3)],opening:mean(energy.slice(0,edge)),closing:mean(energy.slice(-edge)),savedAt:p.savedAt||0};
}
const priors=[
 [/ambient|drone|meditation|new age/,[.18,.30,.12,.25]],
 [/classical|orchestra|piano|soundtrack/,[.38,.40,.27,.65]],
 [/lo.?fi|chill|downtempo|trip.?hop/,[.32,.32,.32,.30]],
 [/jazz|soul|r&b|acoustic|folk/,[.43,.40,.38,.48]],
 [/drum.?and.?bass|drum.?&.?bass|dnb|jungle|breakcore|hardstyle|metal/,[.88,.76,.72,.48]],
 [/techno|trance|edm|dubstep|electro|house|dance/,[.72,.60,.56,.36]],
 [/rock|punk|industrial/,[.77,.69,.65,.48]],
 [/hip.?hop|rap|trap|funk|disco/,[.65,.43,.62,.34]],
 [/pop|synth|indie/,[.58,.54,.43,.44]],
 ];
export function describe(track,profile){
 const genre=fold(track.genre),prior=priors.find(([test])=>test.test(genre))?.[1];
 const measured=profile?.v?.length===4&&profile.v.every(Number.isFinite);
 // The saved profile describes relative energy, texture and transient contrast, not BPM or instruments.
 const v=measured?profile.v.map((n,i)=>clamp(prior?.[i]===undefined?n:n*.7+prior[i]*.3)):[...(prior||[.5,.5,.5,.5])];
 return {...track,v,measured,known:measured||!!prior,tags:genre.split(/[,;/]/).map(g=>g.trim()).filter(Boolean),opening:measured?clamp(profile.opening):v[0],closing:measured?clamp(profile.closing):v[0]};
}
export function distance(a,b){
 const weights=[.34,.30,.20,.16];let value=a.v.reduce((s,n,i)=>s+weights[i]*(n-b.v[i])**2,0);
 if(!a.known||!b.known)value+=.12;
 if(a.tags.some(g=>b.tags.includes(g)))value*=.76;
 if(a.artist&&fold(a.artist)===fold(b.artist))value*=.85;
 return value;
}
export function reasons(a,b){
 const out=[];if(a.artist&&fold(a.artist)===fold(b.artist))out.push('Same artist');
 const common=a.tags.filter(g=>b.tags.includes(g));if(common.length)out.push('Shared genre: '+common[0]);
 if(a.measured&&b.measured){if(Math.abs(a.v[0]-b.v[0])<.2)out.push('Similar energy contour');if(Math.abs(a.v[1]-b.v[1])<.2)out.push('Related sound texture');if(Math.abs(a.v[2]-b.v[2])<.2)out.push('Similar transient contrast');}
 if(!out.length)out.push(a.measured&&b.measured?'Closest available sound profile':'Library clues · sound data still limited');
 return out.slice(0,3);
}
export function neighbours(nodes,id,limit=5,excluded=[]){const a=nodes.find(t=>t.id===id);if(!a)return [];const blocked=new Set([id,...excluded]);return nodes.filter(t=>!blocked.has(t.id)).sort((x,y)=>distance(a,x)-distance(a,y)||x.id.localeCompare(y.id)).slice(0,limit);}
export function positionFor(node){
 const jitter=hash(node.id+'x')-.5,jitterY=hash(node.id+'y')-.5;
 return node.known?[100+node.v[0]*1000+jitter*140,100+(1-node.v[1])*720+jitterY*130]:[600+jitter*240,460+jitterY*170];
}
export function cleanMapState(value={},ids){
 if(!value||typeof value!=='object')value={};
 const known=new Set(ids),positions={},space={},colors={};
 for(const [id,p] of Object.entries(value.space||{}).slice(0,20000))if(known.has(id)&&Array.isArray(p)&&p.length===3&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<10000))space[id]=p;
 for(const [id,p] of Object.entries(value.positions||{}).slice(0,20000))if(known.has(id)&&Array.isArray(p)&&p.length===2&&p.every(n=>Number.isFinite(n)&&Math.abs(n)<10000))positions[id]=p;
 for(const [id,c] of Object.entries(value.colors||{}).slice(0,20000))if(known.has(id)&&/^#[0-9a-f]{6}$/i.test(c))colors[id]=c;
 const places=(Array.isArray(value.places)?value.places:[]).slice(0,24).filter(p=>p&&typeof p.name==='string'&&known.has(p.id)).map(p=>({id:p.id,name:p.name.slice(0,60),zoom:clamp(p.zoom,1,8)}));
 return {version:2,positions,space,colors,places,seed:clamp(value.seed,0,1e9)};
}
export function makeMap(nodes,saved,knownIds=nodes.map(n=>n.id)){const state=cleanMapState(saved,knownIds);for(const n of nodes)state.positions[n.id]??=positionFor(n);return state;}
export function journey(nodes,{start,end='',stops=[],minutes=30,explore=.5,mood='lift',seed=0}={}){
 nodes=nodes.filter(t=>t.available!==false);const byId=new Map(nodes.map(t=>[t.id,t]));if(!byId.has(start))throw Error('Choose a starting song first.');
 if(end===start||!byId.has(end))end='';explore=clamp(Number(explore));
 const anchors=[...new Set([start,...stops.slice(0,5),end].filter(id=>byId.has(id)))];
 const goals={lift:[.88,.64,.6,.4],unwind:[.22,.35,.2,.35],float:[.45,.55,.35,.5],stay:byId.get(start).v};
 const target=byId.get(end)||{v:goals[mood]||goals.lift,tags:[],known:true};
 const budget=clamp(Number(minutes),5,180)*60,anchorTime=anchors.reduce((s,id)=>s+durationOf(byId.get(id)),0);
 const routes=[start],used=new Set(anchors),segments=Math.max(1,anchors.length-(end?1:0)),perSegment=Math.max(0,budget-anchorTime)/segments;
 const eligible=nodes.filter(t=>!used.has(t.id)&&t.kind!=='mix'&&durationOf(t)<1200);
 for(let leg=0;leg<segments;leg++){
  const from=byId.get(routes.at(-1)),destination=byId.get(anchors[leg+1])||target;let seconds=0;
  while(seconds<perSegment-45&&routes.length<60-Math.max(0,anchors.length-1-leg)){
   const remaining=perSegment-seconds,progress=clamp((seconds+180)/Math.max(perSegment,1)),aim=from.v.map((n,i)=>n+(destination.v[i]-n)*progress),last=byId.get(routes.at(-1));
   const candidates=eligible.filter(t=>!used.has(t.id)&&durationOf(t)<=remaining+90);
   if(!candidates.length)break;
   const score=t=>{
    const familiarity=clamp(Math.log1p(Number(t.plays)||0)/5+(t.favorite ? .35 : 0));
    const artistRepeat=last.artist&&fold(last.artist)===fold(t.artist)?.09:0;
    return distance(t,{v:aim,known:true,tags:[]})*.65+distance(last,t)*.35+Math.abs(last.closing-t.opening)*.05+artistRepeat+(explore-.5)*familiarity*.12+hash(t.id+':'+seed+':'+leg)*.045+Math.abs(remaining-durationOf(t))*.000005;
   };
   // Score each candidate once. Sorting repeatedly made large phone libraries stall.
   let picked=candidates[0],best=Infinity;for(const candidate of candidates){const value=score(candidate);if(value<best||value===best&&candidate.id<picked.id){picked=candidate;best=value;}}
   used.add(picked.id);routes.push(picked.id);seconds+=durationOf(picked);
  }
  if(anchors[leg+1])routes.push(anchors[leg+1]);
 }
 return {ids:routes,duration:routes.reduce((s,id)=>s+durationOf(byId.get(id)),0),requested:budget,limited:routes.length<2||Math.abs(routes.reduce((s,id)=>s+durationOf(byId.get(id)),0)-budget)>180};
}
export const durationOf=t=>Number.isFinite(t?.duration)&&t.duration>0?t.duration:180;
export function queueWithJourney(queue,index,current,ids,mode){
 const clean=[...new Set(ids)].filter(id=>typeof id==='string'&&id);
 if(!current||mode==='now')return {queue:clean,index:0,start:true};
 const head=queue[index]===current?queue.slice(0,index+1):[current];
 const tail=clean[0]===current?clean.slice(1):clean;
 return {queue:[...head,...tail],index:head.length-1,start:false};
}
