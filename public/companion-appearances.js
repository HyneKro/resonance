import {GUEST_INTERACTION_CELLS} from './companion-choreography.js';
// Fixed identifiers are shared by saved preferences, local assets and the desktop overlay.
// Only complete, bundled appearances are offered. Unknown IDs fall back to Sona.
export const COMPANION_APPEARANCES=Object.freeze([
 ['sona','Sona · default'],
 ['miku','Hatsune Miku'],['kirby','Kirby'],
 ['frieren','Frieren'],['2b','2B'],
 ['neco-arc','Neco-Arc'],['creeper','Minecraft Creeper'],
 ['jinx','Jinx'],['vi','Vi'],['jayce','Jayce'],
 ['heimerdinger','Heimerdinger'],['ekko','Ekko'],
 ['goku','Son Goku'],['chopper','Tony Tony Chopper'],
 ['gojo','Gojo'],['rem','Rem'],
 ['sailor-moon','Sailor Moon'],['totoro','Totoro'],
 ['saitama','Saitama'],['asuka','Asuka'],
 ['guts','Guts'],['sasuke','Sasuke'],
 ['naruto','Naruto'],['luffy','Monkey D. Luffy'],
 ['astro-boy','Astro Boy'],['megumin','Megumin'],
 ['zero-two','Zero Two'],['fern','Fern'],
 ['aang','Aang · Avatar'],['sung-jin-woo','Sung Jin Woo'],
].map(([id,label])=>Object.freeze({
 id,label,src:id==='sona'?'/sona-motions.webp':'/companions/'+id+'.webp',
})));
export const companionAppearance=value=>COMPANION_APPEARANCES.some(item=>item.id===value)?value:'sona';
export const appearanceInfo=value=>COMPANION_APPEARANCES.find(item=>item.id===companionAppearance(value));

// Guest sheets have eight twelve-pose dances and six four-pose interactions.
// Sona retains her original 104-pose sheet; guests map to her logical pose slots.
export function appearanceCell(row,frame){
 const f=Math.max(0,Math.trunc(frame)||0);
 if(row<8)return Math.max(0,row)*12+Math.min(11,f);
 const i=Math.min(7,f);
 const name={8:'sleep',9:'clicked',10:'pickup',11:'drop',12:'idle'}[row]||'idle';
 return GUEST_INTERACTION_CELLS[name][i];
}
