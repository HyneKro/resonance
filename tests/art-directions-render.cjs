// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/art-directions');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'render.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
app.on('window-all-closed',()=>{});
let win,service,exitCode=0;const errors=[];
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');service.server.on('request',(req,res)=>{if(req.url==='/probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#080b14"></body>');}else original(req,res);});
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);if(e.level==='error'||e.level==='warning')log(e.message);});
 const run=code=>win.webContents.executeJavaScript(code);await win.loadURL(service.url+'/probe');
 await run(fs.readFileSync(path.join(root,'tests/musical-response-audio.js'),'utf8'));
 await run(`(async()=>{
  const {GPUScene}=await import('/gpu-scene.js'),{Reactor}=await import('/reactor.js'),{DEFAULT_PREFERENCES}=await import('/default-preferences.js');
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%';document.body.append(canvas);
  window.gpu=new GPUScene(canvas);await gpu.preparing;if(gpu.failed)throw Error('Shader preparation failed');
  window.reactor=new Reactor({paused:false,currentTime:17});Object.assign(reactor,DEFAULT_PREFERENCES);reactor.appearance={...DEFAULT_PREFERENCES};
  window.d=reactor.visualState(.016);delete d.astraClock;delete d.astraActive;delete d.contourClock;delete d.contourActive;delete d.contourHold;delete d.synapseClock;delete d.synapseActive;delete d.synapseHold;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  // Exercise a populated, changing history rather than a synthetic static backdrop.
  gpu.historyTrack=d.trackId;for(let i=0;i<128;i++)gpu.spectrumHistory.update(i/30,Float32Array.from(features.spectrum,(x,k)=>x*(.6+.4*Math.sin(k*.35+i*.055)**2)));
  d.spectrumClock=127/30;
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);
 for(const [index,name]of ['resonance','noctiluca','afterglow','astra','contour','flux','aerial','synapse'].entries()){
  await run(`renderStyle(${index})`);await new Promise(r=>setTimeout(r,120));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 for(const [style,name]of [[1,'noctiluca'],[2,'afterglow'],[3,'astra'],[4,'contour'],[5,'flux'],[6,'aerial'],[7,'synapse']]){
  for(const [phase,time,level]of [['quiet',4,0],['attack',4,.9],['later',16,.5]]){
   await run(`window.savedRoles??=d.roles;input.time=${time};d.roles={bass:${level},lead:${level},drums:${level},texture:${level},shimmer:${level}};renderStyle(${style})`);
   await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,name+'-'+phase+'.png'),(await win.webContents.capturePage()).toPNG());
  }
 }await run('d.roles=savedRoles');
 for(const [name,shade,fluid]of [['aerial-dark',1,.8],['aerial-solid',.25,0]]){
  await run(`d.appearance.aerialShade=${shade};d.appearance.aerialFluid=${fluid};gpu.aerial.reset();d.spectrumClock=0;renderStyle(6);for(let i=1;i<=180;i++){d.spectrumClock=i/60;renderStyle(6);}`);
  await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }await run(`d.appearance.aerialShade=0;d.appearance.aerialFluid=.8;`);
 // Follow an actual single-point attack through the moving neural volume.
 await run(`window.webSaved={features:input.features,roles:d.roles,clock:d.spectrumClock};gpu.synapse.reset();d.spectrumClock=0;d.roles={bass:.35,lead:.4,drums:0,texture:.15};input.features={...webSaved.features,onset:0,loudness:.6};renderStyle(7);`);
 for(const [name,seconds]of [['synapse-signal',.55],['synapse-propagated',.55]]){
  await run(`for(let i=0;i<Math.round(${seconds}*60);i++){d.spectrumClock+=1/60;input.features={...input.features,onset:d.spectrumClock<.06?1:0};renderStyle(7);}`);
  await new Promise(r=>setTimeout(r,70));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await run(`input.features=webSaved.features;d.roles=webSaved.roles;d.spectrumClock=webSaved.clock;`);
 // Review actual evolving brushwork, not only role changes on a frozen sheet.
 await run(`window.inkSaved={features:input.features,roles:d.roles,clock:d.spectrumClock};gpu.contour.reset();d.spectrumClock=0;renderStyle(4);`);
 for(const [name,seconds]of [['contour-painted',3],['contour-reveal',10.5],['contour-scroll',5],['contour-diamond',17]]){
  await run(`for(let i=0;i<Math.round(${seconds}*60);i++){
   d.spectrumClock+=1/60;const t=d.spectrumClock,hit=t%(.5)<.055?.85:0;
   d.roles={bass:.38+.25*Math.sin(t*2),lead:.48+.20*Math.sin(t*1.2),drums:hit,texture:.2};
   input.features={...inkSaved.features,onset:hit,loudness:.6};
   gpu.contour.update(t,{onset:hit,drums:hit,energy:.6,colors:d.colors,spectrum:input.features.spectrum});if(i%30===0)renderStyle(4);
  }renderStyle(4);`);
  await new Promise(r=>setTimeout(r,60));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 await run(`input.features=inkSaved.features;d.roles=inkSaved.roles;d.spectrumClock=inkSaved.clock;`);
 // Advance consecutive Aerial frames using the same music clock as the app.
 await run(`window.aerialSaved={clock:d.spectrumClock,roles:d.roles,features:input.features};gpu.aerial.reset();d.spectrumClock=0;renderStyle(6);
 for(let i=1;i<=1200;i++){d.spectrumClock=i/60;const t=i/60,hit=t%.5<.06?.9:0;d.roles={bass:.4+.3*Math.sin(t*2),drums:hit,lead:.6};input.features={...aerialSaved.features,onset:hit};gpu.aerial.update(t,{...d.roles,onset:hit});}renderStyle(6);`);
 await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'aerial-motion.png'),(await win.webContents.capturePage()).toPNG());
 await run(`d.spectrumClock=aerialSaved.clock;d.roles=aerialSaved.roles;input.features=aerialSaved.features;`);

 await run(`window.desktopInput={width:input.width,height:input.height,quality:input.quality};gpu.mobile=true;input.width=412;input.height=915;input.quality='auto';d.portraitScene=true;renderStyle(4);`);
 win.setSize(412,915);await new Promise(r=>setTimeout(r,80));await run('renderStyle(4)');await new Promise(r=>setTimeout(r,60));fs.writeFileSync(path.join(out,'contour-phone.png'),(await win.webContents.capturePage()).toPNG());
 await run('renderStyle(1)');await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(out,'noctiluca-phone.png'),(await win.webContents.capturePage()).toPNG());
 await run('renderStyle(3)');await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(out,'astra-phone.png'),(await win.webContents.capturePage()).toPNG());
 await run('renderStyle(7)');await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(out,'synapse-phone.png'),(await win.webContents.capturePage()).toPNG());
 await run('renderStyle(6)');await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(out,'aerial-phone.png'),(await win.webContents.capturePage()).toPNG());
 win.setSize(1440,1000);await run(`Object.assign(input,desktopInput);d.portraitScene=false;gpu.mobile=false;`);
 const result=await run(`(async()=>{
  const report=[];gpu.mobile=true;input.width=412;input.height=915;input.quality='eco';d.portraitScene=true;
  const gl=gpu.gl;let current='',counts={};const use=gpu.use.bind(gpu),draw=gl.drawArrays.bind(gl),instanced=gl.drawArraysInstanced.bind(gl);
  gpu.use=(p,u)=>{current=Object.keys(gpu).find(k=>gpu[k]===p)||'?';use(p,u);};gl.drawArrays=(mode,start,count)=>{counts[current]=(counts[current]||0)+count;draw(mode,start,count);};gl.drawArraysInstanced=(mode,start,count,instances)=>{counts[current]=(counts[current]||0)+count*instances;instanced(mode,start,count,instances);};
  for(let style=0;style<=7;style++){
   const samples=[];for(let i=0;i<45;i++){counts={};input.time+=1/60;if(style===1||style===2||style===5||style===7)d.spectrumClock+=1/60;const start=performance.now();renderStyle(style);gl.finish();if(i>10)samples.push(performance.now()-start);await new Promise(r=>setTimeout(r,5));}
   samples.sort((a,b)=>a-b);if(style&&counts.flowUpdate)throw Error('Invisible original simulation');report.push({style,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],vertices:{...counts},dimensions:[gpu.canvas.width,gpu.canvas.height]});
  }
  // Verify the actual render targets, not only shader source or controls.
  function energy(targetIndex=0){const target=gpu.targets[targetIndex];gpu.bind(target);const pixels=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);let sum=0;for(let i=0;i<pixels.length;i+=4){if(!Number.isFinite(pixels[i]+pixels[i+1]+pixels[i+2]))throw Error('Nonfinite radiance');sum+=pixels[i]+pixels[i+1]+pixels[i+2];}return sum;}
  function coverage(){const target=gpu.targets[0];gpu.bind(target);const pixels=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);let sum=0;for(let i=3;i<pixels.length;i+=4)sum+=pixels[i];return sum;}
  for(let style=1;style<=7;style++){
   const settle=()=>{if(style===3||style===4||style===7)for(let i=0;i<35;i++){d.spectrumClock+=.1;renderStyle(style);}};d.spectrumLight.fill(0);settle();renderStyle(style);const dark=energy();renderStyle(style);if(Math.abs(energy()-dark)>.01)throw Error('Paused scene changes');
   d.spectrumLight.fill(.6);settle();renderStyle(style);const bright=energy();if(!(dark>0&&bright>dark))throw Error('Spectrum does not illuminate style '+style);
   if(style===1){
    const savedClock=d.spectrumClock,savedCamera=d.camera,savedFeatures=input.features,savedTrack=d.trackId;
    const fixed=gpu.school.texture.slice(),steps=gpu.school.steps;
    renderStyle(1);if(gpu.school.steps!==steps||fixed.some((v,i)=>v!==gpu.school.texture[i]))throw Error('Paused school moved');
    input.reduced=true;d.spectrumClock+=.1;renderStyle(1);if(gpu.school.steps!==steps)throw Error('Reduced school swims');input.reduced=false;
    const before=energy();for(let i=0;i<30;i++){d.spectrumClock+=1/30;renderStyle(1);}if(Math.abs(energy()-before)<1)throw Error('School lacks visible motion');
    const back=energy(3);d.appearance.oceanRays=0;renderStyle(1);if(!(energy(3)<back))throw Error('Sun shafts control has no effect');d.appearance.oceanRays=1;
    const original=energy();d.camera=[.3,-.2,0,0];renderStyle(1);if(Math.abs(energy()-original)<1)throw Error('Ocean camera lacks depth');
    d.trackId='ocean-new-track';renderStyle(1);if(gpu.school.phase!==0)throw Error('New track retains old school state');
    if(gpu.canvas.width>=gpu.canvas.height)throw Error('Ocean phone orientation is sideways');
    d.spectrumClock=savedClock;d.camera=savedCamera;input.features=savedFeatures;d.trackId=savedTrack;renderStyle(1);
    Object.assign(report[style],{schoolFrozen:true,reducedMotionHeld:true,schoolSwims:true,sunShaftControl:true,trackResets:true,cameraDepth:true,uprightPhone:true});
   }
   if(style===4){
    const fixed=gpu.contour.time,savedCamera=d.camera,savedRotation=d.rotationClock;
    const rendered=energy();d.camera=[1.2,-.8,.7,2];d.rotationClock=40;renderStyle(4);
    if(Math.abs(energy()-rendered)>.01)throw Error('Contour is not flat');
    d.camera=savedCamera;d.rotationClock=savedRotation;
    if(gpu.contour.time!==fixed)throw Error('Paused ink ages');
    const savedClock=d.spectrumClock;input.reduced=true;d.spectrumClock+=.1;renderStyle(4);
    if(gpu.contour.time!==fixed)throw Error('Reduced-motion ink ages');
    input.reduced=false;d.spectrumClock=savedClock;report[style].flatCameraInvariant=true;report[style].inkFrozen=true;
   }
   if(style===6){
    const fixed=gpu.aerial.positions.slice(),steps=gpu.aerial.steps,clock=d.spectrumClock,camera=d.camera,features=input.features;
    renderStyle(6);if(gpu.aerial.steps!==steps||fixed.some((x,i)=>x!==gpu.aerial.positions[i]))throw Error('Frozen Aerial physics moved');
    input.reduced=true;d.spectrumClock+=.1;renderStyle(6);if(gpu.aerial.steps!==steps)throw Error('Reduced Aerial physics moved');input.reduced=false;
    const before=energy();for(let i=0;i<30;i++){d.spectrumClock+=1/60;input.features={...features,onset:i===0?1:0};renderStyle(6);}if(Math.abs(energy()-before)<1)throw Error('Aerial motion does not render');
    d.camera=[.5,.4,0,0];renderStyle(6);if(Math.abs(energy()-before)<1)throw Error('Aerial orbit lacks depth');d.camera=camera;
    d.trackId='aerial-next';renderStyle(6);if(gpu.aerial.hits!==0||gpu.aerial.steps!==0)throw Error('Aerial track did not reset');
    d.spectrumClock=clock;input.features=features;report[style].physicsFrozen=true;report[style].reducedMotionHeld=true;report[style].physicalMotionVisible=true;report[style].trackResets=true;report[style].cameraDepth=true;
    if(gpu.canvas.style.transform.includes('rotate'))throw Error('Aerial floor rotated sideways');report[style].uprightPhone=true;
    const lightStudio=energy(3);d.appearance.aerialShade=1;renderStyle(6);if(!(energy(3)<lightStudio*.4))throw Error('Studio darkness ignored');d.appearance.aerialShade=0;
    d.appearance.aerialFluid=0;d.spectrumClock+=.05;renderStyle(6);if(gpu.aerial.liquid!==0)throw Error('Solid setting ignored');d.appearance.aerialFluid=.8;report[style].studioControls=true;
   }
   report[style].spectrumAddsLight=true;report[style].pausedStable=true;
   d.spectrumLight.fill(0);const saved=d.roles;d.roles={bass:0,lead:0,drums:0,shimmer:0};settle();renderStyle(style);const silent=energy();d.roles={bass:.8,lead:.8,drums:.8,shimmer:.8};settle();renderStyle(style);const music=energy();d.roles=saved;if(Math.abs(music-silent)<1)throw Error('Missing musical response '+style);report[style].musicChangesScene=true;
   const response={};d.roles={bass:0,lead:0,drums:0,texture:0};settle();renderStyle(style);const base=[energy(),energy(3)];
   for(const role of ['bass','lead','drums']){d.roles={bass:0,lead:0,drums:0,texture:0,[role]:.8};settle();renderStyle(style);const delta=[Math.abs(energy()-base[0]),Math.abs(energy(3)-base[1])];if(delta[0]+delta[1]<1)throw Error('Missing '+role+' response in '+style);response[role]=delta.map(x=>Math.round(x));}
   d.roles=saved;report[style].independentRoles=response;
   if(style===7){
    const clock=d.spectrumClock,features=input.features,originalTime=input.time,originalMotion=[...d.artMotion],camera=d.camera;
    const pixels=()=>{const t=gpu.targets[0];gpu.bind(t);const a=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,a);return a;};
    const difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
    gpu.synapse.reset();d.spectrumClock=0;input.features={...features,onset:0,loudness:.7};gpu.draw(input);
    d.spectrumClock=.02;input.features={...input.features,onset:1};gpu.draw(input);if(gpu.synapse.emitted!==1)throw Error('Synapse missed the attack');
    input.features={...input.features,onset:0};for(let i=0;i<20;i++){d.spectrumClock+=.02;gpu.draw(input);}const near=pixels();
    for(let i=0;i<30;i++){d.spectrumClock+=.02;gpu.draw(input);}if(difference(near,pixels())<10)throw Error('Impulse does not travel');
    const flash=d.appearance.flash;const flashed=energy();d.appearance.flash=0;gpu.draw(input);if(!(energy()<flashed))throw Error('Musical flashes control is ignored');d.appearance.flash=flash;gpu.draw(input);
    const held=pixels();input.time+=300;gpu.draw(input);if(difference(held,pixels())>.01)throw Error('Synapse reads wall clock');
    const time=gpu.synapse.time;input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);if(gpu.synapse.time!==time)throw Error('Reduced signals advance');input.reduced=false;
    d.camera=[.6,.3,0,0];gpu.draw(input);if(difference(held,pixels())<10)throw Error('Synapse lacks camera depth');
    d.trackId='synapse-new-track';gpu.draw(input);if(gpu.synapse.emitted!==0)throw Error('New track retained signals');
    input.features=features;input.time=originalTime;d.artMotion=originalMotion;d.camera=camera;d.spectrumClock=clock;gpu.synapse.reset();renderStyle(7);
    report[style].flashControl=true;report[style].impulsesTravel=true;report[style].frozenClockStable=true;report[style].reducedSignalsHeld=true;report[style].trackClearsSignals=true;report[style].cameraDepth=true;
   }
   if(style===3){
    const originalTime=input.time,originalMotion=[...d.artMotion],originalCamera=d.camera;
    const pixels=()=>{const t=gpu.targets[0];gpu.bind(t);const a=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,a);return a;};
    const distance=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0);
    d.camera=[0,0,0,0];renderStyle(3);const before=pixels();
    for(let i=0;i<120;i++){d.spectrumClock+=1/60;renderStyle(3);}if(distance(before,pixels())<10)throw Error('Orbital paths do not travel');
    d.artMotion=originalMotion;gpu.draw(input);const held=pixels();input.time+=300;gpu.draw(input);
    if(distance(held,pixels())>.01)throw Error('Astra reads wall time while frozen');
    d.camera=[.7,.3,0,0];gpu.draw(input);if(distance(held,pixels())<10)throw Error('Astral depth does not follow camera');
    input.time=originalTime;d.camera=originalCamera;renderStyle(3);
    report[style].orbitalTravel=true;report[style].frozenClockStable=true;report[style].cameraDepth=true;
   }
   if(style===2){d.roles={};renderStyle(style);const quiet=coverage();d.roles={bass:.9};renderStyle(style);if(Math.abs(coverage()-quiet)<1)throw Error('Terrain only changes brightness, not silhouette');report[style].terrainDeforms=true;d.roles=saved;}
  }
  {
   const savedFeatures=input.features,savedCamera=d.camera;d.camera=[0,0,0,0];
   const centroid=(band)=>{
    const tone=new Float32Array(48);for(let k=0;k<48;k++)tone[k]=.8*Math.exp(-Math.pow((k-band)/2.,2.));
    input.features={...savedFeatures,spectrum:tone};gpu.spectrumHistory.reset();
    for(let i=0;i<128;i++)gpu.spectrumHistory.update(i/30,tone);d.spectrumClock=127/30;renderStyle(5);
    const target=gpu.targets[0];gpu.bind(target);const px=new Float32Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gl.FLOAT,px);
    let sum=0,x=0;for(let i=0;i<px.length;i+=4){const e=px[i]+px[i+1]+px[i+2];sum+=e;x+=e*((i/4)%target.w);}return {x:x/Math.max(.0001,sum),sum};
   };
   const low=centroid(8),high=centroid(36);if(high.x-low.x<input.width*.2)throw Error('Flux loses low-to-high frequency ordering: '+JSON.stringify({low,high}));
   input.features={...savedFeatures,spectrum:new Float32Array(48)};gpu.spectrumHistory.reset();d.spectrumClock=0;renderStyle(5);if(energy()>.001)throw Error('Flux invents a spectrum in silence');
   report[5].frequencyOrder=true;report[5].silentSpectrumEmpty=true;
   input.features=savedFeatures;d.camera=savedCamera;
  }
  const loss=gl.getExtension('WEBGL_lose_context');if(loss){loss.loseContext();await new Promise(r=>setTimeout(r,100));loss.restoreContext();for(let i=0;i<200&&(gpu.lost||!gpu.ready);i++)await new Promise(r=>setTimeout(r,50));await gpu.preparing;gpu.draw(input);await gpu.warming;if(!gpu.draw(input)||gpu.failed||gl.getError())throw Error('Context recovery failed');report.push({contextRecovery:true});}
  gpu.dispose();return report;
 })()`);
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(result,null,2));log(JSON.stringify(result));
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{log('Render audit timeout');app.exit(2);},300000).unref();
