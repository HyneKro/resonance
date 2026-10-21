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
  window.d=reactor.visualState(.016);const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  // Exercise a populated, changing history rather than a synthetic static backdrop.
  for(let i=0;i<128;i++)gpu.spectrumHistory.update(i/30,Float32Array.from(features.spectrum,(x,k)=>x*(.6+.4*Math.sin(k*.35+i*.055)**2)));
  d.spectrumClock=127/30;
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);
 for(const [index,name]of ['resonance','noctiluca','afterglow','orrery','contour','flux'].entries()){
  await run(`renderStyle(${index})`);await new Promise(r=>setTimeout(r,120));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 for(const [style,name]of [[1,'noctiluca'],[2,'afterglow'],[3,'orrery'],[4,'contour'],[5,'flux']]){
  for(const [phase,time,level]of [['quiet',4,0],['attack',4,.9],['later',16,.5]]){
   await run(`window.savedRoles??=d.roles;input.time=${time};d.roles={bass:${level},lead:${level},drums:${level},texture:${level},shimmer:${level}};renderStyle(${style})`);
   await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,name+'-'+phase+'.png'),(await win.webContents.capturePage()).toPNG());
  }
 }await run('d.roles=savedRoles');
 const result=await run(`(async()=>{
  const report=[];gpu.mobile=true;input.width=412;input.height=915;input.quality='eco';d.portraitScene=true;
  const gl=gpu.gl;let current='',counts={};const use=gpu.use.bind(gpu),draw=gl.drawArrays.bind(gl);
  gpu.use=(p,u)=>{current=Object.keys(gpu).find(k=>gpu[k]===p)||'?';use(p,u);};gl.drawArrays=(mode,start,count)=>{counts[current]=(counts[current]||0)+count;draw(mode,start,count);};
  for(let style=0;style<=5;style++){
   const samples=[];for(let i=0;i<45;i++){counts={};input.time+=1/60;const start=performance.now();renderStyle(style);gl.finish();if(i>10)samples.push(performance.now()-start);await new Promise(r=>setTimeout(r,5));}
   samples.sort((a,b)=>a-b);if(style&&counts.flowUpdate)throw Error('Invisible original simulation');report.push({style,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],vertices:{...counts},dimensions:[gpu.canvas.width,gpu.canvas.height]});
  }
  // Verify the actual render targets, not only shader source or controls.
  function energy(targetIndex=0){const target=gpu.targets[targetIndex];gpu.bind(target);const pixels=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);let sum=0;for(let i=0;i<pixels.length;i+=4){if(!Number.isFinite(pixels[i]+pixels[i+1]+pixels[i+2]))throw Error('Nonfinite radiance');sum+=pixels[i]+pixels[i+1]+pixels[i+2];}return sum;}
  function coverage(){const target=gpu.targets[0];gpu.bind(target);const pixels=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);let sum=0;for(let i=3;i<pixels.length;i+=4)sum+=pixels[i];return sum;}
  for(let style=1;style<=5;style++){
   d.spectrumLight.fill(0);renderStyle(style);const dark=energy();renderStyle(style);if(Math.abs(energy()-dark)>.01)throw Error('Paused scene changes');
   d.spectrumLight.fill(.6);renderStyle(style);const bright=energy();if(!(dark>0&&bright>dark))throw Error('Spectrum does not illuminate style '+style);
   report[style].spectrumAddsLight=true;report[style].pausedStable=true;
   d.spectrumLight.fill(0);const saved=d.roles;d.roles={bass:0,lead:0,drums:0,shimmer:0};renderStyle(style);const silent=energy();d.roles={bass:.8,lead:.8,drums:.8,shimmer:.8};renderStyle(style);const music=energy();d.roles=saved;if(Math.abs(music-silent)<1)throw Error('Missing musical response '+style);report[style].musicChangesScene=true;
   const response={};d.roles={bass:0,lead:0,drums:0,texture:0};renderStyle(style);const base=[energy(),energy(3)];
   for(const role of ['bass','lead','drums']){d.roles={bass:0,lead:0,drums:0,texture:0,[role]:.8};renderStyle(style);const delta=[Math.abs(energy()-base[0]),Math.abs(energy(3)-base[1])];if(delta[0]+delta[1]<1)throw Error('Missing '+role+' response in '+style);response[role]=delta.map(x=>Math.round(x));}
   d.roles=saved;report[style].independentRoles=response;
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
