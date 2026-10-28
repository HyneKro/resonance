const clamp=(n,lo=0,hi=1)=>Math.max(lo,Math.min(hi,Number.isFinite(n)?n:lo));
export const LIGHTING_DEFAULTS=Object.freeze({brightness:.65,response:.7,idle:.18,devices:[]});
export const LIGHTING_ROLES=['mix','bass','mids','highs'];
export function lightingOptions(value={}){
 return {brightness:clamp(value.brightness??.65,.05,1),response:clamp(value.response??.7,0,1.5),idle:clamp(value.idle??.18,0,1),devices:Array.isArray(value.devices)?value.devices.slice(0,32).filter(d=>d&&typeof d.id==='string'&&/^(?:[A-Fa-f0-9]{2}:){5,7}[A-Fa-f0-9]{2}$/.test(d.id)).map(d=>({id:d.id,selected:d.selected===true,role:LIGHTING_ROLES.includes(d.role)?d.role:'mix',color:Math.round(clamp(d.color,0,5))})):[]};
}
// A separate, bounded envelope for physical lights. No random flashes or track reset.
export class LightingSignal {
 constructor(){this.colors=Array.from({length:6},()=>[.3,.12,.6]);this.levels=[0,0,0,0];}
 update({colors,features={},active=false}={},dt=.05,options={}){
  const p=lightingOptions(options),step=clamp(dt,0,.2),ease=seconds=>1-Math.exp(-step/seconds);
  for(let i=0;i<6;i++)for(let c=0;c<3;c++){const target=clamp(colors?.[i]?.[c]??this.colors[i][c]);this.colors[i][c]+=(target-this.colors[i][c])*ease(1.1);}
  const bands=features.bands||[],mean=(a,b)=>{let n=0;for(let i=a;i<b;i++)n+=clamp(bands[i]);return n/(b-a);};
  const target=active?[clamp(features.loudness),clamp(mean(0,2)*.65+clamp(features.accents?.[0])*.35),mean(2,5),mean(5,8)]:[0,0,0,0];
  for(let i=0;i<4;i++)this.levels[i]+=(target[i]-this.levels[i])*ease(target[i]>this.levels[i] ? .13 : .7);
  return p.devices.filter(d=>d.selected).map(d=>{
   const lane=LIGHTING_ROLES.indexOf(d.role),energy=this.levels[lane],gain=clamp(p.idle+(Math.sqrt(energy)*.78+this.levels[0]*.18)*p.response);
   const color=this.colors[d.color],peak=Math.max(.12,...color),rgb=color.map(v=>Math.round(clamp(v/peak)*255));
   return {id:d.id,color:{r:rgb[0],g:rgb[1],b:rgb[2]},brightness:Math.max(1,Math.round(p.brightness*100*gain))};
  });
 }
}
