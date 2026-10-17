const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('resonanceDesktop',{
  installUpdate:()=>ipcRenderer.invoke('resonance:update'),
  publishSona:state=>ipcRenderer.invoke('resonance:sona-publish',state),
  sonaCommand:action=>ipcRenderer.invoke('resonance:sona-command',action),
  onSonaState:callback=>{const fn=(_e,s)=>callback(s);ipcRenderer.on('resonance:sona-state',fn);return ()=>ipcRenderer.removeListener('resonance:sona-state',fn);},
  onSonaCommand:callback=>{const fn=(_e,s)=>callback(s);ipcRenderer.on('resonance:sona-command',fn);return ()=>ipcRenderer.removeListener('resonance:sona-command',fn);},
  audioOutput:()=>ipcRenderer.invoke('resonance:audio-output'),
  onAudioOutput:callback=>{const fn=(_e,s)=>callback(s);ipcRenderer.on('resonance:audio-output-state',fn);return ()=>ipcRenderer.removeListener('resonance:audio-output-state',fn);},
  prepareDesktopAudio:()=>ipcRenderer.invoke('resonance:desktop-audio','prepare'),
  stopDesktopAudio:()=>ipcRenderer.invoke('resonance:desktop-audio','stop'),
  windowState:()=>ipcRenderer.invoke('resonance:window','state'),
  toggleFullscreen:()=>ipcRenderer.invoke('resonance:window','toggle-fullscreen'),
  exitFullscreen:()=>ipcRenderer.invoke('resonance:window','exit-fullscreen'),
  onWindowState:callback=>{const listener=(_event,state)=>callback(state);ipcRenderer.on('resonance:window-state',listener);return ()=>ipcRenderer.removeListener('resonance:window-state',listener);}
});
