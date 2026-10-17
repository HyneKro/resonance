const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));

export function companionPosition(value){
 return value&&Number.isFinite(value.x)&&Number.isFinite(value.y)?{x:Math.round(clamp(value.x)*10000)/10000,y:Math.round(clamp(value.y)*10000)/10000}:null;
}
export function companionBounds(width,height,size,top=76,bottom=116){
 const left=Math.min(12,Math.max(0,(width-size)/2)),right=Math.max(left,width-size-12);
 const minY=Math.min(top,Math.max(0,height-size)),maxY=Math.max(minY,height-size-bottom);
 return {left,right,top:minY,bottom:maxY};
}
export function companionPoint(position,bounds){const p=position||{x:.99,y:.98};return {x:bounds.left+p.x*(bounds.right-bounds.left),y:bounds.top+p.y*(bounds.bottom-bounds.top)};}
export function companionPlacement(point,bounds){return companionPosition({x:(point.x-bounds.left)/Math.max(1,bounds.right-bounds.left),y:(point.y-bounds.top)/Math.max(1,bounds.bottom-bounds.top)});}


// Hair uses the scene pigments before the interface lifts them into pastels.
// Fixed palette slots avoid hue jumps when two accent colors trade prominence.
export function companionHairColors(palette){
 const valid=Array.isArray(palette)&&[3,6].includes(palette.length)&&palette.every(c=>Array.isArray(c)&&c.length===3&&c.every(v=>Number.isFinite(v)&&v>=0&&v<=1));
 return valid?palette.slice(0,2).map(c=>c.map(v=>v*255)):[[175,120,242],[100,211,220]];
}

// Recolor violet / mint materials while preserving skin, alpha and ink. Hair
// gets a stronger pigment gradient with the original light/dark strand detail;
// HSL chroma avoids the clipped, nearly-white highlights of a luminance scale.
export function tintCompanionPixels(source,width,height,colors,out=new Uint8ClampedArray(source.length),hairColors=colors){
 const [a,b]=colors;
 const hairRamp=Array.from({length:33},(_,i)=>{
  const c=hairColors[0].map((v,j)=>(v+(hairColors[1][j]-v)*i/32)/255),lo=Math.min(...c),hi=Math.max(...c),delta=hi-lo;
  const saturation=delta/Math.max(.001,1-Math.abs(hi+lo-1));
  return {unit:c.map(v=>delta>.001?(v-lo)/delta:0),s:clamp(saturation*1.24,.55,.95)*clamp(delta/.12)};
 });
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,r=source[i],g=source[i+1],blue=source[i+2];out[i+3]=source[i+3];
  const violet=clamp((blue-g-5)/28)*clamp((blue-r+40)/36),mint=clamp((g-r-8)/30)*clamp((blue-r-4)/30),mask=Math.max(violet,mint)*.96;
  const skin=r>blue+6&&r>g&&g>r*.5;
  if(!mask||!source[i+3]||skin){out[i]=r;out[i+1]=g;out[i+2]=blue;continue;}
  const t=clamp(y/Math.max(1,height-1)*.72+x/Math.max(1,width-1)*.28);
  const light=r*.2126+g*.7152+blue*.0722,level=(a[0]+(b[0]-a[0])*t)*.2126+(a[1]+(b[1]-a[1])*t)*.7152+(a[2]+(b[2]-a[2])*t)*.0722,scale=light/Math.max(1,level);
  const hair=violet*clamp((light-65)/60)*clamp((.76-y/Math.max(1,height-1))/.12);
  const ht=clamp((y/Math.max(1,height-1)-.13)*1.3+x/Math.max(1,width-1)*.35),pigment=hairRamp[Math.round(ht*32)],l=clamp(light/255*.86,.1,.86),chroma=(1-Math.abs(2*l-1))*pigment.s;
  for(let j=0;j<3;j++){
   const colored=clamp((a[j]+(b[j]-a[j])*t)*scale,0,255),base=source[i+j]+(colored-source[i+j])*mask;
   out[i+j]=base+((l-chroma/2+pigment.unit[j]*chroma)*255-base)*hair;
  }
 }
 return out;
}
