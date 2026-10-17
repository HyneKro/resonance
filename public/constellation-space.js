import {hash,fold,neighbours} from './constellation-model.js';
import {artistNames} from './artist-credits.js';

// Broad, explicitly labelled genre families. Unlabelled files are never assigned
// a genre from their cover or sound measurements.
export const GENRE_REGIONS=[
 {id:'ambient',name:'Ambient & slow',color:'#83e4d0',test:/ambient|drone|meditation|new age|chill|downtempo|lo.?fi/},
 {id:'electronic',name:'Electronic',color:'#b19aff',test:/electro|techno|trance|house|dance|edm|dubstep|drum.?and.?bass|drum.?&.?bass|dnb|jungle|breakcore|hardstyle|synthwave/},
 {id:'rock',name:'Rock & metal',color:'#ff9a8e',test:/rock|metal|punk|industrial|grunge/},
 {id:'jazz',name:'Jazz & soul',color:'#efc778',test:/jazz|soul|r&b|blues|funk/},
 {id:'hiphop',name:'Hip-hop',color:'#f29bc5',test:/hip.?hop|rap|trap/},
 {id:'classical',name:'Classical & scores',color:'#95bcff',test:/classical|orchestra|piano|soundtrack|score|cinematic/},
 {id:'folk',name:'Folk & acoustic',color:'#bddf85',test:/folk|acoustic|country|americana/},
 {id:'pop',name:'Pop & indie',color:'#ffcfab',test:/pop|indie|disco/},
 {id:'world',name:'World & other genres',color:'#7dcfe8',test:/.+/},
 {id:'unknown',name:'Genre not yet known',color:'#a9afbf',test:/^$/}
];
export function genreStyle(track){return GENRE_REGIONS.find(g=>g.test.test(fold(track.genre).trim()))||GENRE_REGIONS.at(-1);}
export function artistSignature(track){
 const names=artistNames(track),key=fold(names[0]||'artist unknown'),seed=hash(key);
 return {key,names,count:3+Math.floor(seed*5),tilt:hash(key+'tilt')*Math.PI,phase:hash(key+'phase')*Math.PI*2,style:seed<.5?'halo':'twin orbit'};
}
export function regionPosition(index){const a=index/GENRE_REGIONS.length*Math.PI*2;return [Math.cos(a)*430,Math.sin(a)*260,Math.sin(a*2+.3)*180];}
export function spacePosition(node){
 const region=genreStyle(node),center=regionPosition(GENRE_REGIONS.indexOf(region)),artist=artistSignature(node);
 const a=hash(artist.key+'azimuth')*Math.PI*2,b=(hash(artist.key+'height')-.5)*2;
 const r=55+hash(artist.key+'radius')*85,spread=45;
 return center.map((v,i)=>v+([Math.cos(a)*r,b*r,Math.sin(a)*r][i])+ (hash(node.id+'xyz'+i)-.5)*spread*2+((node.v?.[i]??.5)-.5)*70);
}
export function buildSpace(nodes,stored={}){
 const points=nodes.map(n=>({...n,position:stored[n.id]||spacePosition(n),region:genreStyle(n),signature:artistSignature(n)}));
 const groups=GENRE_REGIONS.map((g,i)=>({...g,position:regionPosition(i),count:points.filter(p=>p.region.id===g.id).length})).filter(g=>g.count);
 // A sparse genre skeleton, not an all-to-all graph. Selection reveals the
// meaningful artist/sound relationships without burying the map in lines.
 const links=[];for(const g of groups){const group=points.filter(p=>p.region.id===g.id).sort((a,b)=>hash(a.id)-hash(b.id));for(let i=1;i<group.length;i+=3)links.push([group[i-1].id,group[i].id,'genre']);}
 return {points,groups,links};
}
export function connections(points,id){
 const node=points.find(p=>p.id===id);if(!node)return [];
 const names=new Set(node.signature.names.map(fold));
 const artists=points.filter(p=>p.id!==id&&p.signature.names.some(n=>names.has(fold(n)))).sort((a,b)=>Math.hypot(...a.position.map((v,i)=>v-node.position[i]))-Math.hypot(...b.position.map((v,i)=>v-node.position[i]))).slice(0,8);
 const seen=new Set(artists.map(p=>p.id));
 return [...artists.map(p=>[id,p.id,'artist']),...neighbours(points,id,5).filter(p=>!seen.has(p.id)).map(p=>[id,p.id,'sound'])];
}
export class OrbitCamera {
 constructor(){this.yaw=this.pitch=0;this.zoom=1;this.center=[0,0,0];this.pose={yaw:0,pitch:0,zoom:1,center:[0,0,0]};}
 drag(dx,dy){this.yaw+=dx*.006;this.pitch+=dy*.006;}
 scale(value){this.zoom=Math.max(.65,Math.min(8,value));}
 focus(point,zoom=2.8){this.center=[...point];this.scale(zoom);}
 home(){this.center=[0,0,0];this.scale(1);this.yaw=Math.round(this.pose.yaw/(2*Math.PI))*2*Math.PI;this.pitch=Math.round(this.pose.pitch/(2*Math.PI))*2*Math.PI;}
 update(dt,reduced=false){const a=reduced?1:1-Math.exp(-Math.min(.05,Math.max(0,dt))*12);for(const k of ['yaw','pitch','zoom'])this.pose[k]+=(this[k]-this.pose[k])*a;this.pose.center=this.pose.center.map((v,i)=>v+(this.center[i]-v)*a);return this.pose;}
}
export function projectPoint(point,pose,width,height){
 const [x,y,z]=point.map((v,i)=>v-pose.center[i]),cy=Math.cos(pose.yaw),sy=Math.sin(pose.yaw),cp=Math.cos(pose.pitch),sp=Math.sin(pose.pitch);
 const xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp,depth=y*sp+zz*cp+1250/pose.zoom;
 if(depth<35)return null;
 const scale=Math.min(width,height*1.55)*1.12/depth;
 return {x:width/2+xx*scale,y:height/2+yy*scale,depth,scale};
}
export function pickSphere(hits,x,y,touch=false){
 // The frontmost sphere wins overlapping silhouettes. Larger touch targets
// fall back to nearest centre only when the user misses every visible sphere.
 const exact=hits.filter(h=>Math.hypot(x-h.x,y-h.y)<=h.radius+3).sort((a,b)=>a.depth-b.depth);
 return exact[0]||hits.filter(h=>Math.hypot(x-h.x,y-h.y)<=Math.max(h.radius,touch?22:12)).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y))[0];
}
