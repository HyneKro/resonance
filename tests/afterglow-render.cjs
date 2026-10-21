// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/afterglow');
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
  window.d=reactor.visualState(.016);const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  // Exercise a populated, changing history rather than a synthetic static backdrop.
  gpu.roadHistoryTrack=d.trackId;for(let i=0;i<128;i++)gpu.roadHistory.update(i/30,Float32Array.from(features.spectrum,(x,k)=>x*(.6+.4*Math.sin(k*.35+i*.055)**2)));
  d.spectrumClock=127/30;
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);
 const report={};
 await run(`window.sampleSpectrum=t=>Float32Array.from({length:48},(_,k)=>{
  let x=0;for(const [band,speed]of [[6,.8],[16,-.4],[29,.6],[40,-.7]])x+=(.3+.35*Math.sin(t*speed+band)**2)*Math.exp(-Math.pow((k-band-Math.sin(t*speed)*2)/2.6,2));return Math.min(.9,x);
 });gpu.roadHistory.reset();gpu.roadHistoryTrack=d.trackId;for(let i=0;i<128;i++)gpu.roadHistory.update(i/30,sampleSpectrum(i/30));
 d.spectrumClock=127/30;input.features={...input.features,spectrum:sampleSpectrum(127/30)};d.spectrumLight=Float32Array.from(input.features.spectrum,x=>x*.7);input.time=8;d.roles={bass:.55,lead:.5,drums:.45,texture:.2};renderStyle(2);
 window.pixels=()=>{const gl=gpu.gl;gpu.bind(null);const data=new Uint8Array(gpu.canvas.width*gpu.canvas.height*4);gl.readPixels(0,0,gpu.canvas.width,gpu.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,data);return data;};
 window.difference=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
 window.fixed=pixels();d.camera=[2.2,-.6,-2.4,1.2];d.cameraFocalLength=1.1;renderStyle(2);if(difference(fixed,pixels())>.001)throw Error('Drive camera is not fixed');
 const head=gpu.roadHistory.head;input.time+=300;gpu.draw(input);if(difference(fixed,pixels())>.001||head!==gpu.roadHistory.head)throw Error('Paused drive reads wall time');input.time=8;
 const version=gpu.roadHistory.version;input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);if(gpu.roadHistory.version!==version)throw Error('Reduced motion advances echoes');input.reduced=false;d.spectrumClock=127/30;gpu.roadHistory.suspend();renderStyle(2);void 0;`);
 Object.assign(report,{fixedCamera:true,pausedStable:true,reducedHistoryHeld:true});
 const shot=async name=>{await new Promise(r=>setTimeout(r,90));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await shot('default');
 for(const [name,scan,phosphor]of [['clean',0,0],['scanlines',1,0],['phosphor',0,1]]){
  const delta=await run(`d.appearance.retroScan=${scan};d.appearance.retroPhosphor=${phosphor};renderStyle(2);difference(fixed,pixels());`);
  if(delta<.2)throw Error('CRT control does not change the rendered image: '+name);report[name]=delta;await shot(name);
 }
 await run(`d.appearance.retroScan=.45;d.appearance.retroPhosphor=.25;d.appearance.retroColor=0;renderStyle(2);window.classic=pixels();window.palette=d.colors;d.colors=[[.02,.8,.3],[.9,.35,.02],[.2,.1,.8]];renderStyle(2);if(difference(classic,pixels())>.001)throw Error('Classic palette changes with song');d.appearance.retroColor=1;renderStyle(2);if(difference(classic,pixels())<3)throw Error('Music colour setting ignored');`);
 await shot('music-colours');report.paletteControl=true;
 await run(`d.colors=palette;d.appearance.retroColor=.45;renderStyle(2);window.withEcho=pixels();gpu.roadHistory.reset();renderStyle(2);if(difference(withEcho,pixels())<.2)throw Error('Terrain ignores earlier music');
 for(let i=0;i<128;i++)gpu.roadHistory.update(i/30,sampleSpectrum(i/30));d.spectrumClock=127/30;
 d.trackId='new-drive';renderStyle(2);if(gpu.roadHistory.head!==0||gpu.roadHistory.data.slice(48).some(x=>x))throw Error('New track carries previous echoes');
 for(let i=1;i<=128;i++)gpu.roadHistory.update(i/30,sampleSpectrum(i/30));d.spectrumClock=128/30;renderStyle(2);
 window.beforeTravel=pixels();input.time+=.3;renderStyle(2);if(difference(beforeTravel,pixels())<1)throw Error('Road does not travel');void 0;`);
 Object.assign(report,{realHistory:true,trackReset:true,roadTravel:true});
 // Isolate the terrain to check its actual left/right silhouette and brightness.
 report.mirrorError=await run(`(()=>{const gl=gpu.gl,t=gpu.targets[0];gpu.bind(t);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.useProgram(gpu.roadTerrain.program);gl.drawArrays(gl.TRIANGLES,0,2*48*128*6);const p=new Float32Array(t.w*t.h*4);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gl.FLOAT,p);let error=0,total=0;for(let y=0;y<t.h;y++)for(let x=0;x<t.w/2;x++){const a=(y*t.w+x)*4,b=(y*t.w+t.w-1-x)*4;for(let c=0;c<4;c++){error+=Math.abs(p[a+c]-p[b+c]);total+=Math.abs(p[a+c]);}}gl.disable(gl.DEPTH_TEST);return error/Math.max(total,1);})()`);
 if(report.mirrorError>.025)throw Error('Terrain is not mirrored: '+report.mirrorError);
 await run(`renderStyle(2);`);await shot('echoes');
 report.performance=[];
 for(const [name,w,h,quality,mobile]of [['desktop',1280,800,'high',false],['phone',412,915,'eco',true]]){
  win.setSize(w,h);await run(`gpu.mobile=${mobile};input.width=${w};input.height=${h};input.quality='${quality}';d.portraitScene=${mobile};renderStyle(2);`);
  const timings=await run(`(async()=>{const times=[];for(let i=0;i<35;i++){input.time+=1/60;d.spectrumClock+=1/60;input.features={...input.features,spectrum:sampleSpectrum(d.spectrumClock)};const start=performance.now();renderStyle(2);gpu.gl.finish();if(i>5)times.push(performance.now()-start);await new Promise(r=>setTimeout(r,3));}times.sort((a,b)=>a-b);return {medianMs:times[14],p95Ms:times[27],dimensions:[gpu.canvas.width,gpu.canvas.height]};})()`);
  report.performance.push({name,...timings});await shot(name);
 }
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));log('Afterglow render checks passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
