// Register complete generated drawings. This step crops/resizes whole poses;
// it never paints, warps, mirrors, or interpolates character anatomy.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spriteFootAnchor} from '../public/companion-atlas.js';
const sharp=createRequire(import.meta.url)(process.env.RESONANCE_SHARP_PATH||'sharp');
const root=path.resolve('.private/mascot-motion-v2'),id=process.argv[2];
if(!/^[a-z0-9-]+$/.test(id||''))throw Error('Pass one mascot identifier');
const keys=['listening-steps','sway-wave','groove-cheer','bounce-turn','interactions'];
function cuts(length,parts,measure){const result=[0],cell=length/parts;for(let i=1;i<parts;i++){const nominal=i*cell;let best=Infinity,cut=Math.round(nominal);for(let p=Math.round(nominal-cell*.38);p<=nominal+cell*.38;p++){let score=Math.abs(p-nominal)*.0001;for(let d=-3;d<=3;d++)score+=measure(p+d);if(score<best){best=score;cut=p;}}result.push(cut);}result.push(length);return result;}
const sheets=[];
for(const key of keys){
 const file=path.join(root,'sources',id+'-'+key+'.png');
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 if(Math.abs(info.width/info.height-2/3)>.03)throw Error('Expected four-by-six sheet: '+file);
 const ys=cuts(info.height,6,y=>{let n=0;for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>64)n++;return n;});
 const xs=Array.from({length:6},(_,r)=>cuts(info.width,4,x=>{let n=0;for(let y=ys[r];y<ys[r+1];y++)if(data[(y*info.width+x)*4+3]>64)n++;return n;}));
 const columnYs=Array.from({length:4},(_,c)=>cuts(info.height,6,y=>{let n=0;for(let x=Math.floor(c*info.width/4);x<(c+1)*info.width/4;x++)if(data[(y*info.width+x)*4+3]>64)n++;return n;}));
 const cells=[];
 for(let i=0;i<24;i++){
  const row=Math.floor(i/4),col=i%4,cy=columnYs[col],w=xs[row][col+1]-xs[row][col],h=cy[row+1]-cy[row];
  const pixels=Buffer.alloc(w*h*4);for(let y=0;y<h;y++){const start=((cy[row]+y)*info.width+xs[row][col])*4;data.copy(pixels,y*w*4,start,start+w*4);}
  let x0=w,y0=h,x1=0,y1=0,count=0,border=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>96){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);count++;if(x<2||y<2||x>=w-2||y>=h-2)border++;}
  if(count<w*h*.035||count>w*h*.85||border>Math.max(20,count*.006))throw Error('Empty, opaque or clipped pose: '+id+' '+key+' '+i+' '+JSON.stringify({w,h,x0,y0,x1,y1,count,border}));
  cells.push({pixels,w,h,x0,y0,x1,y1,anchor:spriteFootAnchor(pixels,w,h)});
 }
 // The neutral reference sets the scale of a whole sheet. Crouches stay low.
 sheets.push({key,cells,scale:130/(cells[0].y1-cells[0].y0+1)});
}
// Keep the existing row names used by Sona's controller: bob, step, bounce,
// groove, wave, sway, cheer, pivot. Last two rows contain 24 interaction poses.
const danceOrder=[0,1,6,4,3,2,5,7],sources=[];
for(const sourceRow of danceOrder)for(let f=0;f<12;f++)sources.push({sheet:Math.floor(sourceRow/2),cell:(sourceRow%2)*12+f});
for(let f=0;f<24;f++)sources.push({sheet:4,cell:f});
const all=sheets.flatMap(s=>s.cells.map(c=>({c,scale:s.scale}))),fit=Math.min(1,...all.map(({c,scale})=>Math.min(144/((c.x1-c.x0+5)*scale),139/((c.y1-c.y0+5)*scale))));
const layers=[],registration=[];
for(const [i,source] of sources.entries()){
 const sheet=sheets[source.sheet],c=sheet.cells[source.cell],scale=sheet.scale*fit;
 const left=Math.max(0,c.x0-2),top=Math.max(0,c.y0-2),right=Math.min(c.w,c.x1+3),bottom=Math.min(c.h,c.y1+3);
 const width=Math.round((right-left)*scale),height=Math.round((bottom-top)*scale);
 const x=Math.max(2,Math.min(158-width,Math.round(80-(c.anchor.x-left)*scale))),y=Math.max(2,Math.min(158-height,Math.round(143-(c.anchor.y-top)*scale)));
 const input=await sharp(c.pixels,{raw:{width:c.w,height:c.h,channels:4}}).extract({left,top,width:right-left,height:bottom-top}).resize(width,height).png().toBuffer();
 layers.push({input,left:(i%12)*160+x,top:Math.floor(i/12)*160+y});registration.push({cell:i,source:sheet.key,sourceCell:source.cell,x,y,width,height});
}
await fs.mkdir(path.join(root,'atlases'),{recursive:true});
const output=path.join(root,'atlases',id+'.webp');
await sharp({create:{width:1920,height:1600,channels:4,background:'#00000000'}}).composite(layers).webp({quality:92,alphaQuality:100,effort:6}).toFile(output);
await fs.writeFile(path.join(root,'atlases',id+'.json'),JSON.stringify(registration,null,2));
console.log(JSON.stringify({id,poses:120,bytes:(await fs.stat(output)).size,output}));
