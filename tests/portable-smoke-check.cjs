const {app,BrowserWindow,ipcMain,screen}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const workspace=path.resolve(__dirname,'..'),root=path.join(workspace,'test-output/portable-full-install/resources/app'),out=path.join(workspace,'test-output'),errors=[];
app.setPath('userData',path.join(out,'portable-smoke-profile'));let win,service,finished=false;
async function finish(ok,error){if(finished)return;finished=true;const report={ok,error,errors,root};fs.writeFileSync(path.join(out,'portable-smoke-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));win?.destroy();service?.server.close();app.exit(ok?0:1);}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'portable-smoke-data-')),autoScan:false});
 if(service.lib.config.sources.length)throw Error('Portable contains personal sources');
 win=new BrowserWindow({show:false,width:1000,height:780,webPreferences:{offscreen:true,preload:path.join(root,'electron/preload.cjs'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 require(path.join(root,'electron/window-controls.cjs')).installWindowControls({ipcMain,win,url:service.url,screen});
 require(path.join(root,'electron/audio-output.cjs')).installAudioOutput({ipcMain,win,url:service.url});
 require(path.join(root,'electron/sona-window.cjs')).installSonaWindow({BrowserWindow,ipcMain,win,url:service.url,screen,lib:service.lib});
 require(path.join(root,'electron/portable-update.cjs')).installPortableUpdate({app,ipcMain,dialog:require('electron').dialog,win,root,url:service.url});
 win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL(service.url);await new Promise(r=>setTimeout(r,7000));
 const ready=await win.webContents.executeJavaScript(`(async()=>({ready:document.body.classList.contains('startup-ready'),device:await window.resonanceDesktop.audioOutput(),camera:!!document.querySelector('[data-preference=rollercoaster]'),zoom:!!document.querySelector('[data-preference=cameraZoom]'),slider:!!document.querySelector('[data-preference=cameraZoomIntensity]'),zoomMaximum:(await import('/scene-camera.js')).CAMERA_ZOOM.max,emblem:(await import('/companion-emblem.js')).SONA_BADGES.length}))()`);
 if(!ready.ready||!ready.camera||!ready.zoom||ready.slider||ready.zoomMaximum!==3||ready.emblem!==13||!ready.device.id||errors.length)throw Error(JSON.stringify({ready,errors}));
 fs.writeFileSync(path.join(out,'portable-smoke.png'),(await win.webContents.capturePage()).toPNG());await finish(true);
}).catch(e=>finish(false,e.stack));setTimeout(()=>finish(false,'Timed out'),30000).unref();
