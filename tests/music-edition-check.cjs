const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/music-edition/ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'report.log'),String(s)+'\n');fs.writeFileSync(path.join(out,'report.log'),'');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code,true);
async function until(code){for(let i=0;i<300;i++){if(await run(code))return;await pause(100)}throw Error('Timed out '+code);}
async function shot(name){await pause(800);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());}
async function layout(name){
 await pause(600);const data=await run(`(()=>{
 const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height}},stage=rect('#music-only-stage'),dock=rect('.room-dock'),copy=rect('.edition-copy');
 const scrollable=[...document.querySelectorAll('#music-only-stage,#music-only-stage *')].filter(n=>/auto|scroll/.test(getComputedStyle(n).overflowY)&&n.scrollHeight>n.clientHeight+1).map(n=>n.className);
 return {stage,dock,copy,scrollable,overflow:document.documentElement.scrollWidth>innerWidth+2,title:getComputedStyle(document.querySelector('#music-only-title')).whiteSpace,art:rect('.edition-art'),detail:rect('.edition-details')};})()`);
 log(name+': '+JSON.stringify(data));await shot(name);
 assert.equal(data.overflow,false,name+' horizontal overflow');assert.equal(data.title,'normal');
 assert.deepEqual(data.scrollable,[],name+' has no scrolling composition');
 assert.ok(data.stage.bottom<=data.dock.top+2||data.stage.right<=data.dock.left,name+' clears playback dock');assert.ok(data.stage.height>100,name+' has usable space');
 assert.ok(data.copy.top>=data.stage.top-1&&data.copy.bottom<=data.stage.bottom+1,name+' text and actions fit');
 assert.ok(data.detail.top>=data.stage.top&&data.detail.bottom<=data.stage.bottom+1,name+' details stays reachable');
}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off',autoDirection:false,leveling:false,danceCompanion:false});Object.assign(service.lib.config,{autoEnrich:false,autoGenres:false});service.lib.setSetting('config',service.lib.config);
 const art='89e987ed6bc62e3ba8afe7d6.webp';
 // The optional reference cover is read only; fixture data never enters a release.
 const dataDir=fs.readdirSync(out).filter(n=>n.startsWith('data-')).sort((a,b)=>fs.statSync(path.join(out,b)).birthtimeMs-fs.statSync(path.join(out,a)).birthtimeMs)[0];fs.mkdirSync(path.join(out,dataDir,'artwork'),{recursive:true});
 const bytes=process.env.RESONANCE_TEST_COVER?fs.readFileSync(process.env.RESONANCE_TEST_COVER):Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDCkAAAAASUVORK5CYII=','base64');fs.writeFileSync(path.join(out,dataDir,'artwork',art),bytes);
 const wav=Buffer.alloc(44+8000*2*30);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);fs.writeFileSync(path.join(out,'fixture.wav'),wav);
 const track={id:'edition-a',kind:'track',title:'Millennium',artist:'Tarro & Elley Duhé',genre:'Electronic',album:'Millennium',date:'2016',duration:30,path:path.join(out,'fixture.wav'),available:true,size:wav.length,codec:'AAC',artwork:art,sampleRate:44100};service.lib.save(track);service.lib.save({...track,id:'edition-b',title:'The next chapter',artist:'Another artist'});service.lib.setSetting('player',{id:track.id,position:10,volume:.4,queue:[track.id,'edition-b'],queueIndex:0});
 win=new BrowserWindow({show:false,width:1600,height:1000,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);
 win.webContents.on('console-message',e=>{if(e.level==='error')log('CONSOLE '+e.message)});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')&&document.querySelector('.edition-copy')`);
 if(await run(`document.body.classList.contains('library-open')`))await run(`document.querySelector('#close-library').click()`);
 await layout('desktop');assert.equal(await run(`document.querySelector('#music-only-title').textContent`),'Millennium');
 assert.equal(await run(`document.querySelector('.edition-next').hidden`),false);
 await run(`document.querySelector('.edition-details').click()`);await until(`document.querySelector('#dialog').open`);await run(`document.querySelector('#dialog').close()`);
 await run(`document.querySelector('.edition-next').click()`);await until(`document.querySelector('#dialog').open`);await run(`document.querySelector('#dialog').close()`);
 for(const [w,h]of [[1280,800],[1024,650],[900,560],[800,500],[1280,500],[480,720]]){win.setSize(w,h);await layout('desktop-'+w)}
 win.setSize(1600,1000);
 // Use the same production component for additional design edge cases.
 await run(`(async()=>{const {installMusicEdition}=await import('/music-edition.js');window.editionMotion=true;window.editionProbe=installMusicEdition({motion:()=>window.editionMotion});editionProbe.select({id:'jazz',title:'The shape of a quiet evening',artist:'A small jazz ensemble',album:'After hours',genre:'Jazz',date:'2024',artwork:'${art}'});})()`);await layout('editorial');
 await run(`editionProbe.select({id:'long',title:'An exceptionally long title / with multiple movements, guest performers & a live recording (extended edition)',artist:'An artist with a very long name, and another collaborator',genre:'Rock',album:'A longer album title',date:'2020'});document.querySelector('#music-only-cover').replaceChildren()`);win.setSize(1024,650);await layout('long-title');
 await run("document.documentElement.style.setProperty('--ui-text-scale','1.3')");
 for(const [w,h]of [[800,500],[480,720],[1280,500]]){win.setSize(w,h);await layout('large-long-'+w)}
 win.setSize(1600,1000);await run("document.documentElement.style.setProperty('--ui-text-scale','1')");
 // Automatic independent motion, with no pointer-dependent state or supplemental artwork.
 await pause(800);
 const planes=await run("['.edition-frame','.edition-disc','.edition-fragment','.edition-memory','.edition-backprint'].map(s=>getComputedStyle(document.querySelector(s)).translate)");
 await pause(1000);const moved=await run("['.edition-frame','.edition-disc','.edition-fragment','.edition-memory','.edition-backprint'].map(s=>getComputedStyle(document.querySelector(s)).translate)");
 assert.notDeepEqual(planes,moved,'Layers move with no pointer input');assert.equal(new Set(moved).size,5,'Planes drift independently');
 await run("window.editionMotion=false;editionProbe.boundaries()");await pause(50);assert.equal(await run("getComputedStyle(document.querySelector('.edition-fragment')).animationName"),'none','Reduced motion is still');await run("window.editionMotion=true;editionProbe.boundaries()");
 await run("document.querySelectorAll('.edition-drifting *').forEach(n=>n.getAnimations().forEach(a=>a.pause()))");
 const still=await run("getComputedStyle(document.querySelector('.edition-frame')).translate");await run("document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:innerWidth-10,clientY:20,pointerType:'mouse'}))");await pause(100);
 assert.equal(await run("getComputedStyle(document.querySelector('.edition-frame')).translate"),still,'Pointer does not move artwork');
 await run(`(async()=>{window.extraArtworkCalls=0;const {installMusicEdition}=await import('/music-edition.js');const p=installMusicEdition({related:()=>{extraArtworkCalls++;return [{artwork:'unrelated.webp'}]},assets:async()=>{extraArtworkCalls++;return [{file:'portrait.webp'}]}});p.select({id:'cover-only',title:'Cover only',artwork:'${art}'});})()`);await pause(100);
 assert.equal(await run('extraArtworkCalls'),0);assert.ok(await run(`[...document.querySelectorAll('.edition-fragment img,.edition-memory img')].every(i=>i.src.endsWith('${art}'))`));
 assert.equal(await run("document.querySelector('#edition-credits-panel')"),null);
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/webp');res.end(bytes);return;}
 let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);try{let data=fs.readFileSync(file);if(name==='test-native.js')data=Buffer.from(data.toString().replace("case'library':","case'lyricsCached':value={track:tracks.find(t=>t.id===data.id),record:null};break;case'library':"));if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port);await until(`!document.querySelector('#opening')&&document.querySelector('.edition-copy')`);await layout('phone');
 await run(`document.querySelector('.edition-details').click()`);await until(`document.querySelector('#sheet').open`);await run(`document.querySelector('#sheet').close()`);
 for(const [w,h]of [[360,740],[360,640],[800,360]]){win.setSize(w,h);await layout('phone-'+w+'-'+h)}
 await run("(async()=>{const {installMusicEdition}=await import('/music-edition.js');const p=installMusicEdition({mobile:true});p.select({id:'long-mobile',title:'An exceptionally long song title with multiple movements and an extended edition',artist:'An ensemble and several collaborating artists',genre:'Rock'});document.documentElement.style.setProperty('--ui-text-scale','1.3');})()");
 for(const [w,h]of [[360,640],[360,740],[412,915],[800,360]]){win.setSize(w,h);await layout('phone-large-long-'+w+'-'+h)}
 win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/?no-cover');await until(`!document.querySelector('#opening')`);await layout('phone-no-cover');
 assert.equal(await run(`document.querySelector('#music-only-stage').classList.contains('edition-no-art')`),true);
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/?empty');await until(`!document.querySelector('#opening')`);await run(`document.querySelector('#music-only').click()`);await pause(200);assert.equal(await run(`getComputedStyle(document.querySelector('#music-only-stage')).display`),'none');
 log('PASS: desktop/phone, compact/landscape, preserved details/queue actions, long names, missing artwork, empty library, cover-only images, automatic drift and reduced motion.');
}).catch(async e=>{log(e.stack);if(win)await shot('failure').catch(()=>{});process.exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(process.exitCode||0)});
