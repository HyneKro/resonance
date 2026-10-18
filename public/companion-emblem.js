import {EMBLEM} from './brand.js';
// Measured against the unchanged 160px sprite cells. A null anchor means
// the decorated earcup faces away or is hidden in that pose.
export const SONA_BADGES=[[[117,67,9,9],[116,71,9,9],[118,74,9,9],[117.5,77,8,9],[117,75.5,9,10],[117,70,9,9],[118,67.5,9,10],[118,65.5,9,10]],[[119,68,9,9],[117,65,9,9],[125,71.5,9,8],[122,67.5,9,10],[118.5,68.5,10,10],[117,73,9,9],[113,70,9,9],[119,69,9,9]],[[117,67,9,9],[115.5,72,8,9],[114,77,9,9],[116.5,67,8,7],[116.5,73,8,9],[113.5,75.5,8,8],[116,77,9,9],[117,73,9,9]],[[119,68.5,9,10],[114,64,9,9],[116.5,78,10,9],[117,68,9,9],[120,69,9,9],[120,75,9,9],[124,79,9,9],[120,69,9,9]],[[121,65,9,9],[117,65,9,9],[118.5,65,8,9],[118.5,65,8,9],[117,66,9,9],[117.5,66,8,9],[118,66,9,9],[120,66,9,9]],[[117,68,9,9],[114,68,9,9],[122,85,9,9],[116,72,9,9],[119,71,9,9],[114.5,66,8,9],[111.5,62,8,9],[118,70,9,9]],[[117,67,9,9],[115,67,9,9],[116,67.5,9,10],[116,67.5,9,10],[117,70.5,9,10],[116.5,72,8,9],[116.5,72,8,9],[115.5,71,8,9]],[[116,65.5,9,8],[104,67.5,9,8],[77,66,9,9],[46,68.5,5,8],null,null,null,[116,65.5,5,8]],[[119,70,9,9],[116.5,71,8,9],[116.5,71.5,8,8],[117.5,74.5,8,8],[117.5,75,8,9],[117.5,75,8,9],[117.5,75,8,9],[117.5,75,8,9]],[[120,69,9,9],[117,70.5,9,10],[118.5,66,10,9],[116,69.5,9,10],[118,68,9,9],[119,71,9,9],[120,70.5,9,10],[121,71.5,9,10]],[[117,67.5,9,8],[119.5,68,8,9],[114,67,9,9],[117.5,70,8,9],[114,77,9,9],[117,68.5,9,8],[114,81,9,9],[117.5,69,8,9]],[[116.5,68.5,8,8],[115.5,70.5,8,8],[115.5,76,8,9],[116.5,82,8,9],[116.5,72.5,8,8],[117.5,71,8,9],[118.5,71,8,9],[117.5,70,8,9]],[[119.5,70,10,9],[120,70.5,9,10],[121,71.5,9,10],[121,71.5,9,10],[121,70.5,9,10],[120,70.5,9,10],[120,70.5,9,10],[120.5,70.5,10,10]]];
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
