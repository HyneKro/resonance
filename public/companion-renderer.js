import {tintCompanionPixels} from './companion-model.js';
import {REST_POSE} from './companion-motion.js';
import {SONA_SHEETS} from './companion-atlas.js';
import {drawCompanionEmblem} from './companion-emblem.js';
let sharedImages;

// The painted sprite sheets stay untouched. Recoloring preserves their
// line work, alpha, warm skin and shading. Exactly one pose is drawn per frame.
export class CompanionRenderer{
 constructor(canvas,onReady=()=>{},onError=()=>{}){
  this.canvas=canvas;this.context=canvas.getContext('2d');this.onReady=onReady;this.onError=onError;this.ready=false;this.frames=new Map();this.tints=new Map();this.size=160;canvas.width=canvas.height=this.size;
 }
 load(){
  if(this.loading)return this.loading;
  sharedImages??=Promise.all(SONA_SHEETS.map(sheet=>new Promise((resolve,reject)=>{
   const image=new Image();image.onload=()=>Math.abs(image.naturalWidth/sheet.columns-image.naturalHeight/sheet.rows)>1?reject(Error('Invalid sprite grid')):resolve(image);image.onerror=reject;image.src=sheet.src;
  }))).catch(error=>{sharedImages=null;throw error;});
  this.loading=sharedImages.then(images=>{this.images=images;this.ready=true;this.onReady();return true;}).catch(()=>{this.loading=null;this.onError('Sona’s artwork could not load. Try reopening the app.');return false;});return this.loading;
 }
 frame(row,frame){
  const key=row+':'+frame;if(this.frames.has(key))return this.frames.get(key);
  if(!this.readback){const buffer=document.createElement('canvas');buffer.width=buffer.height=this.size;this.readback=buffer.getContext('2d',{willReadFrequently:true});}
  const ctx=this.readback;ctx.clearRect(0,0,this.size,this.size);
  // Whole poses are measured and registered once when the texture is built.
  ctx.drawImage(this.images[0],frame*160,row*160,160,160,0,0,160,160);
  let data=ctx.getImageData(0,0,this.size,this.size);
  if(drawCompanionEmblem(ctx,data,row,frame))data=ctx.getImageData(0,0,this.size,this.size);
  if(this.frames.size>=32)this.frames.delete(this.frames.keys().next().value);this.frames.set(key,data);return data;
 }
 painted(row,frame,colors,hairColors=colors){
  const palette=[...colors,...hairColors].flat().map(Math.round).join(','),key=row+':'+frame;
  let entry=this.tints.get(key);
  if(!entry){
   // Reuse the oldest surface instead of allocating and discarding canvases
   // whenever the smoothly changing hair palette moves by one colour step.
   if(this.tints.size>=16){const oldest=this.tints.keys().next().value;entry=this.tints.get(oldest);this.tints.delete(oldest);entry.palette=null;}
   else{const canvas=document.createElement('canvas');canvas.width=canvas.height=this.size;const ctx=canvas.getContext('2d');entry={canvas,ctx,data:ctx.createImageData(this.size,this.size),palette:null};}
  }
  if(entry.palette!==palette){tintCompanionPixels(this.frame(row,frame).data,this.size,this.size,colors,entry.data.data,hairColors);entry.ctx.putImageData(entry.data,0,0);entry.palette=palette;}
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
