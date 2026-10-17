// A narrow bridge for this app's own main frame; no arbitrary IPC or shell access.
function installWindowControls({ipcMain,win,url,screen}){
  const channel='resonance:window';
  const state=()=>{const display=screen?.getDisplayMatching(win.getBounds());return {fullscreen:win.isFullScreen(),maximized:win.isMaximized(),...(display?{displayFrequency:display.displayFrequency,displayId:display.id}:{})};};
  const trusted=event=>event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&event.senderFrame.url.startsWith(url+'/');
  ipcMain.handle(channel,(event,action)=>{
    if(!trusted(event))throw Error('Window command rejected');
    if(action==='toggle-fullscreen')win.setFullScreen(!win.isFullScreen());
    else if(action==='exit-fullscreen')win.setFullScreen(false);
    else if(action!=='state')throw Error('Unknown window command');
    if(action!=='state')publish();
    return state();
  });
  const publish=()=>{if(!win.isDestroyed())win.webContents.send('resonance:window-state',state());};
  for(const event of ['enter-full-screen','leave-full-screen','maximize','unmaximize','move','resize'])win.on(event,publish);
  screen?.on('display-metrics-changed',publish);screen?.on('display-added',publish);screen?.on('display-removed',publish);
  win.webContents.on('before-input-event',(event,input)=>{
    if(input.type!=='keyDown'||input.isAutoRepeat)return;
    if(input.key==='F11'){event.preventDefault();win.setFullScreen(!win.isFullScreen());publish();}
    else if(input.key==='Escape'&&win.isFullScreen()){event.preventDefault();win.setFullScreen(false);publish();}
  });
  win.on('closed',()=>{ipcMain.removeHandler(channel);for(const event of ['display-metrics-changed','display-added','display-removed'])screen?.removeListener(event,publish);});
}
module.exports={installWindowControls};
