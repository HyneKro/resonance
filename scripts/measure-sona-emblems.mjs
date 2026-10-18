// Read-only measurement of the mint earcup marks in a newly packed atlas.
// The renderer stamps the code-native Resonance emblem at these anchors.
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),sharp=require(process.env.RESONANCE_SHARP_PATH||'sharp');
const {data,info}=await sharp('public/sona-motions.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true}),badges=[];
for(let row=0;row<13;row++){
 const frames=[];
 for(let frame=0;frame<8;frame++){
  const seen=new Set(),parts=[],left=row===7?22:98,bottom=row===7?86:100;
  const mint=(x,y)=>{const i=((row*160+y)*info.width+frame*160+x)*4;return data[i+3]>180&&data[i+1]>100&&data[i+1]-data[i]>24&&data[i+1]-data[i+2]>9;};
  for(let y=26;y<bottom;y++)for(let x=left;x<140;x++){
   const start=y*160+x;if(seen.has(start)||!mint(x,y))continue;
   const queue=[[x,y]];seen.add(start);let count=0,x0=x,x1=x,y0=y,y1=y;
   for(let i=0;i<queue.length;i++){
    const [a,b]=queue[i];count++;x0=Math.min(x0,a);x1=Math.max(x1,a);y0=Math.min(y0,b);y1=Math.max(y1,b);
    for(const [u,v]of [[a-1,b],[a+1,b],[a,b-1],[a,b+1]])if(u>=left&&u<140&&v>=26&&v<bottom&&!seen.has(v*160+u)&&mint(u,v)){seen.add(v*160+u);queue.push([u,v]);}
   }
   if(count>=8&&x1-x0>=3&&y1-y0>=3&&y1<bottom)parts.push({count,x0,x1,y0,y1});
  }
  const p=parts.sort((a,b)=>b.count-a.count)[0];frames.push(p?[(p.x0+p.x1)/2,(p.y0+p.y1)/2,p.x1-p.x0+1,p.y1-p.y0+1]:null);
 }badges.push(frames);
}
// Only the back and opposite profile may lack the decorated cup.
for(let row=0;row<13;row++)for(let f=0;f<8;f++)if(!badges[row][f]&&!(row===7&&[4,5,6].includes(f)))throw Error('Missing visible earcup mark '+row+':'+f);
const source=await fs.readFile('public/companion-emblem.js','utf8');
await fs.writeFile('public/companion-emblem.js',source.replace(/export const SONA_BADGES=.*?;/,'export const SONA_BADGES='+JSON.stringify(badges)+';'));
console.log(JSON.stringify(badges));
