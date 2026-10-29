const clamp=(n,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
export const LIGHTING_DEFAULTS=Object.freeze({brightness:.65,response:1,idle:.12,devices:[]});
// Initial estimates from the owner's ~70-point 5 m editor. Editable: neither
// discovery nor the LAN status protocol reports native zone resolution.
export const estimatedSegments=model=>({H61D3:42,H61D5:70,H61D6:140}[model]||10);
export function lightingOptions(value={}){
 return {brightness:clamp(value.brightness??.65,.05,1),response:clamp(value.response??1,0,1.5),idle:clamp(value.idle??.12,0,1),devices:Array.isArray(value.devices)?value.devices.slice(0,32).filter(d=>d&&typeof d.id==='string'&&/^(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}$/.test(d.id)).map(d=>({id:d.id,selected:d.selected===true,segments:Math.round(clamp(d.segments??10,1,255)),reverse:d.reverse===true})):[]};
}
const sample=(values,t)=>{const x=clamp(t)*(values.length-1),a=Math.floor(x);return values[a]+(values[Math.min(a+1,values.length-1)]-values[a])*(x-a);};
// One normalized spectrum for every strip. Hardware zones sample the same map.
export class LightingSignal {
 constructor(){this.colors=Array.from({length:6},()=>[.3,.12,.6]);this.levels=new Float32Array(48);this.loudness=0;}
 update({colors,features={},active=false}={},dt=.05,options={}){
  const p=lightingOptions(options),step=clamp(dt,0,.2),ease=seconds=>1-Math.exp(-step/seconds);
  for(let i=0;i<6;i++)for(let c=0;c<3;c++){const target=clamp(colors?.[i]?.[c]??this.colors[i][c]);this.colors[i][c]+=(target-this.colors[i][c])*ease(1.1);}
  const loud=active?clamp(features.loudness):0;this.loudness+=(loud-this.loudness)*ease(loud>this.loudness?.1:.75);
  const spectrum=features.spectrum||[];
  for(let i=0;i<48;i++){
   // Logarithmic 40 Hz–16 kHz bins, with light neighbour blending to keep
   // individual LEDs from flickering while preserving frequency peaks.
   const at=j=>clamp(spectrum[Math.max(0,Math.min(47,j))]);
   const target=active?clamp(at(i)*.7+(at(i-1)+at(i+1))*.15):0;
   this.levels[i]+=(target-this.levels[i])*ease(target>this.levels[i]?.075:.48);
  }
  return p.devices.filter(d=>d.selected).map(d=>{
   const pixels=Array.from({length:d.segments},(_,i)=>{
    const t=d.segments===1?.5:i/(d.segments-1),x=t*5,a=Math.floor(x),b=Math.min(a+1,5),f=x-a;
    const color=this.colors[a].map((v,c)=>v+(this.colors[b][c]-v)*f),peak=Math.max(.12,...color);
    const energy=sample(this.levels,t),gain=clamp(p.idle+(1-p.idle)*Math.pow(energy,.65)*(.3+this.loudness*.85)*p.response);
    return color.map(v=>Math.round(clamp(v/peak)*gain*255));
   });
   if(d.reverse)pixels.reverse();
   return {id:d.id,pixels,brightness:Math.max(1,Math.round(p.brightness*100))};
  });
 }
}
