// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/aerial');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'render.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
app.on('window-all-closed',()=>{});
let win,service,exitCode=0;const errors=[];
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');service.server.on('request',(req,res)=>{if(req.url==='/probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#080b14"></body>');}else original(req,res);});
 win=new BrowserWindow({show:false,width:1280,height:800,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);if(e.level==='error'||e.level==='warning')log(e.message);});
 const run=code=>win.webContents.executeJavaScript(code);await win.loadURL(service.url+'/probe');
 await run(fs.readFileSync(path.join(root,'tests/musical-response-audio.js'),'utf8'));
 await run(`(async()=>{
  const {GPUScene}=await import('/gpu-scene.js'),{Reactor}=await import('/reactor.js'),{DEFAULT_PREFERENCES}=await import('/default-preferences.js');
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%';document.body.append(canvas);
  window.gpu=new GPUScene(canvas);await gpu.preparing;if(gpu.failed)throw Error('Shader preparation failed');
  window.reactor=new Reactor({paused:false,currentTime:17});Object.assign(reactor,DEFAULT_PREFERENCES);reactor.appearance={...DEFAULT_PREFERENCES};
  window.d=reactor.visualState(.016);delete d.aerialClock;delete d.aerialActive;delete d.aerialHold;delete d.afterglowClock;delete d.afterglowActive;delete d.afterglowHold;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  // Exercise a populated, changing history rather than a synthetic static backdrop.
  gpu.roadHistoryTrack=d.trackId;for(let i=0;i<128;i++)gpu.roadHistory.update(i/30,Float32Array.from(features.spectrum,(x,k)=>x*(.6+.4*Math.sin(k*.35+i*.055)**2)));
  d.spectrumClock=127/30;
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);

 const report={};
 await run(`
  d.spectrumClock=0;d.artStyle={index:6,opacity:1};d.camera=[0,0,0,0];
  window.advance=(seconds,active=true)=>{d.aerialActive=active;for(let i=0;i<Math.round(seconds*60);i++){d.spectrumClock+=1/60;renderStyle(6);}};
  window.pixels=()=>{const gl=gpu.gl;gpu.bind(null);const data=new Uint8Array(gpu.canvas.width*gpu.canvas.height*4);gl.readPixels(0,0,gpu.canvas.width,gpu.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
  window.difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
  advance(3);void 0;`);
 const shot=async name=>{await new Promise(r=>setTimeout(r,70));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await shot('materials');
 report.glow=await run(`(()=>{const energy=()=>pixels().reduce((s,v,i)=>i%4===3?s:s+v,0);renderStyle(6);const on=energy(),bloom=d.appearance.bloom;d.appearance.bloom=0;renderStyle(6);const off=energy();d.appearance.bloom=bloom;renderStyle(6);return {on,off,ratio:on/off};})()`);
 if(report.glow.ratio<1.03)throw Error('Emissive light has no visible bloom: '+JSON.stringify(report.glow));
 report.geometry=await run(fs.readFileSync(path.join(root,'tests/aerial-surface-probe.js'),'utf8'));
 if(report.geometry.spectralColour<.6||report.geometry.sixthTone<.4||report.geometry.deformation<.12||report.geometry.birthRadius>.0001||report.geometry.deathRadius>.0001||report.geometry.peakRadius<.005||report.geometry.maxRadiusStep>.004)throw Error('Sphere deformation or lifetime continuity failed: '+JSON.stringify(report.geometry));
 report.currents=await run(fs.readFileSync(path.join(root,'tests/aerial-currents-probe.js'),'utf8'));
 if(report.currents.longSessionStep>.002||report.currents.smallAdvance<.0001||report.currents.smallAdvance>.008||report.currents.wrapStep>.003)throw Error('Current phase snaps or does not move: '+JSON.stringify(report.currents));
 report.currentLight=await run(`(()=>{
  const gl=gpu.gl,t=gpu.targets[0],program=gpu.aerialCurrents;
  const draw=percussion=>{const notes=new Float32Array(96).fill(.4);for(let i=0;i<24;i++)notes[i*4+2]=percussion;
   gpu.bind(t);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
   gpu.use(program,{u_studio:[3600,0,1,0],u_currentPhase:new Float32Array(24).fill(1),u_aerialBands:notes});gl.drawArrays(gl.TRIANGLES,0,30*96*6);
   const data=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,data);return data;};
  const a=draw(.30),b=draw(.31);let change=0,energy=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;change+=Math.abs(a[i]-b[i]);energy+=a[i];}
  gl.disable(gl.BLEND);gl.depthMask(true);renderStyle(6);return {relativeChange:change/Math.max(1,energy),energy};
 })()`);
 if(report.currentLight.energy<=0||report.currentLight.relativeChange>.12)throw Error('Small percussion changes flicker the currents: '+JSON.stringify(report.currentLight));
 for(const [name,camera]of [['low',[0,-.46,0,0]],['side',[1.6,.2,0,0]],['high',[-1.5,1.1,0,0]]]){
  const delta=await run(`renderStyle(6);window.before=pixels();d.camera=${JSON.stringify(camera)};renderStyle(6);difference(before,pixels())`);if(delta<2)throw Error('Orbit has no depth: '+name);await shot(name);
 }
 await run(`d.camera=[0,0,0,0];d.appearance.aerialFluid=0;renderStyle(6);`);await shot('solid');
 await run(`d.appearance.aerialFluid=.8;d.roles={bass:.9,drums:0,lead:.8};advance(1);input.features={...input.features,onset:1};d.roles.drums=1;advance(.1);input.features={...input.features,onset:0};d.roles.drums=0;advance(.6);`);await shot('bubble-burst');
 report.transitions=await run(`(()=>{
  const m=gpu.aerialMotion,world=gpu.aerial.positions.slice(),steps=gpu.aerial.steps,phase=m.phase,color=m.palette.slice();d.trackId='aerial-new-song';d.colors=[[.02,.85,.12],[.9,.15,.04],[.05,.35,1.]];renderStyle(6);
  const retained=steps===gpu.aerial.steps&&world.every((x,i)=>x===gpu.aerial.positions[i])&&phase===m.phase;advance(.1);const colorStep=Math.max(...Array.from(m.palette,(x,i)=>Math.abs(x-color[i])));
  advance(3);const changed=difference(before,pixels());advance(1,false);const coasting=m.activity;advance(8,false);const p=m.phase;advance(1,false);const idle=m.phase-p;
  const frozen=m.phase,worldHeld=gpu.aerial.positions.slice();d.aerialHold=true;advance(.1,false);const held=m.phase===frozen&&worldHeld.every((x,i)=>x===gpu.aerial.positions[i]);d.aerialHold=false;
  input.reduced=true;advance(.1);const reduced=m.phase===frozen;input.reduced=false;d.aerialActive=true;return {retained,colorStep,changed,coasting,idle,held,reduced,bursts:m.emitted};
 })()`);
 if(!report.transitions.retained||report.transitions.colorStep>.08||report.transitions.changed<3||report.transitions.coasting<.2||report.transitions.idle<=0||report.transitions.idle>.08||!report.transitions.held||!report.transitions.reduced||report.transitions.bursts<1)throw Error('Aerial transitions are abrupt: '+JSON.stringify(report.transitions));
 await shot('music-colours');
 report.continuity=await run(`(()=>{
  const saved={width:input.width,height:input.height,features:input.features,roles:d.roles};input.width=512;input.height=320;renderStyle(6);
  let previous=pixels(),positions=gpu.aerial.rendered.slice(),hit=gpu.aerialMotion.hit,maxFrame=0,maxBody=0,maxHit=0;
  for(let frame=0;frame<180;frame++){
   const t=frame/60,pulse=t%.48<.035?1:0,center=frame<60?8:frame<120?36:19,spectrum=Float32Array.from({length:48},(_,k)=>.8*Math.exp(-Math.pow((k-center)/3,2)));
   d.roles={bass:.6,lead:.7,drums:pulse};input.features={...saved.features,spectrum,harmonic:spectrum,percussive:Float32Array.from(spectrum,x=>x*pulse),onset:pulse};d.spectrumClock+=1/60;if(frame===60||frame===120)d.trackId='continuity-'+frame;renderStyle(6);
   const next=pixels();maxFrame=Math.max(maxFrame,difference(previous,next));previous=next;
   const m=gpu.aerialMotion,p=gpu.aerial.rendered;maxHit=Math.max(maxHit,Math.abs(m.hit-hit));hit=m.hit;
   for(let j=0;j<gpu.aerial.count;j++){const k=j*4;maxBody=Math.max(maxBody,Math.hypot(p[k]-positions[k],p[k+1]-positions[k+1],p[k+2]-positions[k+2]));}positions.set(p);
  }
  Object.assign(input,saved);d.roles=saved.roles;renderStyle(6);return {maxFrame,maxBody,maxHit};
 })()`);
 if(report.continuity.maxFrame>4||report.continuity.maxBody>.055||report.continuity.maxHit>.09)throw Error('Abrupt musical frame: '+JSON.stringify(report.continuity));
 report.performance=[];
 for(const [name,w,h,quality,mobile]of [['desktop',1280,800,'high',false],['phone',412,915,'eco',true]]){
  win.setSize(w,h);await run(`gpu.mobile=${mobile};input.width=${w};input.height=${h};input.quality='${quality}';d.portraitScene=${mobile};advance(1);`);
  const timings=await run(`(async()=>{const times=[];for(let i=0;i<30;i++){d.spectrumClock+=1/60;const start=performance.now();renderStyle(6);gpu.gl.finish();if(i>5)times.push(performance.now()-start);await new Promise(r=>setTimeout(r,3));}times.sort((a,b)=>a-b);return {medianMs:times[12],p95Ms:times[22],dimensions:[gpu.canvas.width,gpu.canvas.height]};})()`);
  report.performance.push({name,...timings});await shot(name);
 }
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));log('Aerial render checks passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
