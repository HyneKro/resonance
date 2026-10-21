// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/astra');
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
 const shot=async name=>{await new Promise(r=>setTimeout(r,80));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await run(`window.sampleSpectrum=t=>Float32Array.from({length:48},(_,k)=>{let a=0;for(const [b,s]of [[5,.8],[17,-.4],[31,.6],[43,-.7]])a+=(.2+.6*Math.sin(t*s+b)**2)*Math.exp(-Math.pow((k-b-Math.sin(t*s)*2)/2.4,2));return Math.min(1,a);});
 window.pixels=()=>{const gl=gpu.gl;gpu.bind(null);const a=new Uint8Array(gpu.canvas.width*gpu.canvas.height*4);gl.readPixels(0,0,gpu.canvas.width,gpu.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,a);return a;};
 window.distance=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
 gpu.astra.reset();gpu.astraTrack=d.trackId;d.spectrumClock=0;input.time=0;input.features={...input.features,spectrum:new Float32Array(48),onset:0,loudness:.6};d.roles={};renderStyle(3);
 window.step=(t)=>{d.spectrumClock=t;input.time=t;const spectrum=sampleSpectrum(t),hit=Math.exp(-(t%.5)*25);input.features={...input.features,spectrum,onset:hit,loudness:.6};d.spectrumLight=Float32Array.from(spectrum,x=>x*.7);d.roles={bass:.35+.2*Math.sin(t*2),drums:hit,lead:.25+.22*Math.sin(t*1.3),texture:.15};renderStyle(3);};
 for(let i=1;i<=120;i++)step(i/60);void 0;`);
 await shot('front');report.events=await run('gpu.astra.emitted');if(report.events<2)throw Error('No musical births');
 await run('for(let i=121;i<=156;i++)step(i/60);');await shot('ejection');
 report.trails=await run(`(()=>{gpu.draw(input);const before=pixels(),backup=gpu.astra.orbits.slice();for(let i=0;i<48;i++)gpu.astra.orbits[i*4+1]=0;gpu.draw(input);const delta=distance(before,pixels());gpu.astra.orbits.set(backup);gpu.draw(input);return delta;})()`);
 if(report.trails<.001)throw Error('Speed trails are invisible');
 report.comets=await run(`(()=>{gpu.draw(input);const before=pixels(),backup=gpu.astra.events.slice();for(let i=0;i<12;i++)gpu.astra.events[i*4+3]=0;gpu.draw(input);const delta=distance(before,pixels());gpu.astra.events.set(backup);gpu.draw(input);return delta;})()`);
 if(report.comets<.001)throw Error('Spawned comet is invisible');
 await run(`gpu.draw(input);const held=pixels(),time=gpu.astra.time;input.time+=300;gpu.draw(input);if(distance(held,pixels())>.001||gpu.astra.time!==time)throw Error('Frozen Astra advances');input.time-=300;
 input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);if(gpu.astra.time!==time)throw Error('Reduced Astra advances');input.reduced=false;gpu.astra.suspend();renderStyle(3);void 0;`);
 report.pausedStable=true;report.reducedEventsHeld=true;
 for(const [name,camera]of [['side',[1.57,.25,0,0]],['above',[0,-1.02,0,0]],['rear',[3.14,.3,0,0]],['below',[0,1.1,0,0]]]){
  await run(`d.camera=${JSON.stringify(camera)};gpu.draw(input);`);await shot(name);
 }
 await run(`d.camera=[0,0,0,0];d.colors=[[.05,.65,.8],[.3,.16,.75],[.1,.4,.8]];d.roles={bass:.5,lead:.9,drums:.3,texture:.5};gpu.draw(input);`);await shot('blue-star');
 await run(`d.trackId='astra-next-track';gpu.draw(input);if(gpu.astra.emitted||gpu.astra.orbits.some(x=>x))throw Error('New track retains events or velocity');`);report.trackReset=true;
 // Force the fallback attachment format, then compare the same background
 // through the real compositor. This catches quantization before tone mapping.
 report.background=await run(`(()=>{const gl=gpu.gl;const backdrop=(hdr=0)=>{gpu.draw(input);gpu.bind(gpu.targets[0]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gpu.bind(gpu.targets[1]);gl.clear(gl.COLOR_BUFFER_BIT);gpu.bind(null);gl.useProgram(gpu.finish.program);gpu.texture(gpu.finish,'u_image',gpu.targets[0].texture,0);gpu.texture(gpu.finish,'u_bloom',gpu.targets[1].texture,1);gpu.texture(gpu.finish,'u_nebula',gpu.targets[3].texture,2);gpu.uniform(gpu.finish,'u_hdrOutput',hdr);gpu.quadDraw(gpu.finish);return pixels();};
 const original=backdrop(),encoded=backdrop(1),decoded=Float32Array.from(encoded,(v,i)=>i%4===3?v:(v/255<=.8?v/.8:(1+(v/255-.8)*4)*255)),hdrError=distance(original,decoded);gpu.hdr=false;gpu.resize(gpu.canvas.width+1,gpu.canvas.height);const fallback=backdrop();let diff=distance(original,fallback);return {hdrByteError:hdrError,meanByteError:diff,format:gpu.canvas.dataset.colorBuffer};})()`);
 if(report.background.hdrByteError>1||report.background.meanByteError>.8||report.background.format!=='unorm8')throw Error('Dark background loses precision in RGBA8');await shot('sdr-gradient');
 report.performance=[];
 for(const [name,w,h,quality,mobile]of [['desktop',1280,800,'high',false],['phone',412,915,'eco',true]]){
  win.setSize(w,h);await run(`gpu.mobile=${mobile};input.width=${w};input.height=${h};input.quality='${quality}';d.portraitScene=${mobile};gpu.hdr=true;gpu.resize(${w}+1,${h});gpu.draw(input);`);
  const result=await run(`(async()=>{const times=[];for(let i=0;i<32;i++){const start=performance.now();step(d.spectrumClock+1/60);gpu.gl.finish();if(i>5)times.push(performance.now()-start);await new Promise(r=>setTimeout(r,3));}times.sort((a,b)=>a-b);return {medianMs:times[13],p95Ms:times[24],dimensions:[gpu.canvas.width,gpu.canvas.height]};})()`);
  report.performance.push({name,...result});await shot(name);
 }
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));log('Astra render checks passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
