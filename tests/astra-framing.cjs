// Reproduce the non-camera "zoom": a real musical arrival resizes the entire
// system, then a source reset removes that pulse. No private data or audio output.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/astra-framing');fs.mkdirSync(out,{recursive:true});
app.setPath('userData',fs.mkdtempSync(path.join(out,'profile-')));let win,service,code=0;
const log=s=>fs.appendFileSync(path.join(out,'report.log'),String(s)+'\n');
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 const serve=service.server.listeners('request')[0];service.server.removeAllListeners('request');
 service.server.on('request',(req,res)=>{if(req.url==='/framing-probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body></body>');}else serve(req,res);});
 win=new BrowserWindow({show:false,width:960,height:600,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 await win.loadURL(service.url+'/framing-probe');
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const {GPUScene}=await import('/gpu-scene.js'),{MusicalResponse}=await import('/musical-response.js'),{SceneCamera}=await import('/scene-camera.js');
  document.body.innerHTML='';document.body.style.margin='0';
  const canvas=document.createElement('canvas');canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%';document.body.append(canvas);
  const gpu=new GPUScene(canvas);await gpu.preparing;
  const silent=new Float32Array(48),features={loudness:0,onset:0,spectrum:silent,bands:new Float32Array(8),accents:[0,0,0],atmosphere:{bands:new Float32Array(8),accents:[0,0,0],loudness:0}};
  const d={artStyle:{index:3,opacity:1},colors:[[1,.2,.03],[.1,.3,1],[.7,.2,.9]],roles:{},appearance:{motionAmount:0,particleSpread:1},camera:[.35,.28,0,0],cameraFocalLength:1.9,astraClock:0,astraActive:true};
  const input={width:960,height:600,time:0,features,dynamics:d,quality:'high',intensity:1,hdrMode:'off'};
  gpu.draw(input);await gpu.warming;if(!gpu.draw(input))throw Error('Astra did not render');
  const reports=[];
  for(const mobile of [false,true]){
   gpu.mobile=mobile;gpu.astra.reset();const musical=new MusicalResponse(),camera=new SceneCamera();camera.drag(70,56);
   let previous=1,previousTarget=1,maxStep=0,maxTargetStep=0,maxCameraDepth=0,peak=1,largestImageStep=0,previousPixels;
   for(let i=0;i<360;i++){
    const loud=i>=210,raw={db:loud?-12:-40,bands:new Float32Array(8).fill(loud?.8:.15),harmonic:silent,percussive:silent,hits:[loud&&i%15===0?.8:0,0,0]};
    const r=musical.update({...raw,accents:[0,0,0],morph:[.3,.3,.3,.3],loudness:.5},raw,1/60,{time:i/60});
    const target=1-r.tension*.025+r.arrival*.018;d.appearance.particleSpread=target;d.astraClock=input.time=i/60;
    d.camera=camera.update(1/60,{zoom:false,features:{loudness:loud?1:0,bands:raw.bands}});d.cameraFocalLength=camera.focalLength;
    gpu.draw(input);maxCameraDepth=Math.max(maxCameraDepth,Math.abs(d.camera[2]));
    let scale;
    for(const program of [gpu.astraBodies,gpu.astraPaths,gpu.astraDust,gpu.astraDebris]){
     const uploaded=gpu.gl.getUniform(program.program,gpu.location(program,'u_particle'))[0];
     if(scale!==undefined&&Math.abs(uploaded-scale)>1e-6)throw Error('Astra layers no longer share a common scale');scale=uploaded;
    }
    maxStep=Math.max(maxStep,Math.abs(scale-previous));maxTargetStep=Math.max(maxTargetStep,Math.abs(target-previousTarget));peak=Math.max(peak,scale);
    if(i>=220&&i<=265){
     gpu.bind(null);const pixels=new Uint8Array(960*600*4);gpu.gl.readPixels(0,0,960,600,gpu.gl.RGBA,gpu.gl.UNSIGNED_BYTE,pixels);
     if(previousPixels){let total=0;for(let j=0;j<pixels.length;j+=4)total+=Math.abs(pixels[j]-previousPixels[j])+Math.abs(pixels[j+1]-previousPixels[j+1])+Math.abs(pixels[j+2]-previousPixels[j+2]);largestImageStep=Math.max(largestImageStep,total/(960*600*3));}previousPixels=pixels;
    }
    previous=scale;previousTarget=target;if(i===240)musical.resetEvidence();
    if(gpu.gl.getError())throw Error('Graphics error');
   }
   reports.push({mobile,maxStep,maxTargetStep,maxCameraDepth,peak,largestImageStep});
  }
  return reports;
 })()`,true);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2));log(JSON.stringify(result));
 for(const r of result){assert.equal(r.maxCameraDepth,0);assert.ok(r.maxTargetStep>.015,'Fixture reproduces the unfiltered framing jump');assert.ok(r.maxStep<.0007,'Astra must ease phrase scale with Camera zoom off');assert.ok(r.peak>1.005);}
 log('PASS: desktop and phone shader budgets; fixed camera; musical arrival and source reset.');
}).catch(e=>{code=1;log(e.stack);}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(code);});
setTimeout(()=>app.exit(2),150000).unref();
