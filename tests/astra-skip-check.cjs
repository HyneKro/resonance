// Actual transport, live analyser and renderer. No personal library or audible output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/astra-skip');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(out,'profile-')));
let win,service,code=0;const wait=ms=>new Promise(r=>setTimeout(r,ms)),run=js=>win.webContents.executeJavaScript(js,true);
const log=s=>fs.appendFileSync(path.join(out,'report.log'),s+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')throw e;});
async function until(js){for(let i=0;i<400;i++){if(await run(js))return;await wait(100);}throw Error('Timed out: '+js);}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 Object.assign(service.lib.config.preferences,{artDirection:'astra',musicOnly:false,motion:true,quality:'high',targetFPS:'60',sfx:false,hdrMode:'off',autoDirection:true,leveling:false,danceCompanion:false,rollercoaster:false,cameraZoom:false});
 Object.assign(service.lib.config,{autoEnrich:false,autoGenres:false});service.lib.setSetting('config',service.lib.config);
 const ids=['astra-tone-0','astra-tone-1','astra-tone-2'];
 for(const [index,id]of ids.entries()){
  const rate=16000,seconds=30,wav=Buffer.alloc(44+rate*seconds*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
  for(let i=0;i<rate*seconds;i++){const t=i/rate,beat=Math.exp(-(t%.48)*22),value=(Math.sin(t*Math.PI*2*(60+index*30))*beat*.65+Math.sin(t*Math.PI*2*(330+index*550))*.19);wav.writeInt16LE(Math.round(value*22000),44+i*2);}
  const file=path.join(out,id+'.wav');fs.writeFileSync(file,wav);
  service.lib.save({id,kind:'track',title:id,artist:'Generated regression fixture',genre:'Electronic',duration:seconds,path:file,size:wav.length,available:true,codec:'WAV'});
  service.lib.setSetting('audioProfile:'+id,{version:1,stamp:[file,wav.length,undefined,seconds].join('|'),duration:seconds,step:1,integratedLufs:-16,truePeakDb:-2,timeline:Array.from({length:seconds},(_,i)=>[i,-18,.3+index*.25,.2+index*.2,.6])});
 }
 service.lib.setSetting('player',{id:ids[0],position:0,volume:.15,queue:ids,queueIndex:0});
 win=new BrowserWindow({show:false,width:1100,height:720,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);
 await win.loadURL(service.url);await until("document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')");
 if(await run("document.body.classList.contains('library-open')"))await run("document.querySelector('#close-library').click()");
 await run(`(async()=>{
  const {GPUScene}=await import('/gpu-scene.js');window.frames=[];window.skips=[];window.longTasks=[];new PerformanceObserver(list=>longTasks.push(...list.getEntries().map(e=>({start:e.startTime,duration:e.duration})))).observe({entryTypes:['longtask']});
  const draw=GPUScene.prototype.draw;GPUScene.prototype.draw=function(input){
   const ok=draw.call(this,input);if(ok&&input.dynamics.artStyle.index===3){const a=this.astra;frames.push({now:performance.now(),time:a.time,phase:a.state[0],orbit:Array.from(a.orbits).filter((_,i)=>i%4===0),echo:Array.from(a.echoes),spread:input.dynamics.appearance.particleSpread,movement:input.dynamics.appearance.motionAmount,comets:a.comets.map(c=>c.birth),track:input.dynamics.trackId});}return ok;
  };
  if(document.querySelector('audio').paused)document.querySelector('#dock-play').click();
 })()`);
 await until('frames.length>120');await wait(2500);
 if(process.env.ASTRA_PROFILE){win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Profiler.enable');await win.webContents.debugger.sendCommand('Profiler.start');}
 for(let i=1;i<3;i++){
  await run("skips.push(performance.now());document.querySelector('#room-next').click()");
  await until(`document.querySelector('#now-title').textContent==='${ids[i]}'&&!document.querySelector('audio').paused`);await wait(5200);
 }
 if(process.env.ASTRA_PROFILE){const {profile}=await win.webContents.debugger.sendCommand('Profiler.stop');fs.writeFileSync(path.join(out,'skip.cpuprofile'),JSON.stringify(profile));win.webContents.debugger.detach();}
 const result=await run(`(()=>{
  const r={frames:frames.length,tracks:[...new Set(frames.map(f=>f.track))],maxGap:0,maxPhase:0,maxOrbit:0,maxEcho:0,maxSpread:0,maxMovement:0,maxCometChanges:0,stalls:[],longTasks};
  for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i];if(!skips.some(s=>b.now>s&&b.now<s+5200))continue;
   r.maxGap=Math.max(r.maxGap,b.now-a.now);if(b.now-a.now>100)r.stalls.push({start:a.now,duration:b.now-a.now,afterSkip:b.now-skips.filter(s=>s<b.now).at(-1),track:b.track});r.maxPhase=Math.max(r.maxPhase,Math.abs(b.phase-a.phase));r.maxOrbit=Math.max(r.maxOrbit,...b.orbit.map((v,k)=>Math.abs(v-a.orbit[k])));r.maxEcho=Math.max(r.maxEcho,...b.echo.map((v,k)=>Math.abs(v-a.echo[k])));r.maxSpread=Math.max(r.maxSpread,Math.abs(b.spread-a.spread));r.maxMovement=Math.max(r.maxMovement,Math.abs(b.movement-a.movement));
   if(b.time<a.time)throw Error('Scene clock reset after skip');
   if(a.comets.length===6)r.maxCometChanges=Math.max(r.maxCometChanges,b.comets.filter((v,k)=>v!==a.comets[k]).length);
  }return r;
 })()`);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));log(JSON.stringify(result));
 assert.ok(result.frames>500);assert.equal(result.tracks.length,3);
 assert.ok(result.maxGap<400,'Post-skip rendering must not stall');
 assert.ok(result.maxPhase<.025&&result.maxOrbit<.09,'Orbital phase stays continuous');
 assert.ok(result.maxEcho<.35&&result.maxSpread<.035&&result.maxMovement<.04,'No single-frame geometry/pulse replacement after source or late profile changes');
 assert.ok(result.maxCometChanges<=1,'Live trails retain their particle slots');
 log('PASS: live generated audio, two source changes, first five seconds after each skip.');
}).catch(e=>{code=1;log(e.stack);}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(code);});
setTimeout(()=>app.exit(2),150000).unref();
