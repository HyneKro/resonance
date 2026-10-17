import {EMBLEM} from './brand.js';
// Measured against the unchanged 160px sprite cells. A null anchor means
// the decorated earcup faces away or is hidden in that pose.
export const SONA_BADGES=[[[117.5,62.5,9,9],[116.5,66,9,10],[117.5,68,9,10],[117.5,70.5,9,9],[117.5,71,9,10],[117.5,64,9,10],[117.5,64.5,9,9],[117.5,64,9,10]],[[121,64,10,10],[124,63.5,10,9],[126.5,63.5,9,9],[122.5,63.5,9,9],[121,65.5,10,9],[114.5,65.5,9,9],[114,65.5,10,9],[120.5,65.5,9,9]],[[118.5,66,9,10],[116.5,70,9,10],[117.5,79,9,10],[117.5,66,9,10],[120,72.5,8,9],[117.5,69,9,10],[118.5,76.5,9,9],[119.5,69.5,9,9]],[[117.5,63,9,10],[115,60.5,8,9],null,[117.5,63.5,9,9],[117,66,10,10],[119.5,70.5,9,9],null,[116.5,66,9,10]],[[117.5,61.5,9,9],[117.5,65.5,9,9],[117.5,66.5,9,9],[116.5,62,9,10],[117.5,61.5,9,9],[117.5,56.5,9,9],[119,67.5,8,9],[116.5,61.5,9,9]],[[121.5,64,9,8],[120.5,64.5,9,9],[121.5,64.5,9,9],[120.5,64.5,9,9],[121.5,64.5,9,9],[121.5,65,9,10],[119.5,65,9,10],[121.5,64.5,9,9]],[[116.5,64.5,9,9],[116.5,64,9,10],[116.5,64,9,10],[116.5,64.5,9,9],[116.5,68,9,10],[117.5,65.5,9,9],[118,65,12,10],[117.5,66,9,10]],[[116.5,62.5,7,9],[50,63.5,8,9],[69,63,10,10],null,null,[58.5,65.5,9,9],[90.5,63,11,10],[108.5,63,9,10]],[[121,65.5,10,9],[119.5,65,9,10],[120,65.5,10,9],[120.5,65.5,9,9],[121,67,10,10],[120.5,67.5,9,9],[121,67.5,10,9],[121,67,10,10]],[[120.5,64.5,9,9],[120.5,65.5,9,9],[120.5,68,9,10],[118,68.5,8,9],[120,64,10,10],[120.5,65.5,9,9],[121.5,66,9,10],[120,66,10,10]],[[120,63,10,10],[120.5,61.5,9,9],[119,60.5,10,9],[119.5,59.5,9,9],[113.5,63,9,10],[120.5,61.5,9,9],[120.5,59,9,10],[120.5,61,9,10]],[[118,63.5,8,9],[119.5,64.5,9,9],[118.5,73,9,10],[117,77,8,10],[118.5,78.5,9,9],[119,70,8,10],[119.5,67,9,10],[119,67.5,8,9]],[[120.5,64,9,10],[119.5,64,9,10],[120,64,10,10],[120.5,65,9,10],[120,65,10,10],[119.5,66,9,10],[119.5,66,9,10],[120.5,66,9,10]]];
let clef;
export function drawCompanionEmblem(ctx,pixels,row,frame){
 const badge=SONA_BADGES[row]?.[frame];if(!badge)return false;
 const [x,y,w,h]=badge,rx=w/2+1.7,ry=h/2+1.7;
 // Sample the dark cup around the old emblem to keep the new faceplate
 // consistent with each drawing's lighting, then stamp the app's exact clef.
 const colors=[];for(const [dx,dy]of [[-7,0],[7,0],[0,-7],[0,7]]){const px=Math.round(x+dx),py=Math.round(y+dy),i=(py*160+px)*4;const [r,g,b,a]=pixels.data.subarray(i,i+4);if(a>200&&Math.max(r,g,b)<140&&g-r<20)colors.push([r,g,b]);}
 const base=colors.length?[0,1,2].map(k=>Math.round(colors.reduce((n,c)=>n+c[k],0)/colors.length)):[43,35,60];
 clef??=new Path2D([...EMBLEM.matchAll(/d="([^"]+)"/g)].map(m=>m[1]).join(' '));
 ctx.save();ctx.globalCompositeOperation='source-atop';
 const plate=ctx.createRadialGradient(x-2,y-3,1,x,y,Math.max(rx,ry)+1);plate.addColorStop(0,'rgb('+base.map(v=>Math.min(255,v+5)).join(',')+')');plate.addColorStop(1,'rgb('+base.map(v=>Math.max(0,v-5)).join(',')+')');
 ctx.fillStyle=plate;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
 ctx.translate(x,y);ctx.scale(.29,.29);ctx.translate(-23.5,-24.5);
 const ink=ctx.createLinearGradient(12,0,36,49);ink.addColorStop(0,'#b6f4dc');ink.addColorStop(1,'#69c9b7');ctx.fillStyle=ink;ctx.fill(clef);ctx.restore();return true;
}
