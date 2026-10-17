// Register whole illustrated poses and pack a runtime texture. No limbs, faces,
// expressions or source pixels are painted by this asset build step.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {SONA_SOURCE_NAMES,spriteFootAnchor} from '../public/companion-atlas.js';
const require=createRequire(import.meta.url);
const sharp=require(process.env.RESONANCE_SHARP_PATH||'sharp');
const sourceRoot=process.argv[2]||'test-output/sona-headset-sync/sources';
const overlays=[],registrations=[];
function silhouettes(data,width,height){
 const seen=new Uint8Array(width*height),queue=new Int32Array(width*height),parts=[];
 for(let start=0;start<seen.length;start++){
  if(seen[start]||data[start*4+3]<128)continue;seen[start]=1;let head=0,tail=1,x0=width,y0=height,x1=0,y1=0;queue[0]=start;
  while(head<tail){const i=queue[head++],x=i%width,y=Math.floor(i/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const n of [x?i-1:-1,x<width-1?i+1:-1,y?i-width:-1,y<height-1?i+width:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=128){seen[n]=1;queue[tail++]=n;}
  }
  if(tail>20)parts.push({x0,y0,x1,y1,area:tail});
 }
 const main=parts.filter(p=>p.area>width*height/8*.1);
 if(main.length!==8)throw Error('Expected eight separate complete figures, found '+main.length);
 for(const p of parts.filter(p=>!main.includes(p))){
  const candidates=main.map(m=>({m,d:Math.hypot(Math.max(m.x0-p.x1,p.x0-m.x1,0),Math.max(m.y0-p.y1,p.y0-m.y1,0))})).sort((a,b)=>a.d-b.d);
  if(candidates[0].d<8){const m=candidates[0].m;m.x0=Math.min(m.x0,p.x0);m.y0=Math.min(m.y0,p.y0);m.x1=Math.max(m.x1,p.x1);m.y1=Math.max(m.y1,p.y1);}
 }
 const sorted=main.sort((a,b)=>(a.y0+a.y1)-(b.y0+b.y1));
 return [...sorted.slice(0,4).sort((a,b)=>a.x0-b.x0),...sorted.slice(4).sort((a,b)=>a.x0-b.x0)];
}
for(const [row,name]of SONA_SOURCE_NAMES.entries()){
 const file=path.join(sourceRoot,name+'.png'),{data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const cells=[],parts=silhouettes(data,info.width,info.height);
 for(let f=0;f<8;f++){
  let {x0,y0,x1,y1}=parts[f];
  if(x0<2||y0<2||x1>info.width-3||y1>info.height-3)throw Error('Source figure touches image edge '+name+':'+f);
  x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(info.width,x1+4);y1=Math.min(info.height,y1+4);
  const w=x1-x0,h=y1-y0,pixels=Buffer.alloc(w*h*4);
  for(let y=0;y<h;y++)data.copy(pixels,y*w*4,((y+y0)*info.width+x0)*4,((y+y0)*info.width+x1)*4);
  const anchor=spriteFootAnchor(pixels,w,h);cells.push({x:x0,y:y0,w,h,pixels,anchor});
 }
 // Frame zero is a standing or relaxed neutral pose. Keep one scale for the
 // entire clip so a crouch remains a crouch and the head never pumps in size.
 const scale=Math.min(130/(cells[0].h-6),...cells.map(c=>138/c.h),...cells.map(c=>146/c.w));
 const frames=[];
 for(const [f,c]of cells.entries()){
  const w=Math.round(c.w*scale),h=Math.round(c.h*scale),left=Math.round(80-c.anchor.x*scale),top=Math.round(143-c.anchor.y*scale);
  if(left<2||top<2||left+w>158||top+h>157)throw Error('Runtime pose clipped '+name+':'+f);
  const input=await sharp(c.pixels,{raw:{width:c.w,height:c.h,channels:4}}).resize(w,h,{kernel:'lanczos3'}).png().toBuffer();
  overlays.push({input,left:f*160+left,top:row*160+top});
  frames.push({source:[c.x,c.y,c.w,c.h],foot:[c.anchor.x,c.anchor.y],destination:[left,top,w,h]});
 }
 registrations.push({name,scale,frames});
 console.log(name+': 8 complete, registered poses');
}
await sharp({create:{width:1280,height:SONA_SOURCE_NAMES.length*160,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(overlays).webp({lossless:true,effort:6}).toFile('public/sona-motions.webp');
await fs.writeFile(path.join(path.dirname(sourceRoot),'registration.json'),JSON.stringify(registrations,null,2));
console.log('Packed '+overlays.length+' sprites into one lossless texture: '+(await fs.stat('public/sona-motions.webp')).size+' bytes');
