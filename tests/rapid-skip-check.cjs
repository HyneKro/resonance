// End-to-end transport regression with a large synthetic library and slow storage.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/rapid-skip');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',path.join(out,'profile'));const log=s=>fs.appendFileSync(path.join(out,'report.log'),s+'\n');fs.writeFileSync(path.join(out,'report.log'),'');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1)}});
let win,service;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=js=>win.webContents.executeJavaScript(js,true);
async function until(js){for(let i=0;i<100;i++){if(await run(js))return;await pause(50)}throw Error('Timed out: '+js)}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 Object.assign(service.lib.config.preferences,{musicOnly:true,motion:true,sfx:false,hdrMode:'off',autoDirection:false,leveling:false,danceCompanion:false});Object.assign(service.lib.config,{autoEnrich:false,autoGenres:false});service.lib.setSetting('config',service.lib.config);
 const wav=Buffer.alloc(44+8000*2*60);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);const file=path.join(out,'fixture.wav');fs.writeFileSync(file,wav);
 const ids=Array.from({length:2600},(_,i)=>'skip-'+i);service.lib.db.exec('BEGIN');
 for(const [i,id]of ids.entries())service.lib.save({id,kind:'track',title:'Song '+i,artist:'Fixture artist',genre:'Electronic',duration:60,path:file,available:true,size:wav.length,codec:'WAV'});
 service.lib.db.exec('COMMIT');service.lib.setSetting('player',{id:ids[0],position:0,volume:.1,queue:ids,queueIndex:0});
 win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);
 await win.loadURL(service.url);await until("document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')");
 if(await run("document.body.classList.contains('library-open')"))await run("document.querySelector('#close-library').click()");
 await run(`window.requestCounts={};window.frameGaps=[];window.probing=true;let previous=performance.now();requestAnimationFrame(function frame(now){if(!probing)return;frameGaps.push(now-previous);previous=now;requestAnimationFrame(frame)});const originalFetch=window.fetch;window.fetch=async(input,options)=>{const route=String(input).split('?')[0];requestCounts[route]=(requestCounts[route]||0)+1;if(route==='/api/listen')await new Promise(r=>setTimeout(r,700));return originalFetch(input,options)};void 0;`);
 const start=Date.now();await run(`(async()=>{for(let i=0;i<25;i++){document.querySelector('#next').click();await new Promise(r=>setTimeout(r,30))}})()`);
 await until("document.querySelector('#now-title').textContent==='Song 25'&&!document.querySelector('audio').paused");
 let result=await run("({counts:requestCounts,gap:Math.max(...frameGaps),title:document.querySelector('#now-title').textContent})");result.elapsed=Date.now()-start;log(JSON.stringify(result));
 assert.equal(result.counts['/api/listen'],1,'One recording switch, despite slow listening-stat writes');assert.ok((result.counts['/api/player']||0)<=2,'No queue-save flood');assert.ok(!result.counts['/api/wallpaper'],'No supplementary image research');assert.ok(result.elapsed<2300,'Slow storage does not block the final selection');assert.ok(result.gap<700,'No multi-second main-thread freeze');
 await run(`(async()=>{for(let i=0;i<10;i++){document.querySelector('#previous').click();await new Promise(r=>setTimeout(r,25))}})()`);
 await until("document.querySelector('#now-title').textContent==='Song 15'");
 await run("document.querySelector('#next').click();document.querySelector('#next').click();document.querySelector('#play').click()");await pause(400);
 assert.equal(await run("document.querySelector('#now-title').textContent"),'Song 15');assert.ok(await run("document.querySelector('audio').paused"));
 // A deliberate song selection supersedes the queued skip.
 await run("document.querySelector('#next').click();const pick=document.createElement('button');pick.dataset.play='skip-3';document.body.append(pick);pick.click();pick.remove()");await until("document.querySelector('#now-title').textContent==='Song 3'");await pause(250);assert.equal(await run("document.querySelector('#now-title').textContent"),'Song 3');
 await run('probing=false');log('PASS: 2600-song library, rapid next/back, delayed persistence, pause and explicit selection.');
}).catch(async e=>{log(e.stack);if(win)log(JSON.stringify(await run("({title:document.querySelector('#now-title')?.textContent,paused:document.querySelector('audio')?.paused,requests:window.requestCounts,toasts:document.querySelector('#toasts')?.textContent})")));process.exitCode=1}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close()}app.exit(process.exitCode||0)});
