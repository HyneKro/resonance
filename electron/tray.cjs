const path=require('node:path');
const {showMainWindow}=require('./window-activation.cjs');

function installTray({app,Tray,Menu,win,root,platform=process.platform}){
 if(platform!=='win32')return {dispose(){}};
 // The portable executable is unsigned and may move between folders. A fixed
 // GUID would bind the notification icon to its first path on Windows.
 const tray=new Tray(path.join(root,'public','icon.ico'));
 let disposed=false,lastVisibility;
 const open=()=>showMainWindow(win);
 const quit=()=>{
  // Use the existing close handler so playback position is saved before the
  // local service stops. app.quit() would stop that service in before-quit.
  if(!win.isDestroyed())win.close();else app.quit();
 };
 const refresh=()=>{
  if(disposed||win.isDestroyed())return;
  const visible=win.isVisible(),background=!visible||win.isMinimized();
  const visibility=visible+':'+background;if(visibility===lastVisibility)return;lastVisibility=visibility;
  tray.setToolTip(background?'Resonance · Running in background':'Resonance · Running');
  tray.setContextMenu(Menu.buildFromTemplate([
   {label:'Open Resonance',click:open},
   {label:'Hide window',enabled:visible,click:()=>{if(!win.isDestroyed())win.hide();}},
   {type:'separator'},
   {label:'Quit Resonance',click:quit},
  ]));
 };
 const events=['show','hide','minimize','restore'];
 const dispose=()=>{
  if(disposed)return;disposed=true;
  for(const event of events)win.removeListener(event,refresh);
  win.removeListener('closed',dispose);app.removeListener('will-quit',dispose);
  tray.removeListener('click',open);tray.removeListener('double-click',open);tray.destroy();
 };
 tray.on('click',open);tray.on('double-click',open);
 for(const event of events)win.on(event,refresh);
 win.once('closed',dispose);app.once('will-quit',dispose);refresh();
 return {dispose,get icon(){return tray;}};
}
module.exports={installTray};
