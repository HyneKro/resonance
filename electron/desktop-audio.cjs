// Display capture is granted only to our own window after an explicit request.
// The temporary video source is this app, never another app or the desktop.
function installDesktopAudio({ipcMain,win,url,platform=process.platform,now=Date.now}){
 const channel='resonance:desktop-audio',session=win.webContents.session;let armedUntil=0;
 const ownURL=value=>{try{return new URL(value).origin===new URL(url).origin;}catch{return false;}};
 const trusted=event=>event.sender===win.webContents&&event.senderFrame===win.webContents.mainFrame&&ownURL(event.senderFrame.url);
 ipcMain.handle(channel,(event,action)=>{
  if(!trusted(event))throw Error('Desktop audio request rejected');
  if(action==='stop'){armedUntil=0;return;}
  if(action!=='prepare'||platform!=='win32')throw Error('Desktop audio is available in the Windows app.');
  armedUntil=now()+5000;
 });
 session.setPermissionCheckHandler((wc,permission,origin,details)=>permission==='display-capture'&&wc===win.webContents&&ownURL(origin)&&details?.isMainFrame!==false&&armedUntil>now());
 // Chromium's display-capture handshake uses media with an empty mediaTypes
 // list on Windows. Microphone/camera requests have named device types.
 session.setPermissionRequestHandler((wc,permission,callback,details)=>{
  const display=permission==='display-capture'||permission==='media'&&Array.isArray(details?.mediaTypes)&&details.mediaTypes.length===0;
  callback(display&&wc===win.webContents&&ownURL(details?.requestingUrl||wc.getURL())&&details?.isMainFrame===true&&armedUntil>now());
 });
 session.setDisplayMediaRequestHandler((request,callback)=>{
  const allowed=platform==='win32'&&armedUntil>now()&&request.frame===win.webContents.mainFrame&&ownURL(request.securityOrigin)&&request.audioRequested&&request.userGesture;
  armedUntil=0;
  callback(allowed?{video:request.frame,audio:'loopback'}:null);
 });
 win.on('closed',()=>{armedUntil=0;ipcMain.removeHandler(channel);});
}
module.exports={installDesktopAudio};
