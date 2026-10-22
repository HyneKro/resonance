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
  gpu.use(p,{u_inkTime:5,u_ratio:1.6,u_movement:1,u_strands:1,u_segments:192,u_resolution:[1280,800],u_roles:[.4,.4,.4,.2],u_spectrumLight:new Float32Array(48)});
  const tone=band=>Float32Array.from({length:48},(_,k)=>.85*Math.exp(-Math.pow((k-band)/2,2)));
  const sample=(layer,spectrum)=>{gpu.use(p,{u_inkLayer:layer,u_spectrum:spectrum});gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();const result=new Float32Array(count*3);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,result);return result;};
  const curves=[0,1,2].map(layer=>({rest:sample(layer,new Float32Array(48)),low:sample(layer,tone(8)),high:sample(layer,tone(37))}));
  const centroid=(a,b)=>{let weight=0,t=0;for(let i=0;i<a.length;i+=3){const w=Math.hypot(a[i]-b[i],a[i+1]-b[i+1]);weight+=w;t+=w*a[i+2];}return {weight,t:t/weight};};
  let match=0;for(const key of ['low','high'])for(let i=0;i<count*3;i+=3)for(let c=0;c<2;c++)match=Math.max(match,Math.abs((curves[0][key][i+c]-curves[0].rest[i+c])-(curves[1][key][i+c]-curves[1].rest[i+c])));
  const result={low:centroid(curves[0].low,curves[0].rest),high:centroid(curves[0].high,curves[0].rest),companionError:match,circle:centroid(curves[2].low,curves[2].rest)};
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(b);gl.deleteTransformFeedback(f);gl.deleteProgram(p.program);gpu.draw(input);return result;
 })()`);
 if(report.frequencyGeometry.high.t-report.frequencyGeometry.low.t<.5||report.frequencyGeometry.companionError>1e-5||report.frequencyGeometry.circle.weight<1)throw Error('Spectrum geometry is not coherent: '+JSON.stringify(report.frequencyGeometry));
 report.rain=await run(`(async()=>{
  const {CONTOUR_DROPS_VERTEX,CONTOUR_DROPS_FRAGMENT}=await import('/contour-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const source=CONTOUR_DROPS_VERTEX.replace('out vec2 v_uv;','out vec4 v_probe;out vec2 v_uv;').replace('vec2 offset=quad*size;','v_probe=vec4(p,fall,live);vec2 offset=quad*size;');
  const p=await compileSceneProgram(gl,source,CONTOUR_DROPS_FRAGMENT,['v_probe']),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,16,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);
  const {ContourMotion,CONTOUR_INK_WIDTH}=await import('/contour-motion.js'),fixture=new ContourMotion();fixture.drops.set([.2,-.1,.1,.8]);fixture.details.set([.03,.6,1,.37]);fixture.tints.set([1,.04,.02,1]);
  gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,gpu.inkTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,CONTOUR_INK_WIDTH,4,gl.RGBA,gl.FLOAT,fixture.data);
  gpu.use(p,{u_inkStage:0,u_ratio:1.6,u_resolution:[1280,800]});gpu.texture(p,'u_inkData',gpu.inkTexture,9);
  const sample=(part,age)=>{gpu.uniform(p,'u_inkTime',.1+age);gl.beginTransformFeedback(gl.POINTS);gl.drawArraysInstanced(gl.POINTS,part*6,1,1);gl.endTransformFeedback();const out=new Float32Array(4);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,out);return Array.from(out);};
  const falling=[.02,.20,.40].map(age=>sample(10,age)),landed=sample(10,.95),impact=sample(0,.95),dry=sample(0,6.4),satellite=sample(2,1.3);
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.deleteProgram(p.program);gpu.draw(input);
  return {falling,landed,impact,dry,satellite};
 })()`);
 if(!report.rain.falling.every((p,i)=>p[3]>0&&(i===0||p[1]<report.rain.falling[i-1][1]))||report.rain.landed[3]!==0||report.rain.impact[3]<=0||report.rain.dry[3]!==0||Math.hypot(report.rain.satellite[0]-.32,report.rain.satellite[1]+.1)<.02)throw Error('Rain fall / impact / absorption stages failed: '+JSON.stringify(report.rain));
 report.continuousBrush=await run(`(()=>{
  const saved=gpu.contour.data.slice(),currents=gpu.contour.currentData.slice(),time=gpu.contour.time;gpu.contour.data.fill(0);gpu.contour.currentData.fill(0);gpu.contour.time=16.99;gpu.draw(input);const before=pixels();
  let maximum=0;for(const t of [17.01,34.01,51.01]){gpu.contour.time=t;gpu.draw(input);maximum=Math.max(maximum,distance(before,pixels()));}
  gpu.contour.time=time;gpu.contour.data.set(saved);gpu.contour.currentData.set(currents);gpu.draw(input);return maximum;
 })()`);
 if(report.continuousBrush>.001)throw Error('Brush still fades or redraws on a timer');
 report.materials=await run(`(async()=>{
  const {ContourMotion,CONTOUR_INK_WIDTH}=await import('/contour-motion.js'),gl=gpu.gl,fixture=new ContourMotion(),target=gpu.target(256,256),floating=gpu.hdr,range=floating?1:255;
  const upload=()=>{gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,gpu.inkTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,CONTOUR_INK_WIDTH,4,gl.RGBA,gl.FLOAT,fixture.data);};
  const paint=(age,stage=0,count=1,bridge=false)=>{upload();gpu.bind(target);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gpu.use(gpu.contourDrops,{u_inkTime:.1+age,u_inkStage:stage,u_ratio:1,u_resolution:[256,256]});gpu.texture(gpu.contourDrops,'u_inkData',gpu.inkTexture,9);gl.drawArraysInstanced(gl.TRIANGLES,0,stage?12:6,count);if(bridge)gl.drawArraysInstanced(gl.TRIANGLES,11*6,6,count);const p=floating?new Float32Array(256*256*4):new Uint8Array(256*256*4);gl.readPixels(0,0,256,256,gl.RGBA,floating?gl.FLOAT:gl.UNSIGNED_BYTE,p);return p;};
  const roi=(pixels,x,y)=>{let value=0,n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++){const at=((Math.round(y)+j)*256+Math.round(x)+i)*4;value+=(pixels[at]+pixels[at+1]+pixels[at+2])/(3*range);n++;}return value/n;};
  fixture.drops.set([0,0,.1,.8]);fixture.details.set([.24,.6,2,.37]);fixture.tints.set([1,.04,.02,0]);
  const shine=age=>{const pixels=paint(age),r=.24*(.34+.66*(1-Math.exp(-Math.max(0,age-.6)*7)));return roi(pixels,128-.30*r*128,128+.31*r*128);};
  const wet=shine(.8),dry=shine(3.1);
  fixture.data.fill(0);fixture.drops.set([-.1,0,.1,.8, .1,0,.1,.8]);fixture.details.set([.09,.6,1,.37, .09,.6,1,.4]);fixture.tints.set([1,.04,.02,0, 1,.04,.02,0]);
  const separate=roi(paint(1.5,0,2),128,128);fixture.links.set([.1,0,.09,1, -.1,0,.09,1]);const joined=roi(paint(1.5,0,2,true),128,128);
  fixture.data.fill(0);fixture.drops.set([0,0,.1,.8]);fixture.details.set([.2,.6,1,.37]);fixture.tints.set([1,.04,.02,1]);
  const inkMean=p=>{let sum=0;for(let i=0;i<p.length;i+=4)sum+=1-(p[i]+p[i+1]+p[i+2])/(3*range);return sum/(p.length/4);};
  const fresh=inkMean(paint(3));fixture.data.fill(0);fixture.memory.set([0,0,.1,.06]);fixture.details.set([.2,.6,1,.37],64*4);fixture.tints.set([1,.04,.02,1],64*4);const memory=inkMean(paint(4,1));
  gl.deleteTexture(target.texture);gl.deleteFramebuffer(target.frame);gpu.draw(input);return {wet,dry,separate,joined,fresh,memory};
 })()`);
 if(report.materials.wet<report.materials.dry+.035||report.materials.separate-report.materials.joined<.025||report.materials.memory<=0||report.materials.memory>report.materials.fresh*.20)throw Error('Wet ink / pool joining / faint memory failed: '+JSON.stringify(report.materials));
 report.currents=await run(`(async()=>{
  const {ContourMotion,CONTOUR_CURRENT_WIDTH}=await import('/contour-motion.js'),gl=gpu.gl,fixture=new ContourMotion(),target=gpu.target(512,512),floating=gpu.hdr,range=floating?1:255;
  fixture.writeCurrent(0,-.65,-.25,.4,.9,.37,0,[1,.03,.02,1]);fixture.writeCurrent(32,0,0,.4,.9,.37,1,[1,.03,.02,1]);
  gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,gpu.currentTexture);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,CONTOUR_CURRENT_WIDTH,4,gl.RGBA,gl.FLOAT,fixture.currentData);
  const paint=(age,stage=0,phase=0)=>{gpu.bind(target);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gpu.use(gpu.contourCurrent,{u_inkTime:age,u_currentStage:stage,u_currentPhase:phase,u_segments:40,u_ratio:1,u_resolution:[512,512],u_movement:1,u_inkMaterial:[.8,.9,.4,.5],u_roles:[.4,.5,.4,.2],u_spectrum:new Float32Array(48)});gpu.texture(gpu.contourCurrent,'u_currentData',gpu.currentTexture,10);gl.drawArraysInstanced(gl.TRIANGLES,0,(stage?31:3)*40*6,1);const pixels=floating?new Float32Array(512*512*4):new Uint8Array(512*512*4);gl.readPixels(0,0,512,512,gl.RGBA,floating?gl.FLOAT:gl.UNSIGNED_BYTE,pixels);return pixels;};
  const absorption=p=>{let sum=0;for(let i=0;i<p.length;i+=4)sum+=1-(p[i]+p[i+1]+p[i+2])/(3*range);return sum/(p.length/4);};
  const early=absorption(paint(.2)),wet=paint(3),grown=absorption(wet),pulseChange=distance(wet,paint(3,0,.3))/range,expired=absorption(paint(9.1));
  const bud=absorption(paint(.4,1)),bloom=absorption(paint(3,1)),trace=absorption(paint(10,1)),gone=absorption(paint(15.1,1));
  gl.deleteTexture(target.texture);gl.deleteFramebuffer(target.frame);gpu.draw(input);return {early,grown,pulseChange,expired,bud,bloom,trace,gone};
 })()`);
 if(report.currents.grown<report.currents.early*2||report.currents.pulseChange<.00001||report.currents.expired>.000001||report.currents.bloom<report.currents.bud*2||report.currents.trace<=0||report.currents.trace>report.currents.bloom*.25||report.currents.gone>.000001)throw Error('Ink current growth, transport or bloom drying failed: '+JSON.stringify(report.currents));
 report.pressure=await run(`(async()=>{
  const {CONTOUR_VERTEX,CONTOUR_FRAGMENT}=await import('/contour-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl;
  const p=await compileSceneProgram(gl,CONTOUR_VERTEX,CONTOUR_FRAGMENT,['gl_Position','v_density']),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,60,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);
  gpu.use(p,{u_ratio:1.6,u_movement:1,u_strands:1,u_segments:192,u_inkLayer:3,u_roles:[0,0,0,0],u_spectrum:new Float32Array(48),u_spectrumLight:new Float32Array(48)});
  const sample=material=>{gpu.uniform(p,'u_inkMaterial',material);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,60*6,3);gl.endTransformFeedback();const value=new Float32Array(15);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,value);return {width:Math.hypot(value[0]-value[10],value[1]-value[11]),density:value[4]};};
  const quiet=sample([0,0,.3,0]),loaded=sample([.95,.9,.5,.2]);
  gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.deleteProgram(p.program);gpu.draw(input);return {quiet,loaded};
 })()`);
 if(report.pressure.quiet.width<=0||report.pressure.loaded.width<report.pressure.quiet.width*1.5||report.pressure.loaded.density<report.pressure.quiet.density*1.5)throw Error('Musical brush pressure is ineffective: '+JSON.stringify(report.pressure));
 report.light=await run(`(()=>{
  const gl=gpu.gl,bloom=d.appearance.bloom;gpu.draw(input);const lit=pixels();d.appearance.bloom=0;gpu.draw(input);const bloomDifference=distance(lit,pixels());d.appearance.bloom=bloom;
  const use=gpu.use.bind(gpu),draw=gl.drawArrays.bind(gl),instanced=gl.drawArraysInstanced.bind(gl);let skip=false;gpu.use=(p,u)=>{skip=p===gpu.contourDrops||(p===gpu.contourBrush&&u.u_inkLayer===1);use(p,u);};gl.drawArrays=(...args)=>{if(!skip)draw(...args);};gl.drawArraysInstanced=(...args)=>{if(!skip)instanced(...args);};
  gpu.draw(input);const black=pixels(0),halo=pixels(1);let emission=0,glow=0;for(let i=0;i<black.length;i+=4)emission+=black[i+3];for(let i=0;i<halo.length;i+=4)glow+=halo[i]+halo[i+1]+halo[i+2];
  gpu.use=use;gl.drawArrays=draw;gl.drawArraysInstanced=instanced;gpu.draw(input);const paper=pixels(3);let paperMean=0;for(let i=0;i<paper.length;i+=4)paperMean+=(paper[i]+paper[i+1]+paper[i+2])/3;paperMean/=paper.length/4;
  return {bloomDifference,blackEmission:emission,blackGlow:glow,paperMean};
 })()`);
 if(report.light.bloomDifference<.03||report.light.blackEmission!==0||report.light.blackGlow!==0||report.light.paperMean<.92||report.light.paperMean>.98)throw Error('Ink glow isolation failed: '+JSON.stringify(report.light));
 await run('step(3.025)');await shot('splash');
 report.palette=await run(`(()=>{const before=[...gpu.contour.accent];d.colors=[[.02,.65,.9],[.03,.4,.8],[.02,.5,.8]];for(let i=1;i<=180;i++)step(3.025+i/60);return {before,after:[...gpu.contour.accent]};})()`);await shot('cool-ink');
 if(report.palette.after[2]<report.palette.before[2]+.2)throw Error('Palette has no visible range');
 report.trackTransition=await run(`(()=>{
  gpu.draw(input);const saved={features:input.features,roles:d.roles,light:d.spectrumLight},before=pixels(),data=gpu.contour.data.slice(),currents=gpu.contour.currentData.slice(),spectrum=gpu.contour.spectrum.slice();
  d.trackId='contour-transition-next';input.features={...input.features,spectrum:new Float32Array(48),loudness:0,onset:0};d.roles={bass:0,drums:0,lead:0,texture:0};d.spectrumLight=new Float32Array(48);gpu.draw(input);
  const held=distance(before,pixels()),preserved=distance(data,gpu.contour.data)+distance(currents,gpu.contour.currentData);
  d.spectrumClock+=1/60;input.time+=1/60;gpu.draw(input);const step=Math.max(...gpu.contour.spectrum.map((v,i)=>Math.abs(v-spectrum[i])));
  input.features=saved.features;d.roles=saved.roles;d.spectrumLight=saved.light;return {held,preserved,step};
 })()`);
 if(report.trackTransition.held>.00001||report.trackTransition.preserved!==0||report.trackTransition.step>.04)throw Error('Track change erased or snapped the painting: '+JSON.stringify(report.trackTransition));
 report.held=await run(`(()=>{gpu.draw(input);const before=pixels(),time=gpu.contour.time;input.time+=300;gpu.draw(input);const paused=distance(before,pixels());input.reduced=true;d.spectrumClock+=.1;gpu.draw(input);const reduced=gpu.contour.time===time;input.reduced=false;gpu.draw(input);const flat=pixels();d.camera=[1.2,-.6,.8,3];gpu.draw(input);return {paused,reduced,camera:distance(flat,pixels())};})()`);
 if(report.held.paused>.001||!report.held.reduced||report.held.camera>.001)throw Error('Flat / frozen behavior regressed');
 for(const [name,seconds]of [['rain-built-up',14],['continuous-gesture',31]]){
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
