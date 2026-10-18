const {app,BrowserWindow,ipcMain,screen}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/mascot-overlay');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));let main,service,sona;const delay=ms=>new Promise(r=>setTimeout(r,ms));
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});service.lib.config.preferences.musicOnly=true;
 main=new BrowserWindow({show:false,webPreferences:{preload:path.join(root,'electron/preload.cjs'),sandbox:true,contextIsolation:true,offscreen:true,backgroundThrottling:false}});
 class HiddenOverlay extends BrowserWindow{constructor(options){super({...options,show:false,webPreferences:{...options.webPreferences,offscreen:true}});}showInactive(){}}
 sona=require('../electron/sona-window.cjs').installSonaWindow({BrowserWindow:HiddenOverlay,ipcMain,win:main,url:service.url,screen,lib:service.lib});
 // A same-origin inert document keeps the real preload/IPC without the main
 // UI's periodic state publisher competing with this bridge fixture.
 await main.loadURL(service.url+'/icon.svg');
 const publish=appearance=>main.webContents.executeJavaScript(`window.resonanceDesktop.publishSona({enabled:true,playing:true,title:'Mascot test',appearance:${JSON.stringify(appearance)}})`);
 await publish('miku');for(let i=0;i<100&&(!sona.window||sona.window.webContents.isLoading());i++)await delay(100);await delay(500);
 const shot=async()=>sona.window.webContents.executeJavaScript(`({label:document.querySelector('#sona').getAttribute('aria-label'),image:document.querySelector('canvas').toDataURL(),opaque:document.querySelector('canvas').getContext('2d').getImageData(0,0,160,160).data.some((v,i)=>i%4===3&&v>100)})`);
 const miku=await shot();assert.match(miku.label,/Hatsune Miku/);assert.ok(miku.opaque);await publish('kirby');await delay(500);const kirby=await shot();assert.match(kirby.label,/Kirby/);assert.ok(kirby.opaque);assert.notEqual(kirby.image,miku.image);
 await main.webContents.executeJavaScript(`window.mascotCommands=[];window.resonanceDesktop.onSonaCommand(value=>window.mascotCommands.push(value));true`);
 await sona.window.webContents.executeJavaScript(`document.querySelector('[data-command=next]').click()`);await delay(100);assert.deepEqual(await main.webContents.executeJavaScript('window.mascotCommands'),['next']);
 fs.writeFileSync(path.join(out,'kirby.png'),(await sona.window.webContents.capturePage()).toPNG());console.log('Floating mascot: appearance changes, drawn sprites and media commands passed.');sona.window.destroy();main.destroy();service.server.close();service.lib.close();app.exit(0);
}).catch(e=>{console.error(e);sona?.window?.destroy();main?.destroy();service?.server.close();app.exit(1);});setTimeout(()=>app.exit(2),30000).unref();
