import {hash,fold,neighbours} from './constellation-model.js';
import {artistNames} from './artist-credits.js';

// Broad, explicitly labelled genre families. Unlabelled files are never assigned
// a genre from their cover or sound measurements.
export const GENRE_REGIONS=[
 {id:'ambient',name:'Ambient & slow',color:'#83e4d0',test:/ambient|drone|meditation|new age|chill|downtempo|lo.?fi/},
 {id:'electronic',name:'Electronic',color:'#b19aff',test:/electro|techno|trance|house|dance|edm|dubstep|drum.?and.?bass|drum.?&.?bass|dnb|jungle|breakcore|hardstyle|synthwave|neurofunk|garage|breakbeat|bass music|future bass|glitch|idm|chiptune|drumstep|riddim|complextro|hardwave|darksynth|retrowave|future funk|future bounce|artcore|colour bass|color bass|melodic bass|futurecore/},
 {id:'rock',name:'Rock & metal',color:'#ff9a8e',test:/rock|metal|punk|industrial|grunge/},
 {id:'jazz',name:'Jazz & soul',color:'#efc778',test:/jazz|soul|r&b|blues|funk/},
 {id:'hiphop',name:'Hip-hop',color:'#f29bc5',test:/hip.?hop|\brap\b|\btrap\b|phonk/},
 {id:'classical',name:'Classical & scores',color:'#95bcff',test:/classical|orchestra|piano|soundtrack|score|cinematic/},
 {id:'folk',name:'Folk & acoustic',color:'#bddf85',test:/folk|acoustic|country|americana/},
 {id:'pop',name:'Pop & indie',color:'#ffcfab',test:/pop|indie|disco/},
 {id:'world',name:'World & other genres',color:'#7dcfe8',test:/.+/},
 {id:'unknown',name:'Genre not yet known',color:'#a9afbf',test:/^$/}
];
export function genreStyle(track){const tags=fold(track.genre).split(/[,;]/).map(s=>s.trim()).filter(Boolean),specific=tags.filter(s=>!['electronic','pop','rock','dance','world'].includes(s));for(const tag of [...specific,...tags]){const g=GENRE_REGIONS.slice(0,-2).find(g=>g.test.test(tag));if(g)return g;}return tags.length?GENRE_REGIONS.at(-2):GENRE_REGIONS.at(-1);}
export function artistSignature(track){
 const names=artistNames(track),key=fold(names[0]||'artist unknown'),seed=hash(key);
 return {key,names,count:3+Math.floor(seed*5),tilt:hash(key+'tilt')*Math.PI,phase:hash(key+'phase')*Math.PI*2,style:seed<.5?'halo':'twin orbit'};
}
export function regionPosition(index){const a=index/GENRE_REGIONS.length*Math.PI*2;return [Math.cos(a)*1150,Math.sin(a)*760,Math.sin(a*2+.3)*420];}
export function spacePosition(node){
 const region=genreStyle(node),center=regionPosition(GENRE_REGIONS.indexOf(region)),artist=artistSignature(node);
 const a=hash(artist.key+'azimuth')*Math.PI*2,b=(hash(artist.key+'height')-.5)*2;
 const r=100+hash(artist.key+'radius')*280,spread=125;
 return center.map((v,i)=>v+([Math.cos(a)*r,b*r,Math.sin(a)*r][i])+ (hash(node.id+'xyz'+i)-.5)*spread*2+((node.v?.[i]??.5)-.5)*70);
}
// A local spatial grid resolves crowded neighbourhoods once, not every frame.
export function spacedPositions(nodes,stored={}){
 const out={...stored},cells=new Map(),spacing=34;
 const cell=p=>p.map(v=>Math.floor(v/spacing));
 const put=p=>{const k=cell(p).join(',');if(!cells.has(k))cells.set(k,[]);cells.get(k).push(p);};
 for(const n of nodes)if(out[n.id])put(out[n.id]);
 for(const n of [...nodes].sort((a,b)=>a.id.localeCompare(b.id))){if(out[n.id])continue;const base=spacePosition(n);let p=base;
  for(let attempt=0;attempt<160;attempt++){
   const at=cell(p);let crowded=false;
   for(let x=-1;x<=1&&!crowded;x++)for(let y=-1;y<=1&&!crowded;y++)for(let z=-1;z<=1&&!crowded;z++)for(const q of cells.get([at[0]+x,at[1]+y,at[2]+z].join(','))||[])if(Math.hypot(...p.map((v,i)=>v-q[i]))<spacing){crowded=true;break;}
   if(!crowded)break;
   const a=(attempt+1)*2.39996+hash(n.id)*6.28,r=spacing*Math.cbrt(attempt+1);p=base.map((v,i)=>v+[Math.cos(a)*r,Math.sin(a*1.7)*r,Math.sin(a)*r][i]);
  }out[n.id]=p;put(p);
 }return out;
}
export function starAppearance(track){
 const key=track.id+'star',signature=artistSignature(track);
 return {type:Math.floor(hash(key)*8),variant:Math.floor(hash(key+'variant')*3),tilt:signature.tilt+hash(key+'tilt')*2,rate:.025+hash(key+'rate')*.035};
}
function groupOf(key,name,kind,points,color){
 const position=[0,1,2].map(i=>points.reduce((sum,p)=>sum+p.position[i],0)/points.length);
 if(kind==='artist'){position[0]-=80;position[1]+=70;}
 return {id:key,name,kind,color,position,count:points.length,ids:points.map(p=>p.id)};
}
export function buildSpace(nodes,stored={}){
 const positions=spacedPositions(nodes,stored),points=nodes.map(n=>({...n,position:positions[n.id],region:genreStyle(n),signature:artistSignature(n),appearance:starAppearance(n),flowPhase:[0,1,2].map(i=>hash(n.id+i)*6.28)}));
 const groups=GENRE_REGIONS.map(g=>{const members=points.filter(p=>p.region.id===g.id);return members.length?groupOf('genre:'+g.id,g.name,'genre',members,g.color):null;}).filter(Boolean);
 const artists=new Map();for(const p of points)for(const name of p.signature.names){const key=fold(name);if(!artists.has(key))artists.set(key,{name,points:[]});artists.get(key).points.push(p);}
 const artistGroups=[...artists].map(([key,a])=>groupOf('artist:'+key,a.name,'artist',a.points,a.points[0].region.color));
 return {points,groups,artistGroups,links:[]};
}
// A group hub connects every member, including a single-song artist. These
// edges use world positions and are independent of on-screen sprite culling.
export function groupConnections(data,id,visible){
 const group=data.artistGroups.find(g=>g.id===id);if(!group)return [];
 return group.ids.filter(id=>!visible||visible.has(id)).map(id=>({hub:group,node:data.points.find(p=>p.id===id)})).filter(e=>e.node);
}
export function sameArtistIds(points,id){const node=points.find(p=>p.id===id);if(!node)return new Set();const names=new Set(node.signature.names.map(fold));return new Set(points.filter(p=>p.signature.names.some(n=>names.has(fold(n)))).map(p=>p.id));}
export function connections(points,id){
 const node=points.find(p=>p.id===id);if(!node)return [];
 const names=new Set(node.signature.names.map(fold));
 const artists=points.filter(p=>p.id!==id&&p.signature.names.some(n=>names.has(fold(n)))).sort((a,b)=>Math.hypot(...a.position.map((v,i)=>v-node.position[i]))-Math.hypot(...b.position.map((v,i)=>v-node.position[i]))).slice(0,32);
 const seen=new Set(artists.map(p=>p.id));
 return [...artists.map(p=>[id,p.id,'artist']),...neighbours(points,id,5).filter(p=>!seen.has(p.id)).map(p=>[id,p.id,'sound'])];
}
// Motion is evaluated around the saved anchor, never integrated into it. Even
// after hours of listening a star stays within its own small neighbourhood.
export function flowingPosition(node,time){
 const phase=node.signature?.phase??hash(node.id)*Math.PI*2;
 return node.position.map((v,i)=>v+Math.sin(time*.13+phase+i*2.1)*5+Math.sin(time*.21+(node.flowPhase?.[i]??hash(node.id+i)*6.28))*2);
}
export class OrbitCamera {
 constructor(){this.yaw=this.pitch=0;this.zoom=1;this.center=[0,0,0];this.pose={yaw:0,pitch:0,zoom:1,center:[0,0,0]};}
 drag(dx,dy){this.focusing=false;this.yaw+=dx*.006;this.pitch+=dy*.006;}
 pan(dx,dy,width,height){
  this.focusing=false;
  const scale=(1250/this.pose.zoom)/Math.max(1,Math.min(width,height*1.55)*1.12);
  const x=-dx*scale,y=-dy*scale,cy=Math.cos(this.pose.yaw),sy=Math.sin(this.pose.yaw),cp=Math.cos(this.pose.pitch),sp=Math.sin(this.pose.pitch);
  const delta=[cy*x-sy*sp*y,cp*y,-sy*x-cy*sp*y];
  this.center=this.center.map((v,i)=>v+delta[i]);
 }
 scale(value){this.zoom=Math.max(.18,Math.min(8,value));}
 focus(point,zoom=2.8){this.focusing=true;this.center=[...point];this.scale(zoom);}
 home(){this.focusing=true;this.center=[0,0,0];this.scale(1);this.yaw=Math.round(this.pose.yaw/(2*Math.PI))*2*Math.PI;this.pitch=Math.round(this.pose.pitch/(2*Math.PI))*2*Math.PI;}
 update(dt,reduced=false){const a=reduced?1:1-Math.exp(-Math.min(.05,Math.max(0,dt))*(this.focusing?3.2:12));for(const k of ['yaw','pitch','zoom'])this.pose[k]+=(this[k]-this.pose[k])*a;this.pose.center=this.pose.center.map((v,i)=>v+(this.center[i]-v)*a);return this.pose;}
}
export function projectPoint(point,pose,width,height){
 const [x,y,z]=point.map((v,i)=>v-pose.center[i]),cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
 const xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp,depth=y*sp+zz*cp+1250/pose.zoom;
 if(depth<35)return null;
 const scale=Math.min(width,height*1.55)*1.12/depth;
 return {x:width/2+xx*scale,y:height/2+yy*scale,depth,scale};
}
// Reuse the camera basis for thousands of stars in a frame.
export function createProjector(pose,width,height,top=0){
 const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch),f=Math.min(width,height*1.55)*1.12,distance=1250/pose.zoom,center=pose.center;
 return point=>{const x=point[0]-center[0],y=point[1]-center[1],z=point[2]-center[2],xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp,depth=y*sp+zz*cp+distance;if(depth<35)return null;const scale=f/depth;return {x:width/2+xx*scale,y:top+height/2+yy*scale,depth,scale};};
}
// Clip a whole world-space connection, not its endpoint sprites. A route can
// cross the view even when both stars are offscreen or one is behind the camera.
export function projectSegment(a,b,pose,width,height,{top=0,clipWidth=width,clipHeight=height}={}){
 const cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
 const camera=p=>{const [x,y,z]=p.map((v,i)=>v-pose.center[i]),xx=x*cy-z*sy,zz=x*sy+z*cy;return [xx,y*cp-zz*sp,y*sp+zz*cp+1250/pose.zoom];};
 let p=camera(a),q=camera(b);if(p[2]<35&&q[2]<35)return null;
 if(p[2]<35||q[2]<35){const t=(35-p[2])/(q[2]-p[2]),cut=p.map((v,i)=>v+(q[i]-v)*t);if(p[2]<35)p=cut;else q=cut;}
 const f=Math.min(width,height*1.55)*1.12,screen=v=>({x:width/2+v[0]*f/v[2],y:top+height/2+v[1]*f/v[2]});
 p=screen(p);q=screen(q);const dx=q.x-p.x,dy=q.y-p.y;let lo=0,hi=1;
 for(const [d,n] of [[-dx,p.x],[dx,clipWidth-p.x],[-dy,p.y],[dy,clipHeight-p.y]]){if(Math.abs(d)<1e-9){if(n<0)return null;continue;}const t=n/d;if(d<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return null;}
 return {a:{x:p.x+dx*lo,y:p.y+dy*lo},b:{x:p.x+dx*hi,y:p.y+dy*hi},start:lo,end:hi};
}
// Desktop follows display cadence. Mobile/reduced-motion caps retain the
// fractional remainder instead of falling to 24/55 FPS on 120/165 Hz screens.
export class SceneCadence {
 constructor(){this.reset();}
 reset(){this.last=null;this.deadline=null;}
 step(now,interval=0){
  if(this.deadline!==null&&now+.1<this.deadline)return null;
  const dt=this.last===null?1/60:Math.min(.05,Math.max(0,(now-this.last)/1000));this.last=now;
  this.deadline=interval?this.deadline===null?now+interval:this.deadline+(Math.floor(Math.max(0,now-this.deadline)/interval)+1)*interval:now;
  return dt;
 }
}
export function pickSphere(hits,x,y,touch=false){
 // The frontmost sphere wins overlapping silhouettes. Larger touch targets
// fall back to nearest centre only when the user misses every visible sphere.
 const exact=hits.filter(h=>Math.hypot(x-h.x,y-h.y)<=h.radius+3).sort((a,b)=>a.depth-b.depth);
 return exact[0]||hits.filter(h=>Math.hypot(x-h.x,y-h.y)<=Math.max(h.radius,touch?22:12)).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
}

// Screen-space exclusions are shared by song captions and group buttons.
// A crowded group keeps its stars; it is still reachable through Explore.
export function placeMapLabels(candidates,bounds,occupied=[],limit=8){
 const boxes=occupied.map(b=>({...b})),result=[];
 for(const item of candidates){
  const width=Math.min(bounds.width,item.width),height=item.height||32;
  if(width<40||bounds.height<height)continue;
  for(const dy of [0,-38,38,-76,76]){
   const x=Math.max(bounds.x,Math.min(bounds.x+bounds.width-width,item.x-width/2));
   const y=Math.max(bounds.y,Math.min(bounds.y+bounds.height-height,item.y+dy));
   if(boxes.some(b=>x<b.x+b.width+8&&x+width+8>b.x&&y<b.y+b.height+8&&y+height+8>b.y))continue;
   const box={...item,x,y,width,height};boxes.push(box);result.push(box);break;
  }
  if(result.length>=limit)break;
 }return result;
}
