// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/art-directions');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'render.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,exitCode=0;const errors=[];
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');service.server.on('request',(req,res)=>{if(req.url==='/probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#080b14"></body>');}else original(req,res);});
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
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
  window.renderStyle=(index,shape=8)=>{d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);
 for(const [index,name]of ['resonance','noctiluca','glasshouse','orrery','contour'].entries()){
  await run(`renderStyle(${index})`);await new Promise(r=>setTimeout(r,120));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 for(let shape=24;shape<30;shape++){
  await run(`renderStyle(0,${shape})`);await new Promise(r=>setTimeout(r,100));fs.writeFileSync(path.join(out,'shape-'+shape+'.png'),(await win.webContents.capturePage()).toPNG());
 }
 const result=await run(`(async()=>{
  const report=[];gpu.mobile=true;input.width=412;input.height=915;input.quality='eco';d.portraitScene=true;
  const gl=gpu.gl;let current='',counts={};const use=gpu.use.bind(gpu),draw=gl.drawArrays.bind(gl);
  gpu.use=(p,u)=>{current=Object.keys(gpu).find(k=>gpu[k]===p)||'?';use(p,u);};gl.drawArrays=(mode,start,count)=>{counts[current]=(counts[current]||0)+count;draw(mode,start,count);};
  for(let style=0;style<=4;style++){
   const samples=[];for(let i=0;i<45;i++){counts={};input.time+=1/60;const start=performance.now();renderStyle(style);gl.finish();if(i>10)samples.push(performance.now()-start);await new Promise(r=>setTimeout(r,5));}
   samples.sort((a,b)=>a-b);if(style&&counts.flowUpdate)throw Error('Invisible original simulation');report.push({style,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],vertices:{...counts},dimensions:[gpu.canvas.width,gpu.canvas.height]});
  }
  // Verify the actual render targets, not only shader source or controls.
  function energy(){const target=gpu.targets[0];gpu.bind(target);const pixels=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);let sum=0;for(let i=0;i<pixels.length;i+=4){if(!Number.isFinite(pixels[i]+pixels[i+1]+pixels[i+2]))throw Error('Nonfinite radiance');sum+=pixels[i]+pixels[i+1]+pixels[i+2];}return sum;}
  for(let style=1;style<=4;style++){
   d.spectrumLight.fill(0);renderStyle(style);const dark=energy();renderStyle(style);if(Math.abs(energy()-dark)>.01)throw Error('Paused scene changes');
   d.spectrumLight.fill(.6);renderStyle(style);const bright=energy();if(!(dark>0&&bright>dark))throw Error('Spectrum does not illuminate style '+style);
   report[style].spectrumAddsLight=true;report[style].pausedStable=true;
   d.spectrumLight.fill(0);const saved=d.roles;d.roles={bass:0,lead:0,drums:0,shimmer:0};renderStyle(style);const silent=energy();d.roles={bass:.8,lead:.8,drums:.8,shimmer:.8};renderStyle(style);const music=energy();d.roles=saved;if(Math.abs(music-silent)<1)throw Error('Missing musical response '+style);report[style].musicChangesScene=true;
  }
  const loss=gl.getExtension('WEBGL_lose_context');if(loss){loss.loseContext();await new Promise(r=>setTimeout(r,100));loss.restoreContext();for(let i=0;i<200&&(gpu.lost||!gpu.ready);i++)await new Promise(r=>setTimeout(r,50));await gpu.preparing;gpu.draw(input);await gpu.warming;if(!gpu.draw(input)||gpu.failed||gl.getError())throw Error('Context recovery failed');report.push({contextRecovery:true});}
  gpu.dispose();return report;
 })()`);
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(result,null,2));log(JSON.stringify(result));
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{log('Render audit timeout');app.exit(2);},180000).unref();
