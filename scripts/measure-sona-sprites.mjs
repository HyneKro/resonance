// Read-only artwork analysis: locate complete painted figures and their feet.
// The generated PNGs are never resampled or modified by this tool.
import fs from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {spriteFootAnchor} from '../public/companion-atlas.js';
function readPNG(b){
 const width=b.readUInt32BE(16),height=b.readUInt32BE(20);if(b[24]!==8||b[25]!==6||b[28]!==0)throw Error('Expected non-interlaced RGBA PNG');
 const chunks=[];for(let p=8;p<b.length;){const n=b.readUInt32BE(p);if(b.toString('ascii',p+4,p+8)==='IDAT')chunks.push(b.subarray(p+8,p+8+n));p+=12+n;}
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*4,out=new Uint8ClampedArray(width*height*4);
 for(let y=0;y<height;y++){const filter=raw[y*(stride+1)];for(let x=0;x<stride;x++){
  const i=y*stride+x,a=x>=4?out[i-4]:0,c=x>=4&&y?out[i-stride-4]:0,u=y?out[i-stride]:0,p=a+u-c,pa=Math.abs(p-a),pb=Math.abs(p-u),pc=Math.abs(p-c);
  const predict=[0,a,u,Math.floor((a+u)/2),pa<=pb&&pa<=pc?a:pb<=pc?u:c][filter];if(predict===undefined)throw Error('Invalid filter');out[i]=(raw[y*(stride+1)+1+x]+predict)&255;
 }}return {width,height,data:out};
}
function components({width:w,height:h,data}){
 const seen=new Uint8Array(w*h),queue=new Int32Array(w*h),found=[];
 for(let start=0;start<seen.length;start++){
  if(seen[start]||data[start*4+3]<128)continue;seen[start]=1;let head=0,tail=1,left=w,right=0,top=h,bottom=0,sx=0,sy=0;queue[0]=start;
  while(head<tail){const i=queue[head++],x=i%w,y=Math.floor(i/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);sx+=x;sy+=y;
   for(const n of [x?i-1:-1,x<w-1?i+1:-1,y?i-w:-1,y<h-1?i+w:-1])if(n>=0&&!seen[n]&&data[n*4+3]>=128){seen[n]=1;queue[tail++]=n;}
  }
  if(tail>20)found.push({left,right,top,bottom,cx:sx/tail,cy:sy/tail,area:tail});
 }return found;
}
const frames=[];
for(const file of ['sona-dance-a.png','sona-dance-b.png','sona-interactions.png']){
 const im=readPNG(await fs.readFile('public/'+file)),parts=components(im),cw=im.width/8,ch=im.height/4,large=parts.filter(p=>p.area>cw*ch*.1);
 if(large.length!==32)console.log(large.map(p=>({x:p.cx.toFixed(1),y:p.cy.toFixed(1),w:p.right-p.left,h:p.bottom-p.top,a:p.area})));
 if(large.length!==32)throw Error(file+' has '+large.length+' main silhouettes, expected 32');
 const cells=Array.from({length:32},()=>[]);
 for(const p of large){const i=Math.floor(p.cy/ch)*8+Math.floor(p.cx/cw);if(cells[i].length)throw Error('Overlapping silhouettes');cells[i].push(p);}
 // Small disconnected details belong to the nearest main character. Most are
 // subpixel highlights; the distance check avoids borrowing adjacent sprites.
 for(const p of parts.filter(p=>!large.includes(p))){let best=-1,distance=Infinity;for(let i=0;i<cells.length;i++){const c=cells[i][0];if(!c)continue;const dx=Math.max(c.left-p.right,p.left-c.right,0),dy=Math.max(c.top-p.bottom,p.top-c.bottom,0),d=Math.hypot(dx,dy);if(d<distance){distance=d;best=i;}}
  if(best>=0&&distance<4)cells[best].push(p);
 }
 const result=cells.map((parts,i)=>{
  if(!parts.length)throw Error('Empty cell '+i);
  const x=Math.max(0,Math.min(...parts.map(p=>p.left))-2),y=Math.max(0,Math.min(...parts.map(p=>p.top))-2),right=Math.min(im.width,Math.max(...parts.map(p=>p.right))+3),bottom=Math.min(im.height,Math.max(...parts.map(p=>p.bottom))+3),w=right-x,h=bottom-y;
  const data=new Uint8ClampedArray(w*h*4);for(let yy=0;yy<h;yy++)data.set(im.data.subarray(((y+yy)*im.width+x)*4,((y+yy)*im.width+right)*4),yy*w*4);
  const a=spriteFootAnchor(data,w,h);return [x,y,w,h,Math.round(a.x*100)/100,a.y];
 });
 frames.push(result);console.log(file+': 32 complete silhouettes; heights '+Math.min(...result.map(r=>r[3]))+'–'+Math.max(...result.map(r=>r[3]))+' px.');
}
await fs.writeFile('public/companion-registration.js','// Complete sprite source rectangles and foot anchors, measured from the PNG alpha.\n// [x, y, width, height, footX, footY]. Artwork is unchanged.\nexport const SONA_REGISTRATION='+JSON.stringify(frames)+';\n');
