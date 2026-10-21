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
  window.d=reactor.visualState(.016);delete d.astraClock;delete d.astraActive;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
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
 report.comets=await run(`(()=>{gpu.draw(input);const before=pixels(),backup=gpu.astra.cometTrail.slice();gpu.astra.cometTrail.fill(0);gpu.draw(input);const delta=distance(before,pixels());gpu.astra.cometTrail.set(backup);gpu.draw(input);return delta;})()`);
 if(report.comets<.001)throw Error('Spawned comet is invisible');
 report.lightAndColor=await run(`(()=>{
  const roles=d.roles,colors=d.colors,bloom=d.appearance.bloom;
  const chroma=()=>{for(let i=0;i<55;i++){d.spectrumClock+=.1;gpu.draw(input);}gpu.draw(input);const p=pixels(),sum=[0,0,0];for(let i=0;i<p.length;i+=4)for(let c=0;c<3;c++)sum[c]+=p[i+c];const total=sum.reduce((a,b)=>a+b,0);return sum.map(x=>x/total);};
  d.roles={bass:.9,lead:.05,texture:.1};const bass=chroma();d.roles={bass:.05,lead:.9,texture:.1};const lead=chroma();
  const musicalShift=Math.hypot(...bass.map((x,i)=>x-lead[i]));
  d.colors=[[.7,.05,.02],[.9,.12,.03],[.8,.03,.1]];const other=chroma();
  const paletteShift=Math.hypot(...other.map((x,i)=>x-lead[i]));
  d.colors=colors;d.roles=roles;gpu.draw(input);const glowing=pixels();d.appearance.bloom=0;gpu.draw(input);const bloomDifference=distance(glowing,pixels());d.appearance.bloom=bloom;gpu.draw(input);
  return {musicalShift,paletteShift,bloomDifference};
 })()`);
 if(report.lightAndColor.musicalShift<.12||report.lightAndColor.paletteShift<.12||report.lightAndColor.bloomDifference<.4)throw Error('Astra colour or bloom remains too subtle: '+JSON.stringify(report.lightAndColor));
 report.gravity=await run(`(async()=>{
  const {ASTRA_DUST_VERTEX,ASTRA_DUST_FRAGMENT}=await import('/astra-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const probe=await compileSceneProgram(gl,ASTRA_DUST_VERTEX,ASTRA_DUST_FRAGMENT,['gl_Position','v_alpha']);
  const buffer=gl.createBuffer(),feedback=gl.createTransformFeedback();gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,20,gl.DYNAMIC_READ);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
  const events=new Float32Array(48);events.set([.1,1,.4,.8]);gpu.use(probe,{u_resolution:[1,1],u_focalLength:1,u_particle:[1,1,1,1],u_light:[1,1,1,1],u_movement:1,u_astraEvents:events,u_palette:new Float32Array(18).fill(.5)});
  const seed=gl.getAttribLocation(probe.program,'a_seed');gl.disableVertexAttribArray(seed);gl.vertexAttrib4f(seed,.5,.01,.30,.35);gl.enable(gl.RASTERIZER_DISCARD);
  const samples=[];for(const age of [.1,.5,1.0,1.7]){gpu.uniform(probe,'u_astraTime',.1+age);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,1,1);gl.endTransformFeedback();const p=new Float32Array(5);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,p);samples.push({age,radius:Math.hypot(p[0],p[1]-.22,5.4-p[3]),alpha:p[4]});}
  gl.vertexAttrib4f(seed,.5,.01,.97,.35);const escape=[];
  for(const age of [.1,.5,1,1.7]){gpu.uniform(probe,'u_astraTime',.1+age);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,1,1);gl.endTransformFeedback();const p=new Float32Array(5);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,p);escape.push({age,radius:Math.hypot(p[0],p[1]-.22,5.4-p[3]),alpha:p[4]});}
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.deleteProgram(probe.program);gpu.draw(input);
  if(gl.getError())throw Error('Gravity readback failed');return {bound:samples,escape};
 })()`);
 const bound=report.gravity.bound,escape=report.gravity.escape;
 if(!(bound[1].radius>bound[0].radius&&bound[2].radius<bound[1].radius&&bound[3].alpha===0))throw Error('Burst debris does not fall back into the sun: '+JSON.stringify(bound));
 if(!(escape.every((p,i)=>i===0||p.radius>escape[i-1].radius)&&escape[3].radius>1.5&&escape[3].alpha>0))throw Error('Escaping ejecta turns back or vanishes too early');
 report.cameraPlane=await run(`(async()=>{
  const {ASTRA_PATH_VERTEX,ASTRA_PATH_FRAGMENT}=await import('/astra-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const vertex=ASTRA_PATH_VERTEX.replace('out vec3 v_color;','out vec4 v_probe;out vec3 v_color;').replace('gl_Position=clip;','v_probe=vec4(normal,clip.w,p.z);gl_Position=clip;');
  const p=await compileSceneProgram(gl,vertex,ASTRA_PATH_FRAGMENT,['v_probe']),buffer=gl.createBuffer(),f=gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,f);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,16,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
  gpu.use(p,{u_resolution:[1280,800],u_focalLength:1.9,u_particle:[1,1,1,1],u_segments:320,u_pathPart:0,u_movement:0});gpu.texture(p,'u_astraHistory',gpu.astraHistoryTexture,5);gl.enable(gl.RASTERIZER_DISCARD);
  const sample=z=>{gpu.uniform(p,'u_camera',[0,0,z,0]);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,1);gl.endTransformFeedback();const value=new Float32Array(4);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,value);return Array.from(value);};
  const origin=sample(0),a=sample(origin[3]-5.4-.0001),b=sample(origin[3]-5.4+.0001),dot=a[0]*b[0]+a[1]*b[1];
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(f);gl.deleteProgram(p.program);gpu.draw(input);
  return {a,b,dot};
 })()`);
 if(!report.cameraPlane.a.every(Number.isFinite)||!report.cameraPlane.b.every(Number.isFinite)||report.cameraPlane.dot<.99)throw Error('Ring strip flips as zoom passes the camera plane: '+JSON.stringify(report.cameraPlane));
 report.escapeContinuum=await run(`(async()=>{
  const {ASTRA_DUST_VERTEX}=await import('/astra-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const flight=ASTRA_DUST_VERTEX.slice(ASTRA_DUST_VERTEX.indexOf('vec2 ejectaFlight('),ASTRA_DUST_VERTEX.indexOf('in vec4 a_seed;'));
  const vertex='#version 300 es\\nprecision highp float;\\n'+flight+'uniform float u_speed,u_age;out vec2 result;void main(){result=ejectaFlight(u_speed,u_age);gl_Position=vec4(0.,0.,0.,1.);}';
  const fragment='#version 300 es\\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}';
  const p=await compileSceneProgram(gl,vertex,fragment,['result']);const b=gl.createBuffer(),f=gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,f);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,b);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,8,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,b);gl.enable(gl.RASTERIZER_DISCARD);
  const sample=(speed,age)=>{gpu.use(p,{u_speed:speed,u_age:age});gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,1);gl.endTransformFeedback();const result=new Float32Array(2);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,result);return Array.from(result);};
  const escape=Math.sqrt(2*.18/.285),rows=[];for(let i=0;i<=100;i++)rows.push(sample(escape*.8+i*escape*.4/100,2));
  let largestStep=0;for(let i=1;i<rows.length;i++)largestStep=Math.max(largestStep,Math.hypot(...rows[i].map((v,k)=>v-rows[i-1][k])));
  const bound=sample(.75,2),slow=sample(escape*1.005,2),fast=sample(escape*1.5,2),border=[sample(escape*.999,2),sample(escape*1.001,2)];
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(b);gl.deleteTransformFeedback(f);gl.deleteProgram(p.program);gpu.draw(input);
  return {largestStep,bound,slow,fast,border};
 })()`);
 const flight=report.escapeContinuum;
 if(flight.largestStep>.05||flight.bound[0]!==0||flight.slow[1]<=0||flight.fast[0]<flight.slow[0]*1.5||Math.abs(flight.border[0][0]-flight.border[1][0])>.02)throw Error('Particle velocities split at the escape threshold: '+JSON.stringify(flight));
 report.surfaceAndRings=await run(`(async()=>{
  const {ASTRA_BODY_VERTEX,ASTRA_BODY_FRAGMENT,ASTRA_PATH_VERTEX,ASTRA_PATH_FRAGMENT}=await import('/astra-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const body=await compileSceneProgram(gl,ASTRA_BODY_VERTEX,ASTRA_BODY_FRAGMENT,['v_world','v_normal']);
  const path=await compileSceneProgram(gl,ASTRA_PATH_VERTEX,ASTRA_PATH_FRAGMENT,['gl_Position']);
  const buffer=gl.createBuffer(),feedback=gl.createTransformFeedback();gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,72*64*6*4*4,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
  const common={u_resolution:[1280,800],u_focalLength:1,u_particle:[1,1,1,1],u_light:[1,1,1,1],u_movement:1,u_astraTime:.3};
  const capture=(program,count,size,values)=>{gpu.use(program,{...common,...values});gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();const result=new Float32Array(count*size);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,result);gl.disable(gl.RASTERIZER_DISCARD);return result;};
  const empty=new Float32Array(48),events=empty.slice();events.set([.1,1,.4,.8]);
  const calm=capture(body,32*16*6,6,{u_bodyOffset:0,u_bodyDetail:[32,16],u_astraEvents:empty});
  const erupt=capture(body,32*16*6,6,{u_bodyOffset:0,u_bodyDetail:[32,16],u_astraEvents:events});
  let surfaceLift=0,affected=0;for(let i=0;i<calm.length;i+=6){const delta=Math.hypot(...[0,1,2].map(k=>erupt[i+k]-calm[i+k]));surfaceLift=Math.max(surfaceLift,delta);if(delta>.001)affected++;}
  // A single musical frequency produces a local vertical crest, delayed on
  // distant rings; the spectrum wrap must remain continuous at 0/2pi.
  const history=new Uint8Array(48*128);for(let i=0;i<4;i++)history[i*48+16]=255;
  gl.useProgram(path.program);gpu.texture(path,'u_astraHistory',gpu.astraHistoryTexture,5);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,48,128,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(history.length));
  const values={u_segments:64,u_pathPart:0,u_historyHead:3,u_historyPhase:0};
  const flat=capture(path,72*64*6,4,values);
  gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,48,128,gl.RED,gl.UNSIGNED_BYTE,history);
  const crest=capture(path,72*64*6,4,values);
  const delta=(ring)=>{let max=0;for(let v=ring*64*6;v<(ring+1)*64*6;v++)max=Math.max(max,Math.abs(crest[v*4+1]-flat[v*4+1]));return max;};
  const innerLift=delta(0),outerLift=delta(60);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.deleteProgram(body.program);gl.deleteProgram(path.program);gpu.astraHistoryVersion=-1;gpu.draw(input);
  if(gl.getError())throw Error('Surface/ring readback failed');return {surfaceLift,affected,innerLift,outerLift};
 })()`);
 if(report.surfaceAndRings.surfaceLift<.005||report.surfaceAndRings.affected<10||report.surfaceAndRings.innerLift<.35||report.surfaceAndRings.outerLift>.001)throw Error('Solar relief or delayed vertical spectrum is missing: '+JSON.stringify(report.surfaceAndRings));
 await run(`gpu.draw(input);const held=pixels(),time=gpu.astra.time;input.time+=300;gpu.draw(input);if(distance(held,pixels())>.001||gpu.astra.time!==time)throw Error('Frozen Astra advances');input.time-=300;
 input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);if(gpu.astra.time!==time)throw Error('Reduced Astra advances');input.reduced=false;gpu.astra.suspend();renderStyle(3);void 0;`);
 report.pausedStable=true;report.reducedEventsHeld=true;
 for(const [name,camera]of [['side',[1.57,.25,0,0]],['above',[0,-1.02,0,0]],['rear',[3.14,.3,0,0]],['below',[0,1.1,0,0]],['outer-system',[0,.15,4,0]],['surface-detail',[.4,.2,-2.7,0]]]){
  await run(`d.camera=${JSON.stringify(camera)};gpu.draw(input);`);await shot(name);
 }
 await run(`d.camera=[0,0,0,0];d.colors=[[.05,.65,.8],[.3,.16,.75],[.1,.4,.8]];d.roles={bass:.5,lead:.9,drums:.3,texture:.5};for(let i=0;i<55;i++){d.spectrumClock+=.1;gpu.draw(input);}`);await shot('blue-star');
 await run(`gpu.draw(input);const heldTrack=pixels(),phase=gpu.astra.orbits.slice();d.trackId='astra-next-track';gpu.draw(input);if(distance(heldTrack,pixels())>.001||phase.some((v,i)=>v!==gpu.astra.orbits[i]))throw Error('Track change snaps the solar system');`);report.trackContinuity=true;
 // Force the fallback attachment format, then compare the same background
 // through the real compositor. This catches quantization before tone mapping.
 report.background=await run(`(()=>{const gl=gpu.gl;const backdrop=(hdr=0)=>{gpu.draw(input);gpu.bind(gpu.targets[0]);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gpu.bind(gpu.targets[1]);gl.clear(gl.COLOR_BUFFER_BIT);gpu.bind(null);gl.useProgram(gpu.finish.program);gpu.texture(gpu.finish,'u_image',gpu.targets[0].texture,0);gpu.texture(gpu.finish,'u_bloom',gpu.targets[1].texture,1);gpu.texture(gpu.finish,'u_nebula',gpu.targets[3].texture,2);gpu.uniform(gpu.finish,'u_hdrOutput',hdr);gpu.quadDraw(gpu.finish);return pixels();};
 const original=backdrop(),encoded=backdrop(1),decoded=Float32Array.from(encoded,(v,i)=>i%4===3?v:(v/255<=.8?v/.8:(1+(v/255-.8)*4)*255)),hdrError=distance(original,decoded);gpu.hdr=false;gpu.resize(gpu.canvas.width+1,gpu.canvas.height);const fallback=backdrop();let diff=distance(original,fallback);return {hdrByteError:hdrError,meanByteError:diff,format:gpu.canvas.dataset.colorBuffer};})()`);
 if(report.background.hdrByteError>1||report.background.meanByteError>.8||report.background.format!=='unorm8')throw Error('Dark background loses precision in RGBA8');await shot('sdr-gradient');await run('gpu.draw(input)');await shot('fallback-scene');
 report.performance=[];
 for(const [name,w,h,quality,mobile]of [['desktop',1280,800,'high',false],['phone',412,915,'eco',true]]){
  win.setSize(w,h);await run(`gpu.mobile=${mobile};input.width=${w};input.height=${h};input.quality='${quality}';d.portraitScene=${mobile};gpu.hdr=true;gpu.resize(${w}+1,${h});gpu.draw(input);`);
  const result=await run(`(async()=>{const times=[];for(let i=0;i<32;i++){const start=performance.now();step(d.spectrumClock+1/60);gpu.gl.finish();if(i>5)times.push(performance.now()-start);await new Promise(r=>setTimeout(r,3));}times.sort((a,b)=>a-b);return {medianMs:times[13],p95Ms:times[24],dimensions:[gpu.canvas.width,gpu.canvas.height]};})()`);
  report.performance.push({name,...result});await shot(name);
 }
 if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));log('Astra render checks passed');
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
