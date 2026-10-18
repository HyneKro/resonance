import {tintCompanionPixels} from './companion-model.js';
import {REST_POSE} from './companion-motion.js';
import {SONA_SHEETS} from './companion-atlas.js';
import {drawCompanionEmblem} from './companion-emblem.js';
import {companionAppearance,appearanceInfo,appearanceCell} from './companion-appearances.js';

// The painted sprite sheets stay untouched. Recoloring preserves their
// line work, alpha, warm skin and shading. Exactly one pose is drawn per frame.
export class CompanionRenderer{
 constructor(canvas,onReady=()=>{},onError=()=>{}){
  this.canvas=canvas;this.context=canvas.getContext('2d');this.onReady=onReady;this.onError=onError;this.ready=false;this.frames=new Map();this.tints=new Map();this.size=160;canvas.width=canvas.height=this.size;this.appearance='sona';this.wantedAppearance='sona';this.generation=0;
 }
 load(){
  return this.setAppearance(this.wantedAppearance);
 }
 setAppearance(value){
  const id=companionAppearance(value);this.wantedAppearance=id;
  if(this.loading&&this.loadingId===id)return this.loading;
  const generation=++this.generation;
  if(this.ready&&this.appearance===id){this.loading=null;return Promise.resolve(true);}
  const info=appearanceInfo(id),sheet=id==='sona'?SONA_SHEETS[0]:{src:info.src,columns:12,rows:10};
  this.loadingId=id;
  const pending=new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>image.naturalWidth!==sheet.columns*160||image.naturalHeight!==sheet.rows*160?reject(Error('Invalid sprite grid')):resolve(image);image.onerror=reject;image.src=sheet.src;
  }).then(image=>{
   if(generation!==this.generation)return false;
   // Commit the new atlas only once ready. Late loads cannot replace a newer
   // choice, and old decoded textures/frame caches are released on a switch.
   this.images=[image];this.appearance=id;this.ready=true;this.frames.clear();this.tints.clear();this.onReady();return true;
  }).catch(()=>{if(generation===this.generation)this.onError(info.label+' artwork could not load. Please choose another appearance or try again.');return false;}).finally(()=>{if(generation===this.generation)this.loading=null;});
  this.loading=pending;return pending;
 }
 frame(row,frame){
  const key=row+':'+frame;if(this.frames.has(key))return this.frames.get(key);
  if(!this.readback){const buffer=document.createElement('canvas');buffer.width=buffer.height=this.size;this.readback=buffer.getContext('2d',{willReadFrequently:true});}
  const ctx=this.readback;ctx.clearRect(0,0,this.size,this.size);
  // Whole poses are measured and registered once when the texture is built.
  const cell=appearanceCell(row,frame),x=this.appearance==='sona'?frame:cell%12,y=this.appearance==='sona'?row:Math.floor(cell/12);
  ctx.drawImage(this.images[0],x*160,y*160,160,160,0,0,160,160);
  let data=ctx.getImageData(0,0,this.size,this.size);
  if(this.appearance==='sona'&&drawCompanionEmblem(ctx,data,row,frame))data=ctx.getImageData(0,0,this.size,this.size);
  if(this.frames.size>=32)this.frames.delete(this.frames.keys().next().value);this.frames.set(key,data);return data;
 }
 painted(row,frame,colors,hairColors=colors){
  const quantize=color=>color.map(v=>Math.min(255,Math.round(v/4)*4));colors=colors.map(quantize);hairColors=hairColors.map(quantize);
  const original=this.appearance!=='sona',palette=original?'original':[...colors,...hairColors].flat().join(','),key=row+':'+frame;
  let entry=this.tints.get(key);
  if(!entry){
   // Reuse the oldest surface instead of allocating and discarding canvases
   // whenever the smoothly changing hair palette moves by one colour step.
   if(this.tints.size>=16){const oldest=this.tints.keys().next().value;entry=this.tints.get(oldest);this.tints.delete(oldest);entry.palette=null;}
   else{const canvas=document.createElement('canvas');canvas.width=canvas.height=this.size;const ctx=canvas.getContext('2d');entry={canvas,ctx,data:ctx.createImageData(this.size,this.size),palette:null};}
  }
  if(entry.palette!==palette){if(original)entry.data.data.set(this.frame(row,frame).data);else tintCompanionPixels(this.frame(row,frame).data,this.size,this.size,colors,entry.data.data,hairColors);entry.ctx.putImageData(entry.data,0,0);entry.palette=palette;}
  this.tints.delete(key);this.tints.set(key,entry);return entry.canvas;
 }
 draw(frame,colors,hairColors=colors){
  if(!this.ready||!this.context)return false;const p=frame.pose||REST_POSE,c=this.context;
  const pivot=p.pivotY??143;
  const painted=this.painted(frame.row,frame.frame,colors,hairColors);
  c.clearRect(0,0,160,160);c.save();c.translate(80+p.x,pivot+p.y);c.rotate(p.rotation);c.scale(p.scaleX,p.scaleY);c.drawImage(painted,-80,-pivot);c.restore();
  if(p.sleep){c.save();c.fillStyle='rgba(232,224,255,.65)';c.font='12px system-ui';c.fillText('z',122,26);c.font='9px system-ui';c.fillText('z',132,15);c.restore();}
  if(p.spark>.05){c.save();c.globalAlpha=p.spark*.8;c.fillStyle=`rgb(${colors[1].map(Math.round).join(' ')})`;c.font='14px system-ui';c.fillText('♪',133,50-p.spark*7);c.restore();}
  return true;
 }
}
