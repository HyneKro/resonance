// Isolated rendering benchmark: generated audio, no personal library or running app.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),phase=process.env.RESONANCE_AUDIT_PHASE||'after',out=path.join(root,'test-output/release-work/mobile-performance',phase);
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'audit.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service;
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');service.server.on('request',(req,res)=>{if(req.url==='/probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body style="margin:0;background:#080b14"></body>');}else original(req,res);});
 win=new BrowserWindow({show:false,width:412,height:915,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const run=code=>win.webContents.executeJavaScript(code);
 await win.loadURL(service.url+'/probe');
 log(await run(fs.readFileSync(path.join(root,'tests/musical-response-audio.js'),'utf8')));
 const coverage=await run(fs.readFileSync(path.join(root,'tests/ribbon-spectrum-render.js'),'utf8'));
 const result=await run(`(async()=>{
  auditGPU.dispose();const {GPUScene}=await import('/gpu-scene.js'),{Reactor}=await import('/reactor.js');
  const old=document.querySelector('canvas'),canvas=old.cloneNode(false);old.replaceWith(canvas);const gpu=new GPUScene(canvas,{mobile:true});await gpu.preparing;
  const reactor=new Reactor({paused:false,currentTime:17}),d=reactor.visualState(.016),features=musicalAuditFrames[2].features;
  d.roles=musicalAuditFrames[2].roles;d.portraitScene=true;d.spectralDetail=.8;d.appearance.bloom=.18;d.spectrumLight=new Float32Array(48).fill(.45);
  const input={width:412,height:915,time:features.motion,features,dynamics:d,quality:'eco',intensity:.85,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;
  let current='',counts={};const use=gpu.use.bind(gpu),draw=gpu.gl.drawArrays.bind(gpu.gl);
  gpu.use=(program,u)=>{current=Object.keys(gpu).find(k=>gpu[k]===program)||'unknown';use(program,u);};
  gpu.gl.drawArrays=(mode,start,count)=>{counts[current]=(counts[current]||0)+count;draw(mode,start,count);};
  const results=[],timer=gpu.gl.getExtension('EXT_disjoint_timer_query_webgl2');
  for(const light of [false,true]){
   d.spectrumLight.fill(light?.45:0);const samples=[],queries=[];
   for(let i=0;i<100;i++){input.time+=1/60;counts={};const q=timer?gpu.gl.createQuery():null;if(q)gpu.gl.beginQuery(timer.TIME_ELAPSED_EXT,q);const t=performance.now();gpu.draw(input);if(q)gpu.gl.endQuery(timer.TIME_ELAPSED_EXT);gpu.gl.flush();if(i>=10)samples.push(performance.now()-t);if(q)queries.push(q);await new Promise(r=>setTimeout(r,4));}
   const gpuTimes=[];for(const q of queries){for(let i=0;i<100&&!gpu.gl.getQueryParameter(q,gpu.gl.QUERY_RESULT_AVAILABLE);i++)await new Promise(r=>setTimeout(r,10));if(gpu.gl.getQueryParameter(q,gpu.gl.QUERY_RESULT_AVAILABLE)&&!gpu.gl.getParameter(timer.GPU_DISJOINT_EXT))gpuTimes.push(gpu.gl.getQueryParameter(q,gpu.gl.QUERY_RESULT)/1e6);gpu.gl.deleteQuery(q);}
   samples.sort((a,b)=>a-b);gpuTimes.sort((a,b)=>a-b);results.push({spectrum:light,cpuSubmissionMedianMs:samples[Math.floor(samples.length*.5)],gpuMedianMs:gpuTimes[Math.floor(gpuTimes.length*.5)]??null,vertices:{...counts},dimensions:[canvas.width,canvas.height]});
  }
  const gl=gpu.gl,error=gl.getError();if(error)throw Error('WebGL '+error);
  // The optimised mobile simulation must produce identical visible pixels.
  const pixels=()=>{gpu.draw(input);const t=gpu.targets[0],data=gpu.hdr?new Float32Array(t.w*t.h*4):new Uint8Array(t.w*t.h*4);gpu.bind(t);gl.readPixels(0,0,t.w,t.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,data);return data;};
  gpu.mobile=false;const before=pixels();gpu.mobile=true;const after=pixels();let pixelDifference=0;
  for(let i=0;i<before.length;i++)pixelDifference=Math.max(pixelDifference,Math.abs(before[i]-after[i]));
  if(pixelDifference>.0001)throw Error('Visible scene changed: '+pixelDifference);
  d.appearance.orbit=0;counts={};gpu.draw(input);if(counts.flowUpdate||counts.flowDraw)throw Error('Disabled flow still uses the GPU');
  for(const quality of ['high','eco','auto','eco']){input.quality=quality;gpu.draw(input);if(gl.getError())throw Error('Detail change failed');}
  window.mobileAuditGPU=gpu;return {results,pixelDifference,renderer:gl.getParameter(gl.RENDERER),note:'Desktop GPU with phone rendering settings; not S22+ FPS.'};
 })()`);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({coverage,...result},null,2));
 fs.writeFileSync(path.join(out,'ribbon.png'),(await win.webContents.capturePage()).toPNG());
 log('PASS');
}).catch(e=>{log(e.stack);process.exitCode=1;}).finally(()=>{win?.destroy();service?.server.close();service?.lib.close();app.exit(process.exitCode||0);});
setTimeout(()=>{log('Timed out');app.exit(2);},180000).unref();
