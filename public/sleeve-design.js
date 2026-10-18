// Static print-like line art. This is a visual signature of the track identity,
// not a fabricated waveform. Generate only when the selected record changes.
export function sleeveDesign(track={}){
 let seed=2166136261;for(const char of String(track.id||track.title||'resonance'))seed=Math.imul(seed^char.charCodeAt(0),16777619)>>>0;
 const genre=String(track.genre||'').toLowerCase();
 const kind=/ambient|classical|piano|acoustic|jazz/.test(genre)?'contour':/electro|techno|house|dance|bass|trance/.test(genre)?'pulse':['orbit','contour','pulse'][seed%3];
 const phase=seed/4294967296*Math.PI*2,paths=[];
 for(let line=0;line<36;line++){
  const points=[];
  for(let i=0;i<=96;i++){
   const t=i/96,a=t*Math.PI*2,r=120+line*5;let x,y;
   if(kind==='contour'){x=t*1000;y=250+line*7+Math.sin(t*6+phase)*90+Math.sin(t*12+phase)*22;}
   else if(kind==='pulse'){x=t*1000;y=260+line*6+Math.sin(t*8+phase)*Math.exp(-(((t-.5)*4)**2))*(60+line*2);}
   else{x=500+Math.cos(a)*r;y=360+Math.sin(a)*r*.8+Math.cos(a*3+phase)*(10+line*.5);}
   points.push((i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1));
  }paths.push(points.join(' '));
 }
 return {kind,number:String(seed%100000).padStart(5,'0'),paths};
}
