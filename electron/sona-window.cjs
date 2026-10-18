const path=require('node:path');
const SIZE={width:190,height:226};
function installSonaWindow({BrowserWindow,ipcMain,win,url,screen,lib}){
 let overlay=null,state={enabled:false},drag=null,correctingSize=false;
 const main=e=>e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame&&e.senderFrame.url.startsWith(url+'/');
 const child=e=>overlay&&!overlay.isDestroyed()&&e.sender===overlay.webContents&&e.senderFrame===overlay.webContents.mainFrame&&e.senderFrame.url===url+'/sona-overlay.html';
 const place=point=>{const area=screen.getDisplayNearestPoint(point).workArea;return {x:Math.round(Math.max(area.x,Math.min(area.x+area.width-SIZE.width,point.x))),y:Math.round(Math.max(area.y,Math.min(area.y+area.height-SIZE.height,point.y)))};};
 const publish=()=>{if(overlay&&!overlay.isDestroyed())overlay.webContents.send('resonance:sona-state',state);};
 const keepSize=()=>{
  if(!overlay||overlay.isDestroyed()||correctingSize)return;
  const [w,h]=overlay.getSize();if(Math.abs(w-SIZE.width)<=2&&Math.abs(h-SIZE.height)<=2)return;
  correctingSize=true;
  try{
   // Windows can replace both constraints when resizing a fixed-size window.
   // Restore the limits as well as the size, allowing for one-pixel DPI rounding.
   overlay.setMinimumSize(SIZE.width,SIZE.height);
   overlay.setMaximumSize(SIZE.width,SIZE.height);
   overlay.setSize(SIZE.width,SIZE.height);
  }finally{correctingSize=false;}
 };
 const sync=()=>{
  if(!state.enabled||win.isFocused()){overlay?.hide();return;}
  if(!overlay){
   const area=screen.getDisplayMatching(win.getBounds()).workArea,saved=lib.getSetting('sonaDesktopPosition');
   const position=place(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.y)?saved:{x:area.x+area.width-SIZE.width-24,y:area.y+area.height-SIZE.height-24});
   overlay=new BrowserWindow({...position,...SIZE,minWidth:SIZE.width,maxWidth:SIZE.width,minHeight:SIZE.height,maxHeight:SIZE.height,show:false,transparent:true,backgroundColor:'#00000000',frame:false,thickFrame:false,resizable:false,maximizable:false,minimizable:false,fullscreenable:false,skipTaskbar:true,alwaysOnTop:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,partition:'sona-overlay',zoomFactor:1}});
   overlay.on('will-resize',e=>e.preventDefault());
   overlay.on('resize',keepSize);overlay.on('show',keepSize);
   overlay.setAlwaysOnTop(true,'floating');overlay.setIgnoreMouseEvents(true,{forward:true});
   overlay.webContents.setWindowOpenHandler(()=>({action:'deny'}));overlay.webContents.on('will-navigate',e=>e.preventDefault());
   overlay.on('closed',()=>{overlay=null;drag=null;});
   overlay.loadURL(url+'/sona-overlay.html').then(()=>{publish();if(state.enabled&&!win.isFocused())overlay.showInactive();}).catch(()=>overlay?.destroy());
  }else{keepSize();publish();if(!overlay.isVisible())overlay.showInactive();}
 };
 ipcMain.handle('resonance:sona-publish',(e,value)=>{
  if(!main(e))throw Error('Sona publisher rejected');
  const palette=Array.isArray(value.colors)&&value.colors.length>=3&&value.colors.every(c=>Array.isArray(c)&&c.length===3&&c.every(n=>Number.isFinite(n)&&n>=0&&n<=1))?value.colors.slice(0,6):null;
  state={enabled:value.enabled===true,playing:value.playing===true,desktop:value.desktop===true,title:String(value.title||'Resonance').slice(0,200),colors:palette,reduced:value.reduced===true,appearance:typeof value.appearance==='string'&&/^[a-z0-9-]{1,40}$/.test(value.appearance)?value.appearance:'sona'};sync();return true;
 });
 ipcMain.handle('resonance:sona-command',(e,action)=>{
  if(!child(e))throw Error('Sona command rejected');
  if(['play','next','previous','hide'].includes(action))win.webContents.send('resonance:sona-command',action);
  else if(action==='open'){if(win.isMinimized())win.restore();win.show();win.focus();}
  else if(action==='interactive')overlay.setIgnoreMouseEvents(false);
  else if(action==='passthrough'&&!drag)overlay.setIgnoreMouseEvents(true,{forward:true});
  else if(action==='drag-start')drag={cursor:screen.getCursorScreenPoint(),bounds:overlay.getBounds()};
  else if(action==='drag-move'&&drag){const p=screen.getCursorScreenPoint(),next=place({x:drag.bounds.x+p.x-drag.cursor.x,y:drag.bounds.y+p.y-drag.cursor.y});overlay.setPosition(next.x,next.y);}
  else if(action==='drag-end'){drag=null;const {x,y}=overlay.getBounds();lib.setSetting('sonaDesktopPosition',{x,y});}
  else if(!['passthrough','drag-move'].includes(action))throw Error('Unknown Sona command');
 });
 win.on('focus',sync);win.on('blur',sync);win.on('minimize',sync);
 win.on('closed',()=>{overlay?.destroy();ipcMain.removeHandler('resonance:sona-publish');ipcMain.removeHandler('resonance:sona-command');});
 return {sync,get window(){return overlay;}};
}
module.exports={installSonaWindow};
