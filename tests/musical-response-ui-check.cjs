const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/musical-response/ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code);
async function until(code){for(let i=0;i<250;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function shot(name){await pause(180);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());}
async function choose(attribute,value){await run(`{const s=document.querySelector('[${attribute}=reactivityStyle]');s.value='${value}';s.dispatchEvent(new Event('${attribute==='data-pref'?'input':'change'}',{bubbles:true}));}`);await pause(600);}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off'});
 win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')log(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`(async()=>{const {MusicalResponse}=await import('/musical-response.js');const update=MusicalResponse.prototype.update;MusicalResponse.prototype.update=function(...args){window.lastResponseStyle=args[3].style;return update.apply(this,args);};if(document.body.classList.contains('library-open'))document.querySelector('#close-library').click();document.querySelector('#room-visualizer').click();})()`);
 await until(`window.lastResponseStyle==='musical'&&!document.querySelector('#room-gl').hidden`);
 await run(`document.querySelector('#room-visual-settings').click();document.querySelector('[data-section-tab=motion]').click()`);
 assert.ok(await run(`document.querySelector('[data-preference=reactivityStyle]').getBoundingClientRect().width>0`));
 assert.equal(await run(`document.querySelector('[data-preference=reactivityStyle]').value`),'musical');
 await choose('data-preference','classic');assert.equal(service.lib.config.preferences.reactivityStyle,'classic');await until(`lastResponseStyle==='classic'`);await shot('pc-classic');
 await choose('data-preference','musical');assert.equal(service.lib.config.preferences.reactivityStyle,'musical');await until(`lastResponseStyle==='musical'`);await shot('pc-musical');
 await run(`document.querySelector('#room-visual-settings').click();document.querySelector('#music-only').click()`);
 const report=await run(fs.readFileSync(path.join(root,'tests/musical-response-audio.js'),'utf8'));fs.writeFileSync(path.join(out,'audio-report.json'),JSON.stringify(report,null,2));log(JSON.stringify(report));
 await run(`(async()=>{
  const {GPUScene}=await import('/gpu-scene.js'),{Reactor}=await import('/reactor.js');
  const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:999999';document.body.append(c);window.auditGPU=new GPUScene(c);await auditGPU.preparing;
  if(auditGPU.failed)throw Error('GPU preparation failed');
  const r=new Reactor({paused:false,currentTime:17});window.auditDynamics=r.visualState(.016);auditDynamics.roles=musicalAuditFrames[2].roles;
  window.drawAudit=classic=>auditGPU.draw({width:innerWidth,height:innerHeight,time:musicalAuditFrames[2].features.motion,features:classic?musicalAuditFrames[2].base:musicalAuditFrames[2].features,dynamics:auditDynamics,quality:'eco',intensity:.85,scale:.8,reduced:false,hdrMode:'off'});
  drawAudit(false);await auditGPU.warming;if(!drawAudit(false))throw Error('GPU frame unavailable');return true;
 })()`);
 await shot('render-musical');await run(`drawAudit(true)`);await shot('render-classic');assert.equal(await run('auditGPU.gl.getError()'),0);await run('auditGPU.dispose()');
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#745b9c"/></svg>');return;}try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/');await until(`!document.querySelector('#opening')`);await pause(500);
 await run(`document.querySelector('#visuals').click();document.querySelector('[data-section-tab=motion]').click()`);
 assert.equal(await run(`document.querySelector('[data-pref=reactivityStyle]').value`),'musical');await shot('android-musical');
 await choose('data-pref','classic');assert.equal(await run(`(async()=>{const {rpc}=await import('/native.js');return (await rpc('library')).preferences.reactivityStyle;})()`),'classic');
 await run(`document.querySelector('#sheet-close').click();document.querySelector('#visuals').click();document.querySelector('[data-section-tab=motion]').click()`);assert.equal(await run(`document.querySelector('[data-pref=reactivityStyle]').value`),'classic');
 await choose('data-pref','musical');win.setSize(360,800);await shot('android-compact');assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2||document.querySelector('#sheet-body').scrollWidth>document.querySelector('#sheet-body').clientWidth+2`),false);
 log('PASS: PC/Android selector, persistence, compact layout, generated audio through real analyzer and GPU rendering.');
}).catch(async e=>{log(e.stack);if(win){log(await run('document.body.innerText.slice(-3000)'));await shot('failure');}process.exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(process.exitCode||0);});
