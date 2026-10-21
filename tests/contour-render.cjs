// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/contour');
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
  window.d=reactor.visualState(.016);delete d.astraClock;delete d.astraActive;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);


 const report={};
 const shot=async name=>{await new Promise(r=>setTimeout(r,70));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await run(`window.pixels=(index=-1)=>{const gl=gpu.gl,t=index<0?null:gpu.targets[index];gpu.bind(t);const a=t&&gpu.hdr?new Float32Array(t.w*t.h*4):new Uint8Array((t?.w||gpu.canvas.width)*(t?.h||gpu.canvas.height)*4);gl.readPixels(0,0,t?.w||gpu.canvas.width,t?.h||gpu.canvas.height,gl.RGBA,t&&gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,a);return a;};
 window.distance=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
 window.sampleSpectrum=t=>Float32Array.from({length:48},(_,k)=>{let a=0;for(const [b,s]of [[5,.8],[17,-.4],[31,.6],[43,-.7]])a+=(.15+.6*Math.sin(t*s+b)**2)*Math.exp(-Math.pow((k-b-Math.sin(t*s)*2)/2.4,2));return Math.min(1,a);});
 window.step=t=>{d.spectrumClock=t;input.time=t;const spectrum=sampleSpectrum(t),hit=Math.exp(-(t%.5)*25);input.features={...input.features,spectrum,onset:hit,loudness:.8};d.spectrumLight=Float32Array.from(spectrum,x=>x*.8);d.roles={bass:.4+.2*Math.sin(t*2),drums:hit,lead:.4+.2*Math.sin(t*1.3),texture:.15};renderStyle(4);};
 gpu.contour.reset();gpu.contourTrack=d.trackId;d.spectrumClock=0;input.time=0;renderStyle(4);
 for(let i=1;i<=180;i++)step(i/60);void 0;`);
 await shot('painted');report.events=await run('gpu.contour.emitted');if(report.events<4)throw Error('Percussion did not produce ink');
 report.frequencyGeometry=await run(`(async()=>{
  const {CONTOUR_VERTEX,CONTOUR_FRAGMENT}=await import('/contour-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const source=CONTOUR_VERTEX.replace('out vec4 v_brush;','out vec3 v_probe;out vec4 v_brush;').replace('p=place(p);','v_probe=vec3(trace(t,edition),t);p=place(p);');
  const p=await compileSceneProgram(gl,source,CONTOUR_FRAGMENT,['v_probe']),b=gl.createBuffer(),f=gl.createTransformFeedback(),count=192*6;
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,f);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,b);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,count*12,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,b);gl.enable(gl.RASTERIZER_DISCARD);
  gpu.use(p,{u_inkTime:5,u_ratio:1.6,u_movement:1,u_strands:1,u_segments:192,u_inkEdition:0,u_resolution:[1280,800],u_roles:[.4,.4,.4,.2],u_spectrumLight:new Float32Array(48)});
  const tone=band=>Float32Array.from({length:48},(_,k)=>.85*Math.exp(-Math.pow((k-band)/2,2)));
  const sample=(layer,spectrum)=>{gpu.use(p,{u_inkLayer:layer,u_spectrum:spectrum});gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();const result=new Float32Array(count*3);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,result);return result;};
  const curves=[0,1,2].map(layer=>({rest:sample(layer,new Float32Array(48)),low:sample(layer,tone(8)),high:sample(layer,tone(37))}));
  const centroid=(a,b)=>{let weight=0,t=0;for(let i=0;i<a.length;i+=3){const w=Math.hypot(a[i]-b[i],a[i+1]-b[i+1]);weight+=w;t+=w*a[i+2];}return {weight,t:t/weight};};
  let match=0;for(const key of ['low','high'])for(let i=0;i<count*3;i+=3)for(let c=0;c<2;c++)match=Math.max(match,Math.abs((curves[0][key][i+c]-curves[0].rest[i+c])-(curves[1][key][i+c]-curves[1].rest[i+c])));
  const result={low:centroid(curves[0].low,curves[0].rest),high:centroid(curves[0].high,curves[0].rest),companionError:match,circle:centroid(curves[2].low,curves[2].rest)};
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(b);gl.deleteTransformFeedback(f);gl.deleteProgram(p.program);gpu.draw(input);return result;
 })()`);
 if(report.frequencyGeometry.high.t-report.frequencyGeometry.low.t<.5||report.frequencyGeometry.companionError>1e-5||report.frequencyGeometry.circle.weight<1)throw Error('Spectrum geometry is not coherent: '+JSON.stringify(report.frequencyGeometry));
 report.light=await run(`(()=>{
  const gl=gpu.gl,bloom=d.appearance.bloom;gpu.draw(input);const lit=pixels();d.appearance.bloom=0;gpu.draw(input);const bloomDifference=distance(lit,pixels());d.appearance.bloom=bloom;
  const use=gpu.use.bind(gpu),draw=gl.drawArrays.bind(gl);let skip=false;gpu.use=(p,u)=>{skip=p===gpu.contourDrops||(p===gpu.contourBrush&&u.u_inkLayer===1);use(p,u);};gl.drawArrays=(...args)=>{if(!skip)draw(...args);};
  gpu.draw(input);const black=pixels(0),halo=pixels(1);let emission=0,glow=0;for(let i=0;i<black.length;i+=4)emission+=black[i+3];for(let i=0;i<halo.length;i+=4)glow+=halo[i]+halo[i+1]+halo[i+2];
  gpu.use=use;gl.drawArrays=draw;gpu.draw(input);const paper=pixels(3);let paperMean=0;for(let i=0;i<paper.length;i+=4)paperMean+=(paper[i]+paper[i+1]+paper[i+2])/3;paperMean/=paper.length/4;
  return {bloomDifference,blackEmission:emission,blackGlow:glow,paperMean};
 })()`);
 if(report.light.bloomDifference<.03||report.light.blackEmission!==0||report.light.blackGlow!==0||report.light.paperMean>.5)throw Error('Ink glow isolation failed: '+JSON.stringify(report.light));
 await run('step(3.025)');await shot('splash');
 report.palette=await run(`(()=>{const before=[...gpu.contour.accent];d.colors=[[.02,.65,.9],[.03,.4,.8],[.02,.5,.8]];for(let i=1;i<=180;i++)step(3.025+i/60);return {before,after:[...gpu.contour.accent]};})()`);await shot('cool-ink');
 if(report.palette.after[2]<report.palette.before[2]+.2)throw Error('Palette has no visible range');
 report.held=await run(`(()=>{gpu.draw(input);const before=pixels(),time=gpu.contour.time;input.time+=300;gpu.draw(input);const paused=distance(before,pixels());input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);const reduced=gpu.contour.time===time;input.reduced=false;gpu.draw(input);const flat=pixels();d.camera=[1.2,-.6,.8,3];gpu.draw(input);return {paused,reduced,camera:distance(flat,pixels())};})()`);
 if(report.held.paused>.001||!report.held.reduced||report.held.camera>.001)throw Error('Flat / frozen behavior regressed');
 for(const [name,seconds]of [['scroll',14],['diamond',31]]){
  await run(`while(d.spectrumClock<${seconds})step(d.spectrumClock+1/30);`);await shot(name);
 }
 report.performance=[];
 for(const [name,w,h,quality,mobile]of [['desktop',1280,800,'high',false],['phone',412,915,'eco',true]]){
  win.setSize(w,h);await run(`gpu.mobile=${mobile};input.width=${w};input.height=${h};input.quality='${quality}';d.portraitScene=${mobile};gpu.draw(input);`);
  const result=await run(`(async()=>{const times=[];for(let i=0;i<40;i++){const start=performance.now();step(d.spectrumClock+1/60);gpu.gl.finish();if(i>7)times.push(performance.now()-start);await new Promise(r=>setTimeout(r,3));}times.sort((a,b)=>a-b);return {medianMs:times[16],p95Ms:times[30],dimensions:[gpu.canvas.width,gpu.canvas.height]};})()`);
  report.performance.push({name,...result});await shot(name);
 }
 await run('gpu.hdr=false;gpu.resize(gpu.canvas.width+1,gpu.canvas.height);gpu.draw(input);');await shot('fallback');
 if(await run('gpu.gl.getError()'))throw Error('Render error');
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));log('Contour render checks passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
