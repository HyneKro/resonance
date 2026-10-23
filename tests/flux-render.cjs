// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/flux-orbit');
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
  window.d=reactor.visualState(.016);delete d.fluxClock;delete d.fluxActive;delete d.fluxHold;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  // Exercise a populated, changing history rather than a synthetic static backdrop.
  gpu.historyTrack=d.trackId;for(let i=0;i<gpu.spectrumHistory.height;i++)gpu.spectrumHistory.update(i/30,Float32Array.from(features.spectrum,(x,k)=>x*(.6+.4*Math.sin(k*.35+i*.055)**2)));
  d.spectrumClock=(gpu.spectrumHistory.height-1)/30;
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);
 const report=[],detail={};
 detail.plane=await run(fs.readFileSync(path.join(root,'tests/flux-surface-probe.js'),'utf8'));
 if(Math.abs(detail.plane.baselineHeight+.48)>1e-6||detail.plane.baselineRange>1e-6||detail.plane.pairedDepthError>1e-6||detail.plane.mirrorError>1e-6)throw Error('Flux echo separates from the common plane: '+JSON.stringify(detail.plane));
 detail.controls=await run(`(async()=>{
  const {SceneCamera,installFluxExploreControls}=await import('/scene-camera.js'),{installListeningControls}=await import('/listening-controls.js');
  const room=document.body,controls=document.createElement('div');room.id='listening-room';controls.hidden=true;
  controls.innerHTML='<input type="range" min="0" max="1" step=".01" data-flux-zoom><button data-flux-fit>Fit view</button><div id="volume-panel" hidden></div><button id="volume-details"></button><input id="volume-exact" type="number"><div id="gesture-hud" hidden><span id="gesture-label"></span><span id="gesture-level"></span></div><input id="volume"><input id="room-volume"><input id="precise-volume"><span id="volume-percent"></span><button id="volume-mute"></button><button id="volume-down"></button><button id="volume-up"></button><dialog id="dialog"></dialog>';room.append(controls);
  const controller={camera:new SceneCamera(),artDirection:'flux',rollercoaster:true,cameraZoom:true},audio=Object.assign(new EventTarget(),{volume:.5,muted:false});let fitted=0;
  installFluxExploreControls({reactor:controller,onFit:()=>fitted++});
  installListeningControls({audio,savePlayer:()=>{},nextTrack:()=>{},safe:fn=>fn,libraryOpen:()=>{},icon:()=>''});
  const slider=controls.querySelector('input');slider.value='.6';slider.dispatchEvent(new Event('input',{bubbles:true}));const sliderWorks=controller.camera.exploreTarget===.6;
  document.body.classList.add('visual-settings-open');const wheel=new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true});gpu.canvas.dispatchEvent(wheel);
  const wheelVolumeWorks=wheel.defaultPrevented&&audio.volume===.52,wheelPreservesZoom=controller.camera.exploreTarget===.6;document.body.classList.remove('visual-settings-open');
  controls.querySelector('[data-flux-fit]').click();const fitWorks=controller.camera.exploreTarget===0&&!controller.rollercoaster&&!controller.cameraZoom&&fitted===1;controller.artDirection='astra';gpu.canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:-100,bubbles:true,cancelable:true}));const isolated=controller.camera.exploreTarget===0&&audio.volume===.54;controls.remove();room.removeAttribute('id');return {sliderWorks,wheelVolumeWorks,wheelPreservesZoom,fitWorks,isolated};
 })()`);
 if(Object.values(detail.controls).some(x=>!x))throw Error('Flux exploration controls failed: '+JSON.stringify(detail.controls));
 await run(`window.sampleSpectrum=t=>Float32Array.from({length:48},(_,k)=>{
  let x=0;for(const [band,speed]of [[7,.8],[18,-.4],[30,.6],[41,-.7]])x+=(.30+.30*Math.sin(t*speed+band)**2)*Math.exp(-Math.pow((k-band-Math.sin(t*speed)*2)/2.6,2));
  return Math.min(.9,x);
 });gpu.spectrumHistory.reset();gpu.historyTrack=d.trackId;
 for(let i=0;i<gpu.spectrumHistory.height;i++)gpu.spectrumHistory.update(i/30,sampleSpectrum(i/30));
 d.spectrumClock=(gpu.spectrumHistory.height-1)/30;input.features={...input.features,spectrum:sampleSpectrum((gpu.spectrumHistory.height-1)/30)};input.time=12;d.roles={bass:.55,lead:.5,drums:.45,texture:.2};
 window.measure=()=>{const gl=gpu.gl,t=gpu.targets[0];gpu.bind(t);const p=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,p);let sum=0,edge=0,lit=0;for(let i=0;i<p.length;i+=4){const e=p[i]+p[i+1]+p[i+2],x=(i/4)%t.w,y=Math.floor(i/4/t.w);if(!Number.isFinite(e))throw Error('Nonfinite Flux');sum+=e;if(e>.025)lit++;if(x<2||y<2||x>=t.w-2||y>=t.h-2)edge+=e;}return {sum,lit,edgeFraction:edge/Math.max(sum,.001)};};void 0;`);
 for(const [name,camera]of [['front',[0,0,0,0]],['quarter',[.6,.38,0,0]],['side',[Math.PI/2,0,0,0]],['rear',[Math.PI,0,0,0]],['top',[0,Math.PI/2,0,0]],['below',[.5,-Math.PI/2,0,0]],['zoom',[.8,.6,-3.7,.1]]]){
  await run(`d.camera=${JSON.stringify(camera)};d.appearance.particleSpread=${name==='zoom'?1.6:1.15};d.cameraFocalLength=${name==='zoom'?1.23:1.9};renderStyle(5);`);
  const metrics=await run('measure()');if(metrics.lit<450||metrics.edgeFraction>.035)throw Error('Flux framing '+name+': '+JSON.stringify(metrics));report.push({name,...metrics});
  await new Promise(r=>setTimeout(r,65));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await run(`d.camera=[.6,.38,0,0];d.appearance.particleSpread=1.15;d.cameraFocalLength=1.9;renderStyle(5);window.fixed=measure();window.fixedHistory=gpu.spectrumHistory.data.slice();window.fixedHead=gpu.spectrumHistory.head;input.time+=300;gpu.draw(input);if(Math.abs(measure().sum-fixed.sum)>.01||fixedHistory.some((v,i)=>v!==gpu.spectrumHistory.data[i])||fixedHead!==gpu.spectrumHistory.head)throw Error('Flux reads wall time while paused');`);
 detail.transitions=await run(`(()=>{
  const advance=(seconds,active)=>{d.fluxActive=active;for(let i=0;i<seconds*60;i++){d.spectrumClock+=1/60;renderStyle(5);}};
  advance(2,true);const m=gpu.fluxMotion,start=m.activity,phase=m.phase;advance(1,false);const afterOne=m.activity;advance(5,false);const settled=m.activity,idle=m.phase;advance(1,false);const idleTravel=m.phase-idle;
  const h=gpu.spectrumHistory,history=h.data.slice(),head=h.head,palette=m.palette.slice();d.trackId='flux-transition-track';renderStyle(5);const trackRetained=head===h.head&&history.every((x,i)=>x===h.data[i]);
  d.colors=[[.9,.15,.03],[.8,.02,.3],[.8,.3,.05]];advance(.1,true);let colorStep=0;for(let i=0;i<18;i++)colorStep=Math.max(colorStep,Math.abs(m.palette[i]-palette[i]));
  delete d.fluxActive;return {start,afterOne,settled,idleTravel,phaseAdvanced:m.phase>phase,trackRetained,colorStep};
 })()`);
 if(detail.transitions.afterOne<=.1||detail.transitions.settled>.01||detail.transitions.idleTravel<=.04||!detail.transitions.trackRetained||detail.transitions.colorStep>.15)throw Error('Flux playback transition is abrupt: '+JSON.stringify(detail.transitions));
 await run('d.fluxZoom=.88;renderStyle(5)');await new Promise(r=>setTimeout(r,65));fs.writeFileSync(path.join(out,'inside.png'),(await win.webContents.capturePage()).toPNG());
 detail.explore=await run('measure()');if(detail.explore.lit<100)throw Error('Flux particle exploration is blank');await run('d.fluxZoom=0;renderStyle(5)');
 detail.debris=await run(`(()=>{
  const gl=gpu.gl,h=gpu.spectrumHistory,stored=h.data.slice(),head=h.head,draw=gl.drawArrays.bind(gl);
  gl.drawArrays=(mode,first,count)=>{const program=gl.getParameter(gl.CURRENT_PROGRAM);if(program===gpu.fluxTrace.program)return;if(program===gpu.fluxPoints.program&&gl.getUniform(program,gpu.location(gpu.fluxPoints,'u_layer'))!==1)return;draw(mode,first,count);};
  const fill=(start,end)=>{h.head=0;h.data.fill(0);for(let r=start;r<end;r++)h.data.fill(230,((h.height-r)%h.height)*48,((h.height-r)%h.height+1)*48);gpu.historyVersion=-1;renderStyle(5);return measure().sum;};
  let recent,older;try{recent=fill(0,10);older=fill(58,88);}finally{gl.drawArrays=draw;h.data.set(stored);h.head=head;gpu.historyVersion=-1;renderStyle(5);}
  return {recent,older};
 })()`);
 if(detail.debris.recent>.001||detail.debris.older<1)throw Error('Fragments must follow the wave: '+JSON.stringify(detail.debris));
 detail.glow=await run(`(()=>{
  const gl=gpu.gl,energy=()=>{gpu.bind(null);const p=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,p);return p.reduce((s,v,i)=>i%4===3?s:s+v,0);};
  renderStyle(5);const on=energy(),saved=d.appearance.bloom;d.appearance.bloom=0;renderStyle(5);const off=energy();d.appearance.bloom=saved;renderStyle(5);return {on,off,ratio:on/off};
 })()`);
 if(detail.glow.ratio<1.08)throw Error('Flux halo is too restrained: '+JSON.stringify(detail.glow));
 await run(`window.backgroundEnergy=()=>{const t=gpu.targets[3],gl=gpu.gl;gpu.bind(t);const p=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,p);return p.reduce((sum,v,i)=>i%4===3?sum:sum+v,0);};window.backLit=backgroundEnergy();d.appearance.orbit=0;renderStyle(5);if(!(backgroundEnergy()<backLit))throw Error('Orbiting dust setting ignored');`);
 detail.blackBackground=await run('backgroundEnergy()');if(detail.blackBackground!==0)throw Error('Flux background is tinted');
 detail.oldHistory=await run(`(()=>{
  const h=gpu.spectrumHistory,tone=new Float32Array(48).fill(.8),zero=new Float32Array(48);h.reset();h.update(0,tone);
  for(let i=1;i<=390;i++)h.update(i/30,i<15?tone:zero);d.spectrumClock=13;input.features={...input.features,spectrum:zero};renderStyle(5);return {seconds:13,height:h.height,...measure()};
 })()`);
 if(detail.oldHistory.height!==512||detail.oldHistory.lit<150)throw Error('Older frequency trail disappears: '+JSON.stringify(detail.oldHistory));
 await run(`input.features={...input.features,spectrum:new Float32Array(48)};gpu.spectrumHistory.reset();d.spectrumClock=0;renderStyle(5);if(measure().sum>.001)throw Error('Flux invents sound');`);
 // Portrait keeps its existing landscape composition; audit the real rotated canvas.
 win.setSize(412,915);await run(`gpu.mobile=true;input.width=412;input.height=915;input.quality='auto';d.portraitScene=true;d.appearance.orbit=2;gpu.spectrumHistory.reset();for(let i=0;i<gpu.spectrumHistory.height;i++)gpu.spectrumHistory.update(i/30,sampleSpectrum(i/30));d.spectrumClock=(gpu.spectrumHistory.height-1)/30;input.features={...input.features,spectrum:sampleSpectrum((gpu.spectrumHistory.height-1)/30)};renderStyle(5);`);
 await new Promise(r=>setTimeout(r,100));await run('renderStyle(5)');await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'phone.png'),(await win.webContents.capturePage()).toPNG());
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({angles:report,...detail,pausedStable:true,silentSpectrumEmpty:true,dustControl:true},null,2));log('Flux orbit review passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
