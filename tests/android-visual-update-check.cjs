const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');app.setPath('userData',path.join(out,'android-visual-update-profile'));
let win,server,finished=false;const errors=[],checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function finish(ok,error){if(finished)return;finished=true;fs.writeFileSync(path.join(out,'android-visual-update-check.json'),JSON.stringify({ok,error,checks,errors},null,2));console.log(JSON.stringify({ok,error,checks,errors}));win?.destroy();server?.close();app.exit(ok?0:1);}
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';if(name.includes('..')||name.includes('\\'))throw Error('Path');
  let file=name==='test-native.js'?path.join(root,'android/tests',name):name.startsWith('artwork/')?path.join(root,'data',name):path.join(root,'android/web',name);
  if(!fs.existsSync(file))file=path.join(root,'android/shared',name);
  let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:412,height:915,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL('http://127.0.0.1:'+server.address().port);await sleep(1200);
 const run=code=>win.webContents.executeJavaScript(code);
 await run(`(async()=>{const {MobileReactor}=await import('/mobile-reactor.js');const original=MobileReactor.prototype.visualState;MobileReactor.prototype.visualState=function(dt){window.testReactor=this;const state=original.call(this,dt);if(window.fadeFrames)window.fadeFrames.push(Array.from(state.kaleidoscopeWeights));return state;};document.querySelector('#visualizer-mode').click()})()`);
 for(let i=0;i<100;i++){if(await run('window.testReactor?.gpu?.warmed&&window.testReactor?.hadFrame'))break;await sleep(100);}
 assert.ok(await run('window.testReactor?.gpu?.warmed&&window.testReactor?.hadFrame'));
 const defaults=await run(`({quality:window.testReactor.quality,fps:window.testReactor.targetFPS,hdr:window.testReactor.hdrMode,transform:document.querySelector('#room-gl').style.transform})`);
 assert.equal(defaults.quality,'eco');assert.equal(defaults.fps,60);assert.equal(defaults.hdr,'off');assert.match(defaults.transform,/rotate\(90deg\)/);checks.push('Phone defaults and rotated portrait scene retained');
 await run(`document.querySelector('#visuals').click()`);
 const controls=await run(`({speed:Number(document.querySelector('[data-pref=cameraSpeed]').value),max:Number(document.querySelector('[data-pref=cameraSpeed]').max),rail:document.querySelector('[data-pref=rollercoaster]').checked,zoom:document.querySelector('[data-pref=cameraZoom]').checked,slider:!!document.querySelector('[data-pref=cameraZoomIntensity]')})`);
 assert.equal(controls.speed,2.22);assert.equal(controls.max,20);assert.equal(controls.rail,false);assert.equal(controls.zoom,false);assert.equal(controls.slider,false);
 await run(`document.querySelector('[data-pref=rollercoaster]').click();document.querySelector('[data-pref=cameraZoom]').click()`);await sleep(500);
 const saved=await run(`(async()=>{const {rpc}=await import('/native.js');return (await rpc('library')).preferences})()`);assert.equal(saved.cameraZoom,true);assert.equal(saved.rollercoaster,true);
 assert.ok(await run('window.testReactor.rollercoaster&&window.testReactor.cameraZoom'));checks.push('Camera toggles reach the reactor and persist through the native bridge');
 await run(`window.fadeFrames=[];document.querySelector('[data-pref=kaleidoscope]').click()`);await sleep(1400);
 let frames=await run('window.fadeFrames');assert.ok(frames.some(w=>w[0]>.05&&w[0]<.95));assert.equal(frames.at(-1)[1],1);
 await run(`window.fadeFrames=[];const select=document.querySelector('[data-pref=kaleidoscopeMode]');select.value='spiral';select.dispatchEvent(new Event('input',{bubbles:true}))`);await sleep(1400);
 frames=await run('window.fadeFrames');assert.ok(frames.some(w=>w[1]>.05&&w[1]<.95&&w[4]>.05));assert.equal(frames.at(-1)[4],1);
 await run(`window.fadeFrames=[];document.querySelector('[data-pref=kaleidoscope]').click()`);await sleep(1400);
 frames=await run('window.fadeFrames');assert.ok(frames.some(w=>w[4]>.05&&w[4]<.95&&w[0]>.05));assert.equal(frames.at(-1)[0],1);checks.push('Phone pattern and toggle controls deliver smooth intermediate frames');
 await run(`document.querySelector('[data-action=camera-reset]').click()`);
 assert.ok(await run('!window.testReactor.rollercoaster&&!window.testReactor.cameraZoom'));checks.push('Reset view disables both effects');
 await run(`document.querySelector('[data-pref=cameraZoom]').scrollIntoView({block:'center'})`);await sleep(350);fs.writeFileSync(path.join(out,'android-visual-update-check.png'),(await win.webContents.capturePage()).toPNG());
 await run(`document.querySelector('#sheet-close').click();document.querySelector('#music-only').click()`);await sleep(350);assert.ok(await run('window.testReactor.musicOnly&&!window.testReactor.running'));checks.push('Music only stops the updated visualizer');
 assert.deepEqual(errors,[]);await finish(true);
}).catch(e=>finish(false,e.stack));setTimeout(()=>finish(false,'Timed out'),45000).unref();
