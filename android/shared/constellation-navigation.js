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
