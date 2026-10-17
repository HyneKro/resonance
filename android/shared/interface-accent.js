import {validPalette} from './artwork-palette.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export function luminance(rgb){return rgb.map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[.2126,.7152,.0722][i],0);}
export function interfaceAccent(colors){
 if(!validPalette(colors))return [195,162,255];
 const chosen=colors[0];
 // Lift dark accents without shifting their hue; a fixed dark foreground remains readable.
 let lo=0,hi=1;for(let i=0;i<18;i++){const mix=(lo+hi)/2,c=chosen.map(x=>x*(1-mix)+mix);if(luminance(c)<.48)lo=mix;else hi=mix;}
 const lift=luminance(chosen)<.48?hi:0;return chosen.map(x=>Math.round(clamp(x*(1-lift)+lift)*255));
}
export function applyInterfaceAccent(colors,enabled=true){
 const pair=interfaceAccents(enabled?colors:null),root=document.documentElement;
 pair.forEach((rgb,i)=>{const name=i?'--ui-accent-two':'--ui-accent',value=`rgb(${rgb.join(' ')})`;if(root.style.getPropertyValue(name)!==value)root.style.setProperty(name,value);});
}
export function interfaceAccents(colors){
 const first=interfaceAccent(colors);if(!validPalette(colors))return [first,[148,209,228]];
 const primary=colors[0],secondary=colors.slice(1).sort((a,b)=>b.reduce((s,x,i)=>s+(x-primary[i])**2,0)-a.reduce((s,x,i)=>s+(x-primary[i])**2,0))[0]||primary;
 return [first,interfaceAccent([secondary,secondary,secondary])];
}
