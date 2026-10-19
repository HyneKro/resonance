const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/library-understanding/ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code);
async function until(code){for(let i=0;i<150;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function shot(name){await pause(180);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2||[...document.querySelectorAll('.library-understanding,.dialog-body,#sheet-body')].some(e=>e.scrollWidth>e.clientWidth+2)`),false,name+' overflow');}
async function common(prefix){
 assert.equal(await run(`document.querySelectorAll('[data-review-filter]').length`),4);
 await shot(prefix+'-review');
 await run(`document.querySelector('[data-review-artist]').click();const form=document.querySelector('[data-review-edit]');form.elements.value.value='Peter, Paul and Mary; Nova';form.requestSubmit();`);
 await until(`!!document.querySelector('[data-review-undo]')`);assert.ok(await run(`document.querySelector('.review-status').textContent.includes('protected')`));
 await shot(prefix+'-saved');
 await run(`document.querySelector('[data-review-undo]').click()`);await until(`document.querySelector('.review-status').textContent.includes('restored')`);
 await run(`document.querySelector('[data-review-details]').click()`);await until(`!!document.querySelector('#metadata-form,#edit-track')`);
 await run(prefix==='pc'?`document.querySelector('[data-dialog-back]').click()`:`document.querySelector('#sheet-back').click()`);await until(`!!document.querySelector('[data-review-filter]')`);
 await run(`document.querySelector('[data-review-filter=genres]').click()`);await shot(prefix+'-genres');
 await run(`document.querySelector('[data-review-filter=versions]').click()`);await shot(prefix+'-versions');
}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off'});
 for(let i=0;i<190;i++)service.lib.save({id:'song'+i,path:path.join(out,i+'.opus'),title:i<3?'Night'+(i===2?' (Nova Remix)':''):i===189?'Very last song':i%3?'A long song title with a featured performer and a movie reference '+i:'Unknown song '+i,artist:'Aster',channel:'Aster',genre:i%2?'Rock':'',genreBasis:'artist',duration:i===2?240:180,available:true,plays:0,kind:'track',size:1000,codec:'Opus'});
 win=new BrowserWindow({show:false,width:1180,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')log(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`document.querySelector('#room-library').click();document.querySelector('[data-view=settings]').click();document.querySelector('[data-settings-page=library]').click();document.querySelector('[data-action=review-metadata]').click()`);await until(`!!document.querySelector('.library-understanding')`);
 await common('pc');
 await run(`document.querySelector('[data-review-filter=all]').click();const q=document.querySelector('[data-review-search]');q.value='Very last song';q.dispatchEvent(new Event('input',{bubbles:true}));`);assert.equal(await run(`document.querySelectorAll('.review-song').length`),1);assert.ok(await run(`document.querySelector('.review-song').textContent.includes('Very last song')`));await shot('pc-search-last');
 assert.equal(service.lib.tracks.get('song0').metadataLocks?.artist,undefined,'undo restored artist protection');
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#745b9c"/></svg>');return;}try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/?understanding');await until(`!document.querySelector('#opening')`);await pause(500);
 await run(`document.querySelector('#settings').click();document.querySelector('[data-settings-page=library]').click();document.querySelector('[data-action=metadata-review]').click()`);await common('android');
 win.setSize(360,800);await run(`document.querySelector('[data-review-filter=all]').click()`);await shot('android-compact');
 log('PC and Android review: filters, edits, undo, details/back, long titles, end-of-library search and overflow passed.');
}).catch(async e=>{log(e.stack);if(win){log(await run('document.body.innerText.slice(-3000)'));fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());}process.exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(process.exitCode||0);});
