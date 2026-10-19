import {neighbours,hash} from './constellation-model.js';
import {genreStyle,artistSignature} from './constellation-space.js';
import {fold} from './constellation-model.js';

export function songTrail(track){
 const path=[{id:'home',label:'All music'}];if(!track)return path;
 const region=genreStyle(track),artist=artistSignature(track).names[0];
 path.push({id:'genre:'+region.id,label:region.name});if(artist)path.push({id:'artist:'+fold(artist),label:artist});
 path.push({id:'song:'+track.id,label:track.title});return path;
}

export const artistLabel=track=>track?.artist||track?.artists?.map(a=>a.name||a).join(', ')||track?.channel||'Artist not identified';
export function refreshMapTrack(previous,track){
 if(!track||previous.id!==track.id)return previous;
 // Analysis belongs to the audio file; display metadata follows the player.
 return {...previous,...track,v:previous.v,measured:previous.measured,known:previous.known,opening:previous.opening,closing:previous.closing};
}
export function journeyStart(nodes,{pinned='',current='',previous='',seed=0}={}){
 if(nodes.some(n=>n.id===pinned))return pinned;
 const nearby=current?neighbours(nodes,current,30):nodes;
 const choices=nearby.filter(n=>n.id!==current&&n.id!==previous);
 return (choices.sort((a,b)=>hash(a.id+':'+seed)-hash(b.id+':'+seed))[0]||nodes.find(n=>n.id!==previous)||nodes[0])?.id||'';
}
export class MapTrail{
 constructor(){this.entries=[{path:[{id:'home',label:'All music'}],camera:null}];this.index=0;}
 get current(){return this.entries[this.index];}
 capture(camera){if(camera)this.current.camera={yaw:camera.yaw,pitch:camera.pitch,zoom:camera.zoom,center:[...camera.center]};}
 enter(path,camera){this.capture(camera);this.entries.splice(this.index+1);this.entries.push({path,camera:null});this.index++;if(this.entries.length>40){this.entries.shift();this.index--;}}
 move(delta,camera){this.capture(camera);this.index=Math.max(0,Math.min(this.entries.length-1,this.index+delta));return this.current;}
}

export function groupTrail(data,id,previous=[]){
 const home={id:'home',label:'All music'},group=[...data.groups,...data.artistGroups].find(g=>g.id===id);
 if(!group)return [home];if(group.kind==='genre')return [home,{id,label:group.name}];
 const counts=data.groups.map(g=>({group:g,count:g.ids.filter(n=>group.ids.includes(n)).length})).filter(g=>g.count);
 const prior=previous.find(p=>p.id.startsWith('genre:'));
 const genre=counts.find(g=>g.group.id===prior?.id)?.group||counts.sort((a,b)=>b.count-a.count)[0]?.group;
 return [home,...(genre?[{id:genre.id,label:genre.name}]:[]),{id,label:group.name}];
}

const markerPools=new WeakMap();
/** Reuse visible labels, not every artist ever explored during the session. */
export function paintMapMarkers(root,markers){
 let pool=markerPools.get(root);if(!pool){pool=new Map();markerPools.set(root,pool);}
 const active=new Set(markers.map(marker=>marker.id));
 for(const [id,entry]of pool){if(!active.has(id)&&entry.button!==root.ownerDocument.activeElement){entry.button.remove();pool.delete(id);}}
 for(const marker of markers){
  let entry=pool.get(marker.id);
  if(!entry){const button=root.ownerDocument.createElement('button');button.type='button';button.dataset.cxGroup=marker.id;root.append(button);entry={button};pool.set(marker.id,entry);}
  const {button}=entry;
  const values={label:marker.name,aria:marker.id==='home'?'Return to all music':'Explore '+marker.name+' · '+marker.count+' songs',navigation:!!marker.navigation,transform:`translate(${marker.x.toFixed(2)}px,${marker.y.toFixed(2)}px)`,width:marker.width+'px',height:marker.height+'px',color:marker.color};
  if(values.label!==entry.label)button.textContent=values.label;
  if(values.aria!==entry.aria)button.setAttribute('aria-label',values.aria);
  if(values.navigation!==entry.navigation)button.classList.toggle('cx-waypoint',values.navigation);
  for(const key of ['transform','width','height'])if(values[key]!==entry[key])button.style[key]=values[key];
  if(values.color!==entry.color)button.style.setProperty('--group-color',values.color);
  Object.assign(entry,values);
 }
}
