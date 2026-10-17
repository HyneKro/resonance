import {neighbours,hash} from './constellation-model.js';

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
