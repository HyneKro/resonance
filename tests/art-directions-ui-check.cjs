const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/art-directions/ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server,exitCode=0;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code);
async function until(code){for(let i=0;i<250;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function shot(name){await pause(180);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off',reactivityStyle:'classic'});
 win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')log(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`(async()=>{const {MusicalResponse}=await import('/musical-response.js');const update=MusicalResponse.prototype.update;MusicalResponse.prototype.update=function(...args){const result=update.apply(this,args);window.lastResponseWeight=result.weight;return result;};if(document.body.classList.contains('library-open'))document.querySelector('#close-library').click();document.querySelector('#room-visualizer').click();})()`);
 await until(`window.lastResponseWeight>.95&&!document.querySelector('#room-gl').hidden`);

 await run(`(async()=>{const {GPUScene}=await import('/gpu-scene.js');const draw=GPUScene.prototype.draw;GPUScene.prototype.draw=function(input){window.styleInput=input;return draw.call(this,input);};document.querySelector('#room-visual-settings').click();document.querySelector('[data-section-tab=style]').click();})()`);
 const changes=[['noctiluca',1],['glasshouse',2],['orrery',3],['contour',4],['resonance',0]];
 for(const [id,index]of changes){
  await run(`(()=>{const s=document.querySelector('[data-preference=artDirection]');s.value='${id}';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(`styleInput?.dynamics.artStyle.index===${index}&&styleInput.dynamics.artStyle.opacity===1`);
  assert.equal(await run(`document.querySelector('[data-ribbon-shape]').hidden`),id!=='resonance');
  await shot('pc-'+id);
 }
 await run(`(()=>{const s=document.querySelector('[data-preference=ribbonShape]');s.value='form-24';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await until(`styleInput.dynamics.identity.sculpture[1]===24&&styleInput.dynamics.identity.sculpture[2]===1`);
 const prefs=await run(`fetch('/api/library').then(r=>r.json()).then(x=>x.config.preferences)`);assert.equal(prefs.artDirection,'resonance');assert.equal(prefs.ribbonShape,'form-24');
 await run(`document.querySelector('[data-reset-setting=ribbonShape]').click();document.querySelector('[data-preference=artDirection]').focus()`);
 assert.equal(await run(`document.activeElement.getAttribute('aria-label')`),'Art direction');
 assert.equal(await run(`['artDirection','ribbonShape'].every(key=>{const s=document.querySelector('[data-preference='+key+']');return s.getBoundingClientRect().width>=s.closest('label').getBoundingClientRect().width*.95;})`),true,'Long direction and form names get the full available row');
 await shot('pc-style-controls');

 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#745b9c"/></svg>');return;}try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/');await until(`!document.querySelector('#opening')`);await pause(500);
 await run(`document.querySelector('#visuals').click();document.querySelector('[data-section-tab=style]').click()`);
 assert.equal(await run(`document.querySelector('[data-pref=artDirection]').options.length`),5);
 for(const [id,index]of changes){await run(`(()=>{const s=document.querySelector('[data-pref=artDirection]');s.value='${id}';s.dispatchEvent(new Event('input',{bubbles:true}));})()`);await pause(120);assert.equal(await run(`document.body.dataset.visualArt`),id);assert.equal(await run(`document.querySelector('[data-ribbon-shape]').hidden`),index!==0);}
 await shot('android-style');
 win.setSize(360,800);await shot('android-compact');assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2||document.querySelector('#sheet-body').scrollWidth>document.querySelector('#sheet-body').clientWidth+2`),false);
 log('PASS: style persistence, default reset, transitions, fixed shape selection, accessible focus, Android controls and compact layout.');
}).catch(async e=>{log(e.stack);if(win){log(await run('document.body.innerText.slice(-3000)'));await shot('failure');}exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
