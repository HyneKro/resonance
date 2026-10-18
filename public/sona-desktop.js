export function installSonaDesktop({state,reactor,audio,togglePlay,nextTrack,setPreferences,toast}){
 const bridge=window.resonanceDesktop;if(!bridge?.publishSona)return;
 bridge.onSonaCommand(action=>{void Promise.resolve().then(()=>action==='hide'?setPreferences({sonaFloating:false}):reactor.desktopSource?undefined:action==='play'?togglePlay():nextTrack(action==='previous'?-1:1)).catch(e=>toast(e.message));});
 let last='';
 const publish=()=>{const value={enabled:state.prefs.danceCompanion===true&&state.prefs.sonaFloating===true,playing:reactor.audioActive,desktop:!!reactor.desktopSource,title:state.current?.title||'Resonance',colors:reactor.visualColors||reactor.coverColors||null,reduced:reactor.reduced,appearance:state.prefs.companionAppearance||'sona'};const key=JSON.stringify(value);if(key!==last){last=key;void bridge.publishSona(value).catch(()=>{last='';});}};
 const timer=setInterval(publish,500);window.addEventListener('pagehide',()=>clearInterval(timer));publish();
}
