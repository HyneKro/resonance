import { Inertia } from './inertia.js';
const clamp=x=>Math.max(0,Math.min(1,x));
const distance=(a,b)=>a.reduce((s,x,i)=>s+(x-b[i])**2,0);
export const PALETTE_VERSION=2;
export const validPalette=p=>Array.isArray(p)&&[3,6].includes(p.length)&&p.every(c=>Array.isArray(c)&&c.length===3&&c.every(x=>Number.isFinite(x)&&x>=0&&x<=1));
export const expandPalette=p=>p.length===6?p:[p[0],p[1],p[2],p[1].map((x,i)=>x*.7+p[0][i]*.3),p[2].map((x,i)=>x*.7+p[1][i]*.3),p[0].map((x,i)=>x*.65+p[2][i]*.35)];

// Quantize local cover pixels. Ignore transparent borders and nearly black/white lettering.
export function extractPalette(pixels){
  const bins=new Map();let chroma=0,total=0;
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]<160)continue;
    const c=[pixels[i],pixels[i+1],pixels[i+2]].map(x=>x/255),lo=Math.min(...c),hi=Math.max(...c),sat=hi-lo;
    if(hi<.065||lo>.94)continue;
    const weight=.2+sat*2.3;chroma+=sat;total++;
    const key=c.map(x=>Math.floor(x*12)).join(',');
    const bin=bins.get(key)||{rgb:[0,0,0],weight:0};
    c.forEach((x,j)=>bin.rgb[j]+=x*weight);bin.weight+=weight;bins.set(key,bin);
  }
  // Monochrome covers stay silver/graphite rather than inventing a saturated hue.
  if(!total||chroma/total<.045)return [[.24,.26,.28],[.45,.47,.50],[.70,.72,.75],[.34,.35,.38],[.58,.59,.62],[.84,.86,.89]];
  const colors=[...bins.values()].map(b=>({rgb:b.rgb.map(x=>x/b.weight),weight:b.weight})).sort((a,b)=>b.weight-a.weight);
  const chosen=[colors[0].rgb],candidates=colors.slice(1).filter(c=>c.weight>colors[0].weight*.012);
  // Coverage plus distance retains small accent colors instead of six shades of the dominant hue.
  while(chosen.length<6&&candidates.length){
    candidates.sort((a,b)=>{
      const score=c=>Math.min(...chosen.map(x=>distance(c.rgb,x)))*Math.sqrt(c.weight);
      return score(b)-score(a);
    });
    const next=candidates.shift().rgb;if(Math.min(...chosen.map(c=>distance(c,next)))<.012)break;chosen.push(next);
  }
  const real=chosen.length;
  while(chosen.length<6){const a=chosen[chosen.length%real],b=chosen[(chosen.length+1)%real];chosen.push(a.map((x,i)=>x*.72+b[i]*.28));}
  return chosen.map(c=>{const peak=Math.max(...c),scale=Math.min(2.4,(.56+.18*Math.sqrt(peak))/peak);return c.map(x=>clamp(x*scale));});
}

export class PaletteMixer {
  constructor(colors){this.channels=expandPalette(colors).flat().map(x=>new Inertia(x,2.4));}
  update(colors,dt,frozen=false){
    colors=expandPalette(colors);return colors.map((c,i)=>c.map((x,j)=>clamp(frozen?this.channels[i*3+j].value:this.channels[i*3+j].update(x,dt))));
  }
}

// Generation checking prevents a slow previous cover from recoloring the current song.
export class ArtworkPalette {
  constructor({read,write,decode,onChange}){Object.assign(this,{read,write,decode,onChange});this.cache=new Map();this.key=undefined;this.generation=0;}
  retry(){const key=this.key;this.key=undefined;return this.select(key);}
  async select(artwork){
    if(artwork===this.key)return;this.key=artwork;const generation=++this.generation;
    if(!artwork){this.onChange(null,'No cover · music colors');return;}
    try{
      let palette=this.cache.get(artwork),saved=true;
      if(!palette){const cached=await this.read(artwork).catch(()=>null);palette=cached?.version===PALETTE_VERSION&&validPalette(cached.colors)&&cached.colors.length===6?cached.colors:null;}
      if(!palette){palette=extractPalette(await this.decode(artwork));try{await this.write(artwork,palette);}catch{saved=false;}}
      this.cache.set(artwork,palette);
      if(generation===this.generation)this.onChange(palette,saved?'Six cover tones · saved locally':'Six cover tones');
    }catch{if(generation===this.generation)this.onChange(null,'Cover unavailable · music colors');}
  }
}

export async function decodeArtwork(artwork){
  const img=new Image();img.src='/artwork/'+encodeURIComponent(artwork);await img.decode();
  const canvas=document.createElement('canvas');canvas.width=canvas.height=96;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,96,96);
  return ctx.getImageData(0,0,96,96).data;
}
