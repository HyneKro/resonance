// Hidden, isolated visual QA. Generated music only; no user library or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/synapse');
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
  window.d=reactor.visualState(.016);delete d.astraClock;delete d.astraActive;delete d.contourClock;delete d.contourActive;delete d.contourHold;delete d.synapseClock;delete d.synapseActive;delete d.synapseHold;const features=musicalAuditFrames[2].features;d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;d.spectrumLight=Float32Array.from(features.spectrum,x=>x*.7);
  window.input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'high',intensity:1.5,scale:1,reduced:false,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Warmup failed');
  window.renderStyle=(index,shape=8)=>{d.artMotion=[input.time*.45,input.time*1.4,input.time*.15,input.time*.16];d.artStyle={index,opacity:1};d.identity.sculpture=[shape,shape,1,1];gpu.draw(input);if(gpu.gl.getError())throw Error('WebGL draw error');};
 })()`);



 const report={};
 const shot=async name=>{await new Promise(r=>setTimeout(r,50));fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());};
 await run(`window.pixels=(index=-1)=>{if(index<0)gpu.draw(input);const gl=gpu.gl,t=index<0?null:gpu.targets[index];gpu.bind(t);const a=t&&gpu.hdr?new Float32Array(t.w*t.h*4):new Uint8Array((t?.w||gpu.canvas.width)*(t?.h||gpu.canvas.height)*4);gl.readPixels(0,0,t?.w||gpu.canvas.width,t?.h||gpu.canvas.height,gl.RGBA,t&&gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,a);return a;};
 window.distance=(a,b)=>a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length;
 window.rgb=()=>{const a=pixels(),c=[0,0,0];for(let i=0;i<a.length;i+=4)for(let k=0;k<3;k++)c[k]+=a[i+k];return c.map(x=>x/(a.length/4));};
 window.advance=(seconds,active=true)=>{for(let i=0;i<Math.round(seconds*60);i++){d.spectrumClock+=1/60;input.time=d.spectrumClock;const t=d.spectrumClock,hit=active?Math.exp(-(t%.5)*35):0;
 d.roles={bass:active?.7:0,drums:hit,lead:active?.65:0,texture:active?.5:0,shimmer:active?.5:0};input.features={...input.features,onset:hit,loudness:active?.8:0};d.synapseActive=active;renderStyle(7);}};
 d.camera=[0,0,0,0];gpu.synapse.reset();d.spectrumClock=0;renderStyle(7);advance(3);void 0;`);
 await shot('active');
 report.reactivity=await run(`(()=>{
  const s=gpu.synapse,arrays=['roles','spectrum','detail','events','origins','accents'],scalars=['energy','activity','shimmer','flux','beat','tension'];
  const saved=Object.fromEntries([...arrays.map(k=>[k,s[k].slice()]),...scalars.map(k=>[k,s[k]])]);
  const energy=index=>{const a=pixels(index);let total=0,hot=0;for(let i=0;i<a.length;i+=4){total+=a[i]+a[i+1]+a[i+2];if(Math.max(a[i],a[i+1],a[i+2])>1)hot++;}return {total:total/(a.length/4),hot};};
  for(const k of arrays)s[k].fill(0);for(const k of scalars)s[k]=0;gpu.draw(input);const quiet=energy(0),quietBloom=energy(1);
  s.roles.set([.8,.8,.8,.5]);s.energy=.8;s.activity=.8;s.shimmer=.8;s.flux=.5;s.beat=.8;s.spectrum.fill(.7);s.accents.set([.8,.6,.7]);
  for(let i=0;i<48;i++)s.detail.set([.8,.7,.6,.25],i*4);gpu.draw(input);const music=energy(0),musicBloom=energy(1),bloomOn=rgb().reduce((a,b)=>a+b,0);
  const bloom=d.appearance.bloom;d.appearance.bloom=0;gpu.draw(input);const bloomOff=rgb().reduce((a,b)=>a+b,0);d.appearance.bloom=bloom;
  const gl=gpu.gl,native=gl.drawArrays.bind(gl);gl.drawArrays=(mode,first,count)=>{if(gl.getParameter(gl.CURRENT_PROGRAM)===gpu.synapseThreads.program&&gl.getUniform(gpu.synapseThreads.program,gpu.location(gpu.synapseThreads,'u_threadLayer'))>1.5)return;native(mode,first,count);};
  gpu.draw(input);const withoutStreams=energy(0);gl.drawArrays=native;
  for(const k of arrays)s[k].set(saved[k]);for(const k of scalars)s[k]=saved[k];gpu.draw(input);
  return {quiet,music,quietBloom,musicBloom,lightRatio:music.total/quiet.total,bloomRatio:musicBloom.total/Math.max(.000001,quietBloom.total),bloomOn,bloomOff,streamEnergy:music.total-withoutStreams.total};
 })()`);
 if(report.reactivity.lightRatio<8||report.reactivity.bloomRatio<8||report.reactivity.bloomOn<report.reactivity.bloomOff*1.1||report.reactivity.streamEnergy<.0001)throw Error('Synapse response is too restrained: '+JSON.stringify(report.reactivity));

 report.fabric=await run(`(()=>{const n=gpu.synapseNetworks[1700],count=n.facetCount,before=pixels(0);n.facetCount=0;gpu.draw(input);const without=pixels(0);n.facetCount=count;gpu.draw(input);return {facets:n.faces.size,vertices:count*3,delta:distance(before,without)};})()`);
 if(report.fabric.facets<80||report.fabric.delta<.00001)throw Error('Translucent facets and woven detail do not render');

 report.motion=await run(`(()=>{const n=gpu.synapseNetworks[1700],before=n.nodes.slice(),pairs=new Set(n.links.keys()),image=pixels();advance(2);const delta=distance(image,pixels());return {movingNodes:Array.from({length:n.count},(_,i)=>Math.hypot(...[0,1,2].map(k=>n.nodes[i*4+k]-before[i*4+k]))).filter(x=>x>.025).length,newConnections:[...n.links.keys()].filter(k=>!pairs.has(k)).length,pixelDelta:delta,links:n.links.size,capacity:n.capacity};})()`);
 if(report.motion.movingNodes<1683||report.motion.newConnections<100||report.motion.pixelDelta<.5)throw Error('Network does not organically rearrange: '+JSON.stringify(report.motion));
 report.hold=await run(`(()=>{const before=pixels();input.time+=90;renderStyle(7);const clockHeld=distance(before,pixels());const time=gpu.synapse.time;input.reduced=true;d.spectrumClock+=.1;renderStyle(7);const reducedHeld=gpu.synapse.time===time?0:1;input.reduced=false;d.synapseHold=true;d.spectrumClock+=.1;renderStyle(7);const frozenHeld=distance(before,pixels());d.synapseHold=false;return {clockHeld,reducedHeld,frozenHeld};})()`);
 if(Object.values(report.hold).some(x=>x>.001))throw Error('Held network changes: '+JSON.stringify(report.hold));
 report.shockwave=await run(`(async()=>{
  const {SYNAPSE_NODE_VERTEX,SYNAPSE_NODE_FRAGMENT}=await import('/synapse-shaders.js'),{compileSceneProgram}=await import('/shader-loader.js'),gl=gpu.gl,n=gpu.synapseNetworks[1700];
  const source=SYNAPSE_NODE_VERTEX.replace('out vec3 v_color;','out vec4 v_probe;out vec3 v_color;').replace('gl_Position=projectWeb(p);v_seed=data.w;','v_probe=vec4(p,impulse(p));gl_Position=projectWeb(p);v_seed=data.w;');
  const p=await compileSceneProgram(gl,source,SYNAPSE_NODE_FRAGMENT,['v_probe']),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback();
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER,buffer);gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER,n.count*16,gl.DYNAMIC_READ);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);
  const events=new Float32Array(32),origins=new Float32Array(32);events.set([0,1,0,0]);
  gpu.use(p,{u_nodeLayer:0,u_signalTime:0,u_signals:events,u_origins:origins,u_light:[1,1,.2,1],u_movement:1,u_particle:[1,1,1,1],u_resolution:[1280,800],u_focalLength:1.9,u_pixel:1,u_neural:[0,1,1,1],u_camera:[0,0,0,0]});gpu.texture(p,'u_nodes',gpu.synapseTextures[1700][0],7);
  const sample=age=>{gpu.uniform(p,'u_signalTime',age);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,n.count);gl.endTransformFeedback();const a=new Float32Array(n.count*4);gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER,0,a);let weight=0,radius=0;for(let i=0;i<a.length;i+=4){const w=a[i+3];weight+=w;radius+=w*Math.hypot(a[i],a[i+1],a[i+2]);}return {radius:radius/weight,weight};};
  const near=sample(.35),far=sample(1.1);gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);gl.deleteProgram(p.program);gpu.draw(input);return {near,far};
 })()`);
 if(report.shockwave.far.radius-report.shockwave.near.radius<1.1||report.shockwave.near.weight<1||report.shockwave.far.weight<1)throw Error('Single-point impulse did not expand in 3D: '+JSON.stringify(report.shockwave));
 report.colours={};
 for(const [name,colors]of [['warm',[[.95,.025,.06],[.8,.02,.04],[1,.09,.02]]],['cool',[[.02,.1,.9],[.025,.2,.95],[.03,.08,1]]]]){
  await run(`d.colors=${JSON.stringify(colors)};advance(4);`);report.colours[name]=await run('rgb()');await shot(name);
 }
 if(report.colours.warm[0]<report.colours.warm[2]*1.4||report.colours.cool[2]<report.colours.cool[0]*1.4)throw Error('Music palettes are not visibly distinct: '+JSON.stringify(report.colours));
 report.camera=[];
 for(const [name,camera]of [['side',[1.57,0,0,0]],['oblique',[.9,.6,0,0]],['back',[3.14,.2,0,0]]]){
  await run(`d.camera=${JSON.stringify(camera)};renderStyle(7);`);const c=await run('rgb()');report.camera.push({name,rgb:c});if(c.reduce((a,b)=>a+b,0)<3)throw Error('Empty camera angle');await shot(name);
 }
 report.pause=await run(`(()=>{const active=gpu.synapse.activity,phase=gpu.synapse.phase;advance(1,false);const afterOne=gpu.synapse.activity;advance(4,false);return {active,afterOne,settled:gpu.synapse.activity,phaseAdvanced:gpu.synapse.phase>phase};})()`);
 if(!(report.pause.afterOne>0&&report.pause.afterOne<report.pause.active&&report.pause.settled<.001&&report.pause.phaseAdvanced))throw Error('Pause did not settle');
 // Explicitly exercise an RGBA8 background target, even on a float-capable GPU.
 report.gradient=await run(`(()=>{const gl=gpu.gl,wasHDR=gpu.hdr;gpu.hdr=false;const target=gpu.target(1024,64);gpu.hdr=wasHDR;gpu.bind(target);gl.disable(gl.BLEND);gpu.use(gpu.synapseBackground,{u_roles:[.7,.2,.4,.2],u_palette:gpu.synapse.palette});gpu.quadDraw(gpu.synapseBackground);const a=new Uint8Array(1024*64*4);gl.readPixels(0,0,1024,64,gl.RGBA,gl.UNSIGNED_BYTE,a);const values=[new Set(),new Set(),new Set()];let jump=0;for(let x=0;x<1024;x++){const k=(32*1024+x)*4;for(let c=0;c<3;c++){values[c].add(a[k+c]);if(x)jump=Math.max(jump,Math.abs(a[k+c]-a[k+c-4]));}}gl.deleteFramebuffer(target.frame);gl.deleteTexture(target.texture);gpu.draw(input);return {encodedSteps:Math.max(...values.map(v=>v.size)),largestAdjacentStep:jump};})()`);
 if(report.gradient.encodedSteps<8||report.gradient.largestAdjacentStep>3)throw Error('Background gradient quantized: '+JSON.stringify(report.gradient));
 report.desktop=await run(`(()=>{const samples=[];for(let i=0;i<45;i++){const begin=performance.now();advance(1/60);gpu.gl.finish();if(i>10)samples.push(performance.now()-begin);}samples.sort((a,b)=>a-b);return {medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],nodes:1700,facets:gpu.synapseNetworks[1700].faces.size};})()`);
 await run(`gpu.mobile=true;input.width=412;input.height=915;input.quality='eco';d.portraitScene=true;d.camera=[0,0,0,0];advance(2);`);win.setSize(412,915);await new Promise(r=>setTimeout(r,120));await run('renderStyle(7)');await shot('phone');
 report.mobile=await run(`(()=>{const samples=[],n=gpu.synapseNetworks[680];for(let i=0;i<45;i++){const begin=performance.now();advance(1/60);gpu.gl.finish();if(i>10)samples.push(performance.now()-begin);}samples.sort((a,b)=>a-b);return {rgb:rgb(),count:n.count,links:n.links.size,medianMs:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)]};})()`);
 if(report.mobile.rgb.reduce((a,b)=>a+b,0)<3)throw Error('Phone canvas is blank');
 if(report.mobile.links>=3400)throw Error('Phone connection budget exceeded');
 if(await run('gpu.gl.getError()'))throw Error('WebGL audit error');
 fs.writeFileSync(path.join(out,'render-report.json'),JSON.stringify(report,null,2));log(JSON.stringify(report));if(errors.length)throw Error(errors.join('\n'));
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});
setTimeout(()=>{app.exit(2);},180000).unref();
