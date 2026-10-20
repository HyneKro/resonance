import {installMusicEdition} from './music-edition.js';
export function installWallpaper({api,state}){
 return installMusicEdition({
  related:track=>state.tracks.filter(t=>t.id!==track?.id&&t.artist&&t.artist===track?.artist),motion:()=>state.prefs.motion!==false,
  details:()=>document.querySelector('#dock-details').click(),
  queue:()=>document.querySelector('#room-queue').click(),
  assets:async track=>(await api('/api/wallpaper?id='+encodeURIComponent(track.id))).assets||[]
 });
}
