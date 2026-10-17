// Real Electron integration test in an offscreen window, with an isolated profile.
const {app,BrowserWindow,ipcMain}=require('electron'),path=require('node:path'),fs=require('node:fs'),http=require('node:http');
const {installWindowControls}=require('../electron/window-controls.cjs');
const root=path.resolve(__dirname,'..');app.setPath('userData',path.join(root,'test-output','window-check-profile'));
let server,win;const trace=[];const finish=(ok,message)=>{fs.writeFileSync(path.join(root,'test-output','window-check-result.json'),JSON.stringify({ok,message,trace},null,2));win?.destroy();server?.close();app.exit(ok?0:1);};
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{const file=req.url==='/window-controls.js'?'public/window-controls.js':'tests/window-check.html';res.setHeader('Content-Type',file.endsWith('.html')?'text/html':'text/javascript');res.end(fs.readFileSync(path.join(root,file)));});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url='http://127.0.0.1:'+server.address().port;
 win=new BrowserWindow({show:false,width:960,height:640,titleBarStyle:'hidden',titleBarOverlay:{color:'#00000000',symbolColor:'#eee5fa',height:32},webPreferences:{offscreen:true,preload:path.join(root,'electron','preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false}});
 installWindowControls({ipcMain:{handle:(channel,fn)=>ipcMain.handle(channel,(event,action)=>{const result=fn(event,action);trace.push({action,result});return result;}),removeHandler:channel=>ipcMain.removeHandler(channel)},win,url});
 win.webContents.on('console-message',details=>{const message=details.message;if(message?.startsWith('WINDOW_TEST:')){const result=JSON.parse(message.slice(12));finish(result.ok,result.message);}});
 setTimeout(()=>finish(false,'Timed out waiting for fullscreen state'),12000).unref();await win.loadURL(url);
}).catch(e=>finish(false,e.stack));
