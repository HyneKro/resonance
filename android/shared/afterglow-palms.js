// Four original palm silhouettes, painted once into a shared billboard atlas.
// Curved ribs and tapered leaflets keep the reference's feathered canopy while
// avoiding dozens of distance-field evaluations for every covered screen pixel.
export function createAfterglowPalms(size=256){
 const canvas=document.createElement('canvas');canvas.width=size*4;canvas.height=size*2;
 const ctx=canvas.getContext('2d');ctx.scale(size/256,size/256);ctx.fillStyle='#fff';ctx.strokeStyle='#fff';ctx.lineCap='round';
 const point=(a,b,c,t)=>[(1-t)**2*a[0]+2*(1-t)*t*b[0]+t*t*c[0],(1-t)**2*a[1]+2*(1-t)*t*b[1]+t*t*c[1]];
 for(let variant=0;variant<4;variant++){
  ctx.save();ctx.translate(variant*256,0);ctx.beginPath();ctx.rect(0,0,256,512);ctx.clip();const lean=[13,-12,6,-18][variant],crown=[128+lean,135+variant%2*13];
  ctx.beginPath();ctx.moveTo(121,512);ctx.bezierCurveTo(124,370,crown[0]-18,230,crown[0]-3.5,crown[1]);
  ctx.lineTo(crown[0]+3.5,crown[1]);ctx.bezierCurveTo(crown[0]-8,260,132,385,134,512);ctx.closePath();ctx.fill();
  for(let f=0;f<9;f++){
   const side=f%2?1:-1,row=Math.floor(f/2),reach=[103,108,88,48,10][row];
   const end=[crown[0]+side*reach,crown[1]+[90,25,-42,-94,-110][row]+(variant-1)*4];
   const bend=[crown[0]+side*reach*.70,crown[1]-40-row*19];
   ctx.lineWidth=3.2;ctx.beginPath();ctx.moveTo(...crown);ctx.quadraticCurveTo(...bend,...end);ctx.stroke();
   for(let j=2;j<17;j++){
    const t=j/18,p=point(crown,bend,end,t),q=point(crown,bend,end,Math.min(1,t+.035));
    const dx=q[0]-p[0],dy=q[1]-p[1],length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length;
    const leaf=(5+16*Math.sin(t*Math.PI))*(1-t*.40),width=1.1+Math.sin(t*Math.PI)*1.2;
    for(const sign of [-1,1]){
     const tip=[p[0]+nx*sign*leaf+side*leaf*.22,p[1]+ny*sign*leaf+leaf*.46];
     ctx.beginPath();ctx.moveTo(p[0]-dx/length*width,p[1]-dy/length*width);
     ctx.quadraticCurveTo(p[0]+nx*sign*leaf*.6,p[1]+ny*sign*leaf*.6,tip[0],tip[1]);
     ctx.quadraticCurveTo(p[0]+nx*sign*leaf*.45+dx,p[1]+ny*sign*leaf*.45+dy,p[0]+dx/length*width,p[1]+dy/length*width);ctx.closePath();ctx.fill();
    }
   }
  }
  ctx.beginPath();ctx.ellipse(crown[0],crown[1]+5,8,11,.15,0,Math.PI*2);ctx.fill();ctx.restore();
 }
 return canvas;
}
