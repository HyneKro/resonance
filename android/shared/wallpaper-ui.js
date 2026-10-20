import {installMusicEdition} from './music-edition.js';
export function installWallpaper({api}){
 return installMusicEdition({
  details:()=>document.querySelector('#dock-details').click(),
  queue:()=>document.querySelector('#room-queue').click(),
  assets:async track=>(await api('/api/wallpaper?id='+encodeURIComponent(track.id))).assets||[]
 });
}
