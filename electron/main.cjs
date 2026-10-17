const { app, BrowserWindow, shell, dialog, ipcMain, screen } = require('electron');
const {installWindowControls}=require('./window-controls.cjs');
const {installPortableUpdate}=require('./portable-update.cjs');
const {installSonaWindow}=require('./sona-window.cjs');
const {installAudioOutput}=require('./audio-output.cjs');
const {installDesktopAudio}=require('./desktop-audio.cjs');
const {showMainWindow,showWhenReady}=require('./window-activation.cjs');
const path = require('node:path');
const fs = require('node:fs');
let win, service;
const portableRoot=path.dirname(process.execPath);
if(app.isPackaged&&fs.existsSync(path.join(portableRoot,'portable.flag'))){const profile=path.join(portableRoot,'data','browser');fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);}
if(!app.requestSingleInstanceLock())app.exit(0);
app.on('second-instance',()=>showMainWindow(win));
app.setAppUserModelId('local.resonance.music');
app.whenReady().then(async()=>{
  const root=path.resolve(__dirname,'..');
  const exeDir=path.dirname(process.execPath);
  const dataDir=app.isPackaged?fs.existsSync(path.join(exeDir,'portable.flag'))?path.join(exeDir,'data'):path.join(exeDir,'..','..','data'):path.join(root,'data');
  win=new BrowserWindow({width:1520,height:980,minWidth:760,minHeight:620,title:'Resonance',titleBarStyle:'hidden',titleBarOverlay:{color:'#00000000',symbolColor:'#eee5fa',height:32},backgroundColor:'#111015',autoHideMenuBar:true,icon:path.join(root,'public','icon.ico'),show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,backgroundThrottling:false,autoplayPolicy:'no-user-gesture-required'}});
  showWhenReady(win);
  try {
    await win.loadFile(path.join(root,'public','startup.html'));
    const { startServer } = await import(require('node:url').pathToFileURL(path.join(root,'server.mjs')).href);
    const runtimeNames=['Resonance.exe','locales','resources','chrome_100_percent.pak','chrome_200_percent.pak','d3dcompiler_47.dll','dxcompiler.dll','dxil.dll','ffmpeg.dll','icudtl.dat','LICENSE','LICENSES.chromium.html','resources.pak','snapshot_blob.bin','v8_context_snapshot.bin','version','vk_swiftshader_icd.json','vk_swiftshader.dll','vulkan-1.dll'];
    service=await startServer({port:0,dataDir,profileDir:app.getPath('userData'),applicationPaths:app.isPackaged?runtimeNames.map(name=>path.join(exeDir,name)):undefined,chooseSource:async type=>{
      const result=await dialog.showOpenDialog(win,{title:type==='m3u'?'Choose a local playlist':'Choose a music folder',properties:type==='m3u'?['openFile']:['openDirectory','createDirectory'],...(type==='m3u'?{filters:[{name:'Local playlists',extensions:['m3u','m3u8']}]}:{})});
      return result.canceled?null:result.filePaths[0];
    }});

    if(win.isDestroyed()){service.server.close();return;}
    installWindowControls({ipcMain,win,url:service.url,screen});
    win.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\/(music\.apple\.com|itunes\.apple\.com|www\.wikidata\.org|open\.spotify\.com|musicbrainz\.org|www\.youtube\.com|music\.youtube\.com|lrclib\.net|en\.wikipedia\.org|commons\.wikimedia\.org|creativecommons\.org|coverartarchive\.org)(\/|$)/.test(url))shell.openExternal(url);return {action:'deny'};});
    win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(service.url+'/'))event.preventDefault();});
    installDesktopAudio({ipcMain,win,url:service.url});
    installAudioOutput({ipcMain,win,url:service.url});
    installPortableUpdate({app,ipcMain,dialog,win,root,url:service.url,exitForUpdate:()=>{service?.sync.cancel();service?.server.close();app.exit(0);}});
    installSonaWindow({BrowserWindow,ipcMain,win,url:service.url,screen,lib:service.lib});
    let allowClose=false;
    win.on('close',event=>{
      if(allowClose)return;event.preventDefault();
      Promise.race([win.webContents.executeJavaScript('window.resonancePrepareClose?.()').catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2500))]).finally(()=>{allowClose=true;if(!win.isDestroyed())win.close();});
    });
    await win.loadURL(service.url);
    fs.writeFileSync(path.join(dataDir,'desktop-status.json'),JSON.stringify({url:service.url,pid:process.pid,started:new Date().toISOString()}));
  }catch(e){fs.mkdirSync(dataDir,{recursive:true});fs.writeFileSync(path.join(dataDir,'startup-error.log'),e.stack);require('electron').dialog.showErrorBox('Resonance could not start',e.message);app.quit();}
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{service?.sync.cancel();service?.server.close();});
