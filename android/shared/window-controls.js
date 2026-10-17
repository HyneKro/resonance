export function installWindowUI({button,doc=document,desktop=window.resonanceDesktop,onError=console.warn}){
  const update=state=>{const full=!!state.fullscreen;doc.body.classList.toggle('is-fullscreen',full);button.setAttribute('aria-pressed',String(full));button.setAttribute('aria-label',full?'Exit fullscreen':'Fullscreen');button.title=full?'Exit fullscreen · Esc / F11':'Fullscreen · F11';};
  if(desktop){doc.body.classList.add('desktop-window');desktop.onWindowState(update);desktop.windowState().then(update).catch(onError);}
  else doc.addEventListener('fullscreenchange',()=>update({fullscreen:!!doc.fullscreenElement}));
  button.onclick=async()=>{try{if(desktop)update(await desktop.toggleFullscreen());else if(doc.fullscreenElement)await doc.exitFullscreen();else await doc.documentElement.requestFullscreen();}catch(e){onError(e);}};
}
