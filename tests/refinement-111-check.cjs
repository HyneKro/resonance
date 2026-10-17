const {app,BrowserWindow,ipcMain,screen}=require('electron');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-output');app.setPath('userData',path.join(output,'refinement-111-profile'));
const {installSonaWindow}=require('../electron/sona-window.cjs'),{installWindowControls}=require('../electron/window-controls.cjs');
let service,win,sona,finished=false;const checks=[],errors=[],wait=ms=>new Promise(r=>setTimeout(r,ms));
async function finish(ok,error){if(finished)return;finished=true;const result={ok,error,checks,errors};fs.writeFileSync(path.join(output,'refinement-111-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));sona?.window?.destroy();win?.destroy();service?.server.close();app.exit(ok?0:1);}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')));service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(output,'refinement-111-data-')),autoScan:false});
 service.lib.config.sources=[];service.lib.config.preferences={...service.lib.config.preferences,musicOnly:true,sfx:false,quality:'eco',hdrMode:'off'};service.lib.setSetting('config',service.lib.config);
 service.lib.save({id:'ui-test',path:'test.wav',artist:'Test artist',title:'Test track',kind:'track',album:'',genre:'Electronic',available:true,rawTitle:'Test artist - Test track',plays:0,duration:180});
 win=new BrowserWindow({show:false,width:1100,height:820,webPreferences:{offscreen:true,preload:path.join(root,'electron/preload.cjs'),sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});
 win.webContents.on('console-message',d=>{if(d.level==='error'&&!d.message.includes('No handler registered'))errors.push(d.message);});
 installWindowControls({ipcMain,win,url:service.url,screen});ipcMain.handle('resonance:audio-output',()=>({id:'a'.repeat(24),label:'Test output',transport:'direct'}));
 let focused=true;win.isFocused=()=>focused;
 class HiddenSona extends BrowserWindow{constructor(options){super({...options,webPreferences:{...options.webPreferences,offscreen:true}});this.visibleForTest=false;}showInactive(){this.visibleForTest=true;}hide(){this.visibleForTest=false;super.hide();}isVisible(){return this.visibleForTest;}}
 sona=installSonaWindow({BrowserWindow:HiddenSona,ipcMain,win,url:service.url,screen,lib:service.lib});
 await win.loadURL(service.url);await wait(1600);
 await win.webContents.executeJavaScript(`document.querySelector('[data-view=artists]').click()`);await wait(100);
 await win.webContents.executeJavaScript(`document.querySelector('.artist-card').click()`);await wait(100);
 assert.equal(await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Back to all artists"]').textContent`),'← Every artist');
 await win.webContents.executeJavaScript(`document.querySelector('[aria-label="Back to all artists"]').click()`);await wait(100);
 assert.equal(await win.webContents.executeJavaScript(`document.querySelector('.artist-card h3').textContent`),'Test artist');checks.push('Artist detail returns to the full artist grid');
 const modal=()=>win.webContents.executeJavaScript(`(()=>{const dialog=document.querySelector('#dialog');dialog.removeAttribute('data-panel');document.querySelector('#dialog-content').innerHTML='<div class="dialog-heading"><div><h2>Behind the sound</h2><p>Your file, its story, and the details worth keeping.</p></div><button class="icon-button" aria-label="Close">×</button></div><div class="dialog-body"><details class="song-lyrics" open><summary>Lyrics</summary><div data-lyrics-text>'+('Floating like satellites<br>We dance in darkness<br><br>').repeat(80)+'</div></details></div><div class="dialog-actions"><button class="secondary">Add to queue</button><button class="secondary">Add to playlist</button><button class="primary">Play now</button></div>';if(!dialog.open)dialog.showModal();})()`);
 const sizes=[];
 for(const [width,height,zoom]of [[1100,820,1],[1100,1280,1],[900,660,1],[1100,950,1.25]]){
  win.setSize(width,height);win.webContents.setZoomFactor(zoom);await modal();await wait(150);
  const geometry=await win.webContents.executeJavaScript(`(()=>{const d=document.querySelector('#dialog'),b=d.querySelector('.dialog-body'),a=d.querySelector('.dialog-actions'),rect=d.getBoundingClientRect(),footer=a.getBoundingClientRect();b.scrollTop=b.scrollHeight;return {outerOverflow:d.scrollHeight-d.clientHeight,bodyOverflow:b.scrollHeight-b.clientHeight,footerBottom:footer.bottom,dialogBottom:rect.bottom,viewport:innerHeight,footerTop:footer.top,bodyBottom:b.getBoundingClientRect().bottom}})()`);
  assert.ok(geometry.outerOverflow<=1,JSON.stringify(geometry));assert.ok(geometry.bodyOverflow>100);assert.ok(geometry.footerBottom<=geometry.dialogBottom&&geometry.footerBottom<=geometry.viewport);assert.ok(geometry.bodyBottom<=geometry.footerTop+1);sizes.push({width,height,zoom,...geometry});
  if(height===1280)fs.writeFileSync(path.join(output,'details-footer-111.png'),(await win.webContents.capturePage()).toPNG());
 }
 checks.push({dialog:'One scroll area, with the full footer visible at all four window/zoom sizes',sizes});
 await win.webContents.executeJavaScript(`document.querySelector('#dialog').close();window.resonanceDesktop.publishSona({enabled:true,playing:true,title:'A very long song title that must not stretch Sona’s controls',colors:[[.7,.3,.8],[.2,.6,.8],[.9,.3,.5]]})`);
 focused=false;sona.sync();await wait(600);const child=sona.window;
 child.setSize(1600,400);await wait(100);sona.sync();await wait(100);assert.ok(child.getSize().every((v,i)=>Math.abs(v-[190,226][i])<=2),JSON.stringify({size:child.getSize(),content:child.getContentSize(),min:child.getMinimumSize(),max:child.getMaximumSize(),visible:child.isVisible()}));
 const layout=await child.webContents.executeJavaScript(`(()=>{const nav=document.querySelector('nav'),s=getComputedStyle(nav),rect=nav.getBoundingClientRect();return {width:rect.width,x:rect.x,bottom:document.querySelector('#title').getBoundingClientRect().bottom,height:innerHeight,background:s.backgroundColor,overflow:document.documentElement.scrollWidth-innerWidth}})()`);
 assert.ok(layout.width<=146);assert.ok(layout.x>=0);assert.ok(layout.overflow<=0);assert.ok(layout.bottom<=layout.height,'all floating controls fit even when the main app is zoomed');assert.match(layout.background,/0\.4\)/);assert.equal(child.isResizable(),false);assert.equal(child.isFullScreenable(),false);
 fs.writeFileSync(path.join(output,'sona-compact-111.png'),(await child.webContents.capturePage()).toPNG());checks.push({sona:'Fixed-size window resists stretching; centered translucent controls',...layout});
 if(errors.some(e=>/Uncaught|404|SyntaxError|ReferenceError/.test(e)))throw Error(errors.join('\n'));await finish(true);
}).catch(e=>finish(false,e.stack));setTimeout(()=>finish(false,'UI check timed out'),45000).unref();
