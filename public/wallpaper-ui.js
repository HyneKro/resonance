import {installMusicEdition} from './music-edition.js';
export function installWallpaper({state}){
 return installMusicEdition({
  motion:()=>state.prefs.motion!==false,
  details:()=>document.querySelector('#dock-details').click(),
  queue:()=>document.querySelector('#room-queue').click()
 });
}
