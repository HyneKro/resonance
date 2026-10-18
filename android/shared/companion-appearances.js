// Fixed identifiers are shared by saved preferences, local assets and the desktop overlay.
// Only complete, bundled appearances are offered. Unknown IDs fall back to Sona.
export const COMPANION_APPEARANCES=Object.freeze([
 ['sona','Sona · default',0,0],
 ['miku','Hatsune Miku',2.8,2],['kirby','Kirby',2.4,1.6],
 ['frieren','Frieren',3.6,2.8],['2b','2B',3,2.4],
 ['neco-arc','Neco-Arc',2.4,1.8],['creeper','Minecraft Creeper',3.2,2.4],
 ['jinx','Jinx',2.4,1.8],['vi','Vi',2.8,2],['jayce','Jayce',3,2.4],
 ['heimerdinger','Heimerdinger',3.4,2.4],['ekko','Ekko',2.8,2],
 ['goku','Son Goku',2.6,1.8],['chopper','Tony Tony Chopper',2.8,2],
 ['gojo','Gojo',3,2.4],['rem','Rem',3.2,2.6],
 ['sailor-moon','Sailor Moon',3,2.2],['totoro','Totoro',3.6,2.8],
 ['saitama','Saitama',3.6,2.8],['asuka','Asuka',2.8,2],
 ['guts','Guts',3.4,2.8],['sasuke','Sasuke',3.2,2.4],
 ['naruto','Naruto',2.6,1.8],['luffy','Monkey D. Luffy',2.4,1.8],
 ['astro-boy','Astro Boy',2.8,2],['megumin','Megumin',3,2.2],
 ['zero-two','Zero Two',3,2.2],['fern','Fern',3.6,2.8],
 ['aang','Aang · Avatar',2.8,2],['sung-jin-woo','Sung Jin Woo',3.2,2.4],
].map(([id,label,grooveSeconds,danceSeconds])=>Object.freeze({
 id,label,grooveSeconds,danceSeconds,src:id==='sona'?'/sona-motions.webp':'/companions/'+id+'.webp',
})));
export const companionAppearance=value=>COMPANION_APPEARANCES.some(item=>item.id===value)?value:'sona';
export const appearanceInfo=value=>COMPANION_APPEARANCES.find(item=>item.id===companionAppearance(value));

// Guest sheets have eight twelve-pose dances and six four-pose interactions.
// Sona retains her original 104-pose sheet. Playback order is reviewed separately.
export function appearanceCell(row,frame){
 const f=Math.max(0,Math.trunc(frame)||0);
 if(row<8)return Math.max(0,row)*12+Math.min(11,f);
 const i=Math.min(7,f);
 if(row===8)return [100,101,102,103,102,101,100,100][i];
 if(row===9)return [104,105,106,106,107,107,104,104][i];
 if(row===10)return 108+i;
 if(row===11)return [116,116,117,117,118,118,119,119][i];
 return [96,96,96,97,98,99,96,96][i];
}
