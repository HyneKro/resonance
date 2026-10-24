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
 // Render equal junctions directly into the scene target, without bloom. A
 // distant junction must retain a small sharp footprint instead of bokeh.
 report.focus=await run(`(()=>{const gl=gpu.gl,n=gpu.synapseNetworks[1700],saved=n.nodes.slice(),target=gpu.target(512,256);
  const upload=()=>{gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,gpu.synapseTextures[1700][0]);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1700,3,gl.RGBA,gl.FLOAT,n.nodes);};
  n.nodes.set([-4.4,0,-2.4,.4,0,0,0,.4,2,0,2.4,.4]);for(let i=0;i<3;i++)n.nodes.set([1,0,.6,0],1700*8+i*4);upload();gpu.bind(target);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.disable(gl.BLEND);
  gpu.use(gpu.synapseNodes,{u_resolution:[512,256],u_camera:[0,0,0,0],u_focalLength:2,u_pixel:1,u_particle:[1,1,1,1],u_movement:0,u_nodeLayer:0,u_roles:[0,0,0,0],u_shimmer:0,u_neuralTone:[.5,0,0,1],u_neural:[0,0,0,0],u_light:[0,0,0,1]});gl.drawArrays(gl.POINTS,0,3);
  const data=gpu.hdr?new Float32Array(512*256*4):new Uint8Array(512*256*4);gl.readPixels(0,0,512,256,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,data);
  const widths=[];for(let point=0;point<3;point++){let lo=512,hi=-1;const center=128+point*128;for(let y=0;y<256;y++)for(let x=center-48;x<center+48;x++){const k=(y*512+x)*4;if(Math.max(data[k],data[k+1],data[k+2])>(gpu.hdr?.00001:0)){lo=Math.min(lo,x);hi=Math.max(hi,x);}}widths.push(hi-lo+1);}
  n.nodes.set(saved);upload();gl.deleteFramebuffer(target.frame);gl.deleteTexture(target.texture);gpu.draw(input);return {far:widths[0],middle:widths[1],near:widths[2]};})()`);
 if(Object.values(report.focus).some(x=>x<=0||x>14)||report.focus.far>report.focus.near)throw Error('Junctions are still defocused: '+JSON.stringify(report.focus));
 report.reactivity=await run(`(()=>{
  const s=gpu.synapse,arrays=['roles','spectrum','detail','motionBands','events','accents'],scalars=['energy','activity','shimmer','flux','beat','tension'];
  const saved=Object.fromEntries([...arrays.map(k=>[k,s[k].slice()]),...scalars.map(k=>[k,s[k]])]);
  const energy=index=>{const a=pixels(index);let total=0,hot=0;for(let i=0;i<a.length;i+=4){total+=a[i]+a[i+1]+a[i+2];if(Math.max(a[i],a[i+1],a[i+2])>1)hot++;}return {total:total/(a.length/4),hot};};
  const network=gpu.synapseNetworks[1700],toneStart=1700*8,tones=network.nodes.slice(toneStart);const upload=()=>{gpu.gl.activeTexture(gpu.gl.TEXTURE7);gpu.gl.bindTexture(gpu.gl.TEXTURE_2D,gpu.synapseTextures[1700][0]);gpu.gl.texSubImage2D(gpu.gl.TEXTURE_2D,0,0,0,1700,3,gpu.gl.RGBA,gpu.gl.FLOAT,network.nodes);};network.nodes.fill(0,toneStart);upload();
  for(const k of arrays)s[k].fill(0);for(const k of scalars)s[k]=0;gpu.draw(input);const quiet=energy(0),quietBloom=energy(1);
  network.nodes.set(tones,toneStart);upload();s.roles.set([.8,.8,.8,.5]);s.energy=.8;s.activity=.8;s.shimmer=.8;s.flux=.5;s.beat=.8;s.spectrum.fill(.7);s.accents.set([.8,.6,.7]);
  for(let i=0;i<48;i++){s.detail.set([.8,.7,.6,.25],i*4);s.motionBands.set([.8,.7,.6,.25],i*4);}gpu.draw(input);const music=energy(0),musicBloom=energy(1),bloomOn=rgb().reduce((a,b)=>a+b,0);
  const bloom=d.appearance.bloom;d.appearance.bloom=0;gpu.draw(input);const bloomOff=rgb().reduce((a,b)=>a+b,0);d.appearance.bloom=bloom;
  const gl=gpu.gl,native=gl.drawArrays.bind(gl);gl.drawArrays=(mode,first,count)=>{if(gl.getParameter(gl.CURRENT_PROGRAM)===gpu.synapseThreads.program&&gl.getUniform(gpu.synapseThreads.program,gpu.location(gpu.synapseThreads,'u_threadLayer'))>1.5)return;native(mode,first,count);};
  gpu.draw(input);const withoutStreams=energy(0);gl.drawArrays=native;
  for(const k of arrays)s[k].set(saved[k]);for(const k of scalars)s[k]=saved[k];gpu.draw(input);
  return {quiet,music,quietBloom,musicBloom,lightRatio:music.total/quiet.total,bloomRatio:musicBloom.total/Math.max(.000001,quietBloom.total),bloomOn,bloomOff,streamEnergy:music.total-withoutStreams.total};
 })()`);
 if(report.reactivity.lightRatio<1.5||report.reactivity.bloomRatio<1.5||report.reactivity.bloomOn<report.reactivity.bloomOff+.01||report.reactivity.streamEnergy<.000001)throw Error('Synapse musical light, bloom or currents are missing: '+JSON.stringify(report.reactivity));

 report.fabric=await run(`(()=>{const n=gpu.synapseNetworks[1700],count=n.facetCount,before=pixels(0);n.facetCount=0;gpu.draw(input);const without=pixels(0);n.facetCount=count;gpu.draw(input);return {facets:n.faces.size,vertices:count*3,delta:distance(before,without)};})()`);
 if(report.fabric.facets<80||report.fabric.delta<.00001)throw Error('Translucent facets and woven detail do not render');

 report.motion=await run(`(()=>{const n=gpu.synapseNetworks[1700],before=n.nodes.slice(),pairs=new Set(n.links.keys()),image=pixels();advance(2);const delta=distance(image,pixels()),travel=Array.from({length:n.count},(_,i)=>Math.hypot(...[0,1,2].map(k=>n.nodes[i*4+k]-before[i*4+k])));const mean=travel.reduce((a,b)=>a+b,0)/travel.length,variation=Math.sqrt(travel.reduce((a,b)=>a+(b-mean)**2,0)/travel.length)/mean;return {speedVariation:variation,movingNodes:travel.filter(x=>x>.025).length,quietNodes:travel.filter(x=>x<.01).length,livelyNodes:travel.filter(x=>x>.05).length,newConnections:[...n.links.keys()].filter(k=>!pairs.has(k)).length,pixelDelta:delta,links:n.links.size,capacity:n.capacity};})()`);
 if(report.motion.movingNodes<600||report.motion.speedVariation<.25||report.motion.livelyNodes<75||report.motion.newConnections<100||report.motion.pixelDelta<.5)throw Error('Network does not organically rearrange: '+JSON.stringify(report.motion));
 report.physicalAudio=await run(`(()=>{const n=gpu.synapseNetworks[1700];let energy=0;for(let i=0;i<n.count;i++)energy+=Math.hypot(n.audioMotion[i*6],n.audioMotion[i*6+1],n.audioMotion[i*6+2]);return {meanDisplacement:energy/n.count,burstsSpawned:n.burstsSpawned,activeBursts:Array.from({length:n.burstCapacity},(_,i)=>n.bursts[i*4+3]).filter(v=>v>.001).length,burstBudget:n.burstCapacity};})()`);
 if(report.physicalAudio.meanDisplacement<.10||report.physicalAudio.burstsSpawned<3||report.physicalAudio.activeBursts<1)throw Error('Audio affects light without physical motion: '+JSON.stringify(report.physicalAudio));
 report.hold=await run(`(()=>{const before=pixels();input.time+=90;renderStyle(7);const clockHeld=distance(before,pixels());const time=gpu.synapse.time;input.reduced=true;d.spectrumClock+=.1;renderStyle(7);const reducedHeld=gpu.synapse.time===time?0:1;input.reduced=false;d.synapseHold=true;d.spectrumClock+=.1;renderStyle(7);const frozenHeld=distance(before,pixels());d.synapseHold=false;return {clockHeld,reducedHeld,frozenHeld};})()`);
 if(Object.values(report.hold).some(x=>x>.001))throw Error('Held network changes: '+JSON.stringify(report.hold));
 report.currents=await run(`(()=>{const n=gpu.synapseNetworks[1700];return {routes:n.routes.length,capacity:n.currentCapacity,charged:n.nodes.slice(1700*8).filter((v,k)=>k%4===1&&v>.03).length,hasRadialUniform:gpu.location(gpu.synapseNodes,'u_signals[0]')!==null};})()`);
 if(report.currents.routes<1||report.currents.routes>report.currents.capacity||report.currents.charged>170||report.currents.hasRadialUniform)throw Error('Graph currents became a global shockwave: '+JSON.stringify(report.currents));
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
