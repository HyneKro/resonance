const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/ribbon-spectrum/ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code);
async function until(code){for(let i=0;i<250;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function shot(name){await pause(180);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off',reactivityStyle:'classic'});
 win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')log(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`(async()=>{const {MusicalResponse}=await import('/musical-response.js');const update=MusicalResponse.prototype.update;MusicalResponse.prototype.update=function(...args){const result=update.apply(this,args);window.lastResponseWeight=result.weight;return result;};if(document.body.classList.contains('library-open'))document.querySelector('#close-library').click();document.querySelector('#room-visualizer').click();})()`);
 await until(`window.lastResponseWeight>.95&&!document.querySelector('#room-gl').hidden`);
 await run(`document.querySelector('#room-visual-settings').click();document.querySelector('[data-section-tab=motion]').click()`);
 assert.equal(await run(`document.querySelector('[data-preference=reactivityStyle]')===null`),true);await shot('pc-motion');
 await run(`document.querySelector('#room-visual-settings').click();document.querySelector('#music-only').click()`);
 const report=await run(fs.readFileSync(path.join(root,'tests/musical-response-audio.js'),'utf8'));fs.writeFileSync(path.join(out,'audio-report.json'),JSON.stringify(report,null,2));log(JSON.stringify(report));
 const gpuReport=await run(fs.readFileSync(path.join(root,'tests/ribbon-spectrum-render.js'),'utf8'));fs.writeFileSync(path.join(out,'gpu-report.json'),JSON.stringify(gpuReport,null,2));log(JSON.stringify(gpuReport));
 for(const scene of ['silent','bass','middle','treble','full','music']){await run(`drawSpectrumAudit('${scene}')`);await shot('spectrum-'+scene);}
 await run('auditGPU.dispose()');
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#745b9c"/></svg>');return;}try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/');await until(`!document.querySelector('#opening')`);await pause(500);
 await run(`document.querySelector('#visuals').click();document.querySelector('[data-section-tab=motion]').click()`);
 assert.equal(await run(`document.querySelector('[data-pref=reactivityStyle]')===null`),true);await shot('android-motion');
 win.setSize(360,800);await shot('android-compact');assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2||document.querySelector('#sheet-body').scrollWidth>document.querySelector('#sheet-body').clientWidth+2`),false);
 log('PASS: retired selector removed on PC/Android, old preference uses Musical, compact layout, offline audio and spectrum GPU rendering.');
}).catch(async e=>{log(e.stack);if(win){log(await run('document.body.innerText.slice(-3000)'));await shot('failure');}process.exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(process.exitCode||0);});
