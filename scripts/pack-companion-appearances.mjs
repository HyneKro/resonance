// Asset preparation only: preserve each complete painted pose and its alpha.
// Rebuild from the local generated source manifest; never synthesize body parts.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spriteFootAnchor} from '../public/companion-atlas.js';
const sharp=createRequire(import.meta.url)(process.env.RESONANCE_SHARP_PATH||'sharp');
const root=path.resolve('.private/companion-appearances');
const manifest=JSON.parse(await fs.readFile(path.join(root,'generation-final.json'),'utf8'));
await fs.mkdir(path.join(root,'sources'),{recursive:true});
await fs.mkdir('public/companions',{recursive:true});
const report=[];
// Generated grids can vary by a few pixels. Find transparent gutters instead
// of cutting at a nominal tile boundary through the next pose's head/feet.
function cuts(length,parts,measure){const result=[0],cell=length/parts;for(let i=1;i<parts;i++){const nominal=i*cell;let best=Infinity,cut=Math.round(nominal);for(let p=Math.round(nominal-cell*.18);p<=nominal+cell*.18;p++){const score=measure(p)+Math.abs(p-nominal)*.0001;if(score<best){best=score;cut=p;}}result.push(cut);}result.push(length);return result;}
for(const character of manifest.characters){
 if(!character.source)continue;
 const local=path.join(root,'sources',character.id+'.png');
 await fs.copyFile(character.source,local);
 const {data,info}=await sharp(local).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(info.width%4||info.height%6||info.width/4!==info.height/6)throw Error('Expected a 4 × 6 square-cell sheet: '+character.id);
 const side=info.width/4,cells=[];
 const ys=cuts(info.height,6,y=>{let n=0;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>32)n++;return n;});
 const xs=Array.from({length:6},(_,row)=>cuts(info.width,4,x=>{let n=0;for(let y=ys[row];y<ys[row+1];y++)if(data[(y*info.width+x)*4+3]>32)n++;return n;}));
 for(let i=0;i<24;i++){
  const row=Math.floor(i/4),col=i%4,w=xs[row][col+1]-xs[row][col],h=ys[row+1]-ys[row];
  const pixels=Buffer.alloc(w*h*4);for(let y=0;y<h;y++){const start=((ys[row]+y)*info.width+xs[row][col])*4;data.copy(pixels,y*w*4,start,start+w*4);}
  let x0=w,y0=h,x1=0,y1=0,count=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>32){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;}
  if(count<side*side*.035||count>side*side*.9)throw Error('Missing pose or opaque background: '+character.id+':'+i);
  const anchor=spriteFootAnchor(pixels,w,h);cells.push({pixels,w,h,x0,y0,x1,y1,anchor});
 }
 // One scale for the whole character preserves crouching/sleeping proportions.
 const scale=Math.min(...cells.map(c=>Math.min(132/(c.y1-c.y0+1),146/(c.x1-c.x0+1))));
 const layers=[],registrations=[];
 const order=Array.from({length:24},(_,i)=>character.id==='asuka'&&i>=8&&i<16?[10,8,9,10,14,12,13,14][i-8]:i);
 for(const [i,sourceCell]of order.entries()){
  const c=cells[sourceCell];
  const bounds={left:Math.max(0,c.x0-2),top:Math.max(0,c.y0-2),width:Math.min(c.w-1,c.x1+2)-Math.max(0,c.x0-2)+1,height:Math.min(c.h-1,c.y1+2)-Math.max(0,c.y0-2)+1};
  const w=Math.max(1,Math.round(bounds.width*scale)),h=Math.max(1,Math.round(bounds.height*scale));
  const x=Math.max(1,Math.min(159-w,Math.round(80-(c.anchor.x-bounds.left)*scale))),y=Math.max(1,Math.min(159-h,Math.round(143-(c.anchor.y-bounds.top)*scale)));
  const input=await sharp(c.pixels,{raw:{width:c.w,height:c.h,channels:4}}).extract(bounds).resize(w,h).png().toBuffer();
  layers.push({input,left:(i%4)*160+x,top:Math.floor(i/4)*160+y});registrations.push({cell:i,x,y,w,h});
 }
 const output='public/companions/'+character.id+'.webp';
 await sharp({create:{width:640,height:960,channels:4,background:'#00000000'}}).composite(layers).webp({quality:88,alphaQuality:100,effort:6}).toFile(output);
 report.push({id:character.id,bytes:(await fs.stat(output)).size,registrations});
 console.log(character.id+': 24 poses packed');
}
await fs.writeFile(path.join(root,'registration.json'),JSON.stringify(report,null,2));
