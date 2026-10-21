const {app,BrowserWindow,ipcMain,screen}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
// A detached test launcher may close its output pipe before Electron exits.
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')app.exit(1);});
const workspace=path.resolve(__dirname,'..'),root=process.env.RESONANCE_TEST_APP_ROOT||path.join(workspace,'test-output/portable-full-install/resources/app'),out=path.join(workspace,'test-output/release-work/portable-smoke'),errors=[];
fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(out,'portable-smoke-profile'));let win,service,finished=false;
async function finish(ok,error){if(finished)return;finished=true;const report={ok,error,errors,root};fs.writeFileSync(path.join(out,'portable-smoke-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));win?.destroy();service?.server.close();app.exit(ok?0:1);}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'portable-smoke-data-')),autoScan:false});
 if(service.lib.config.sources.length)throw Error('Portable contains personal sources');
 win=new BrowserWindow({show:false,width:1000,height:780,webPreferences:{offscreen:true,preload:path.join(root,'electron/preload.cjs'),sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 require(path.join(root,'electron/window-controls.cjs')).installWindowControls({ipcMain,win,url:service.url,screen});
 require(path.join(root,'electron/audio-output.cjs')).installAudioOutput({ipcMain,win,url:service.url});
 require(path.join(root,'electron/sona-window.cjs')).installSonaWindow({BrowserWindow,ipcMain,win,url:service.url,screen,lib:service.lib});
 const packageVersion=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
 // The harness runs in Electron; report the tested package version to the
 // production updater instead of the harness runtime's Electron version.
 const updateApp={isPackaged:false,getVersion:()=>packageVersion,getPath:app.getPath.bind(app),quit:app.quit.bind(app)};
 require(path.join(root,'electron/portable-update.cjs')).installPortableUpdate({app:updateApp,ipcMain,dialog:require('electron').dialog,win,root,url:service.url});
 win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 const bootStarted=Date.now();await win.loadURL(service.url);
 // A cold shader cache can outlast a fixed sleep. Wait for the actual ready state,
 // with a bounded deadline, so this checks completion rather than machine timing.
 for(let i=0;i<240;i++){
  if(await win.webContents.executeJavaScript("document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')"))break;
  await new Promise(r=>setTimeout(r,100));
 }
 console.log(JSON.stringify({startupMs:Date.now()-bootStarted}));
 const ready=await win.webContents.executeJavaScript(`(async()=>({ready:document.body.classList.contains('startup-ready'),device:await window.resonanceDesktop.audioOutput(),camera:!!document.querySelector('[data-preference=rollercoaster]'),zoom:!!document.querySelector('[data-preference=cameraZoom]'),slider:!!document.querySelector('[data-preference=cameraZoomIntensity]'),zoomMaximum:(await import('/scene-camera.js')).CAMERA_ZOOM.max,emblem:(await import('/companion-emblem.js')).SONA_BADGES.length}))()`);
 if(!ready.ready||!ready.camera||!ready.zoom||ready.slider||ready.zoomMaximum!==3||ready.emblem!==13||!ready.device.id||errors.length)throw Error(JSON.stringify({ready,errors}));
 const updateState=await win.webContents.executeJavaScript("window.resonanceDesktop.appUpdate('status')");
 if(updateState.current!==packageVersion||updateState.channel!==(packageVersion.includes('-dev.')?'development':'release'))throw Error('Packaged update channel is incorrect');
 fs.writeFileSync(path.join(out,'portable-smoke.png'),(await win.webContents.capturePage()).toPNG());await finish(true);
}).catch(e=>finish(false,e.stack));setTimeout(()=>finish(false,'Timed out'),30000).unref();
