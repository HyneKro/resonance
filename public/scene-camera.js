import {Inertia} from './inertia.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const CAMERA_SPEED={min:.2,max:20,default:2.22};
export const AERIAL_CAMERA=Object.freeze({min:-.08,max:1.25});
export const CAMERA_ZOOM=Object.freeze({max:3,focalLength:1.9});
// Fit the complete Flux box at every orbit angle. Exploration is a separate
// dolly through that volume, so it can deliberately leave the fitted framing.
export function fluxCameraDistance(pose=[0,0,0,0],{aspect=1.6,scale=1,movement=1,explore=0}={}){
 const turn=(a,b,r)=>[a*Math.cos(r)+b*Math.sin(r),b*Math.cos(r)-a*Math.sin(r)];
 const size=clamp(scale,.55,1.45),fitX=Math.min(1,aspect/.95),motion=clamp(movement,0,4),lens=1.9*1.03;
 let distance=0;
 for(const x of [-3.6,3.6])for(const y of [-1.8-motion*.55,1.7+motion*.96])for(const z of [-5.4,5.1]){
  let a=x*size*fitX,b=y*size,c=z*size;
  [a,c]=turn(a,c,pose[0]);[b,c]=turn(b,c,pose[1]);[a,b]=turn(a,b,pose[3]);
  distance=Math.max(distance,c+Math.max(lens*Math.abs(a)/Math.max(.1,aspect)/.86,lens*Math.abs(b)/.82)+.25);
 }
 return Math.max(.65,distance+(pose[2]||0)*.26-(distance-.7)*clamp(explore,0,1));
}
// Smooth unwrapped angles in double precision, then reduce only the values
// uploaded to the GPU. Long fast rail sessions must not lose sub-frame precision.
export function cameraUniform(pose=[0,0,0,0]){return [pose[0]%(Math.PI*2),pose[1]%(Math.PI*2),pose[2],pose[3]];}
export class SceneCamera {
 constructor(){this.yaw=0;this.pitch=0;this.phase=0;this.pose=[0,0,0,0].map(x=>new Inertia(x,.45));this.speed=new Inertia(.12,2);this.zoom=new Inertia(0,2);this.zoomSignal=new Inertia(0,.65);this.lens=new Inertia(CAMERA_ZOOM.focalLength,.45);this.exploreTarget=0;this.exploration=new Inertia(0,.6);}
 setExplore(value){this.exploreTarget=clamp(Number(value)||0,0,1);}
 get focalLength(){return this.lens.value;}
 drag(dx,dy){this.yaw+=dx*.005;this.pitch+=dy*.005;if(this.grounded)this.pitch=clamp(this.pitch,AERIAL_CAMERA.min,AERIAL_CAMERA.max);}
 reset(){this.yaw=Math.round(this.pose[0].value/(Math.PI*2))*Math.PI*2;this.pitch=this.grounded?0:Math.round(this.pose[1].value/(Math.PI*2))*Math.PI*2;this.phase=0;this.setExplore(0);}
 update(dt,{rail=false,speed=CAMERA_SPEED.default,zoom=false,features={},reduced=false,frozen=false,grounded=false}={}){
  this.grounded=grounded;
  if(grounded){this.pitch=clamp(this.pitch,AERIAL_CAMERA.min,AERIAL_CAMERA.max);const p=this.pose[1];if(p.value<AERIAL_CAMERA.min||p.value>AERIAL_CAMERA.max){p.value=clamp(p.value,AERIAL_CAMERA.min,AERIAL_CAMERA.max);p.velocity=0;}}
  dt=clamp(dt||0,0,.1);if(frozen)return this.pose.map(p=>p.value);
  if(reduced){this.exploration.value=this.exploreTarget;this.exploration.velocity=0;}else this.exploration.update(this.exploreTarget,dt);
  const energy=clamp(features.loudness||0,0,1),bass=clamp(features.bands?.[1]||0,0,1);
  let railPitch=0;
  if(rail&&!reduced){const before=this.speed.value,velocity=this.speed.update((.07+energy*.13+bass*.04)*clamp(speed,CAMERA_SPEED.min,CAMERA_SPEED.max),dt),travel=(before+velocity)*.5*dt;this.phase+=travel;this.yaw+=travel;railPitch=Math.sin(this.phase*.71)*.55+Math.sin(this.phase*.23)*.18;}
  // The rail adds motion to the manual orbit; it never overwrites a drag.
  // A delayed frame after starting/skipping audio must not advance the dolly
  // several visible frames at once. Keep the lens and depth on the same clock.
  const zoomDt=Math.min(dt,1/30);
  const signal=reduced?0:this.zoomSignal.update(energy*.65+bass*.35,zoomDt);
  const strength=zoom?(reduced?1:CAMERA_ZOOM.max*Math.pow(clamp(signal,0,1),.85)):0;
  this.zoom.seconds=strength>this.zoom.value?2:1.5;
  if(reduced){this.zoom.value=strength;this.zoom.velocity=0;this.zoomSignal.value=0;this.zoomSignal.velocity=0;}
  const dive=reduced?strength:clamp(this.zoom.update(strength,zoomDt),0,CAMERA_ZOOM.max);
  const railDepth=rail&&!reduced?Math.sin(this.phase*.83)*.35-energy*.18:0;
  // Translate the perspective camera through the field, keeping its distance
  // positive even at the strongest zoom and the closest part of the rail.
  const depth=(5.4+railDepth)/(1+dive*.65)-5.4;
  // Widen the field of view while moving inward: depth parallax remains, but
  // framing stays open instead of magnifying the whole sculpture as heavily.
  const focalLength=CAMERA_ZOOM.focalLength/(1+dive*.18);
  if(reduced){this.lens.value=focalLength;this.lens.velocity=0;}else this.lens.update(focalLength,zoomDt);
  const target=[this.yaw,grounded?clamp(this.pitch+railPitch,AERIAL_CAMERA.min,AERIAL_CAMERA.max):this.pitch+railPitch,depth,rail&&!reduced&&!grounded?Math.sin(this.phase*.57)*.07:0];
  return this.pose.map((p,i)=>{if(reduced){p.value=target[i];p.velocity=0;return p.value;}const value=p.update(target[i],i===2?zoomDt:dt);if(grounded&&i===1&&(value<AERIAL_CAMERA.min||value>AERIAL_CAMERA.max)){p.value=clamp(value,AERIAL_CAMERA.min,AERIAL_CAMERA.max);p.velocity=0;}return p.value;});
 }
}
export function installFluxExploreControls({reactor,onFit=()=>{}}){
 const sync=()=>document.querySelectorAll('[data-flux-zoom]').forEach(e=>e.value=reactor.camera.exploreTarget);
 document.addEventListener('input',e=>{if(!e.target.matches('[data-flux-zoom]'))return;reactor.camera.setExplore(e.target.value);reactor.needsFrame=true;sync();});
 document.addEventListener('click',e=>{if(!e.target.closest('[data-flux-fit]'))return;reactor.camera.reset();reactor.rollercoaster=false;reactor.cameraZoom=false;reactor.needsFrame=true;sync();onFit();});
}
export function installCameraControls({reactor}){
 const room=document.querySelector('#listening-room');let drag=null,moved=false;
 const allowed=target=>!room.hidden&&!reactor.musicOnly&&!document.querySelector('dialog[open]')&&!document.body.classList.contains('library-open')&&!target.closest('.constellation,button,input,select,textarea,a,summary,.visual-tools,.room-dock,.room-top,.app-shell,.dance-companion');
 const cancel=()=>{if(!drag)return;const id=drag.id;drag=null;if(room.hasPointerCapture(id))room.releasePointerCapture(id);room.classList.remove('camera-dragging');};
 room.addEventListener('pointerdown',e=>{if(e.button!==0||e.buttons!==1||!allowed(e.target))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};moved=false;room.setPointerCapture(e.pointerId);});
 room.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;if(e.buttons!==1){cancel();return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!moved&&Math.hypot(dx,dy)<4)return;moved=true;reactor.camera.drag(dx,dy);drag.x=e.clientX;drag.y=e.clientY;room.classList.add('camera-dragging');reactor.needsFrame=true;});
 const abort=()=>{cancel();moved=false;};
 room.addEventListener('pointerup',cancel);room.addEventListener('pointercancel',abort);room.addEventListener('lostpointercapture',()=>{if(drag)abort();});window.addEventListener('blur',abort);
 room.addEventListener('click',e=>{if(moved){moved=false;e.preventDefault();e.stopPropagation();}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape')abort();});
 document.querySelector('[data-camera-reset]')?.addEventListener('click',()=>{reactor.rollercoaster=false;reactor.cameraZoom=false;reactor.camera.reset();reactor.needsFrame=true;});
}
