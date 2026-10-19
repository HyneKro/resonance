// Executed in the isolated hidden Electron check. Uses generated signals only.
(async()=>{
 const {GPUScene}=await import('/gpu-scene.js'),{Reactor}=await import('/reactor.js'),{RibbonSpectrum}=await import('/particle-spectrum.js');
 const {compileSceneProgram}=await import('/shader-loader.js'),shader=await import('/scene-shaders.js');
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 const c=document.createElement('canvas');c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:999999';document.body.append(c);
 const gpu=window.auditGPU=new GPUScene(c);await gpu.preparing;check(!gpu.failed,'GPU preparation');
 const r=new Reactor({paused:false,currentTime:17}),d=r.visualState(.016),features=musicalAuditFrames[2].features;
 d.roles=musicalAuditFrames[2].roles;d.colors=[[.55,.24,.53],[.17,.48,.70],[.80,.49,.30]];d.background.colors=d.colors;
 const empty=new Float32Array(48),tone=band=>{const f={db:-24,spectrum:new Float32Array(48)};for(let i=0;i<48;i++)f.spectrum[i]=.85*Math.exp(-(((i-band)/2)**2));const model=new RibbonSpectrum();for(let i=0;i<60;i++)model.update(f,1/60);return model.levels;};
 const musicLight=new RibbonSpectrum();for(let i=0;i<60;i++)musicLight.update({db:-24,spectrum:features.spectrum},1/60);
 const lights={music:musicLight.levels,silent:empty,bass:tone(6),middle:tone(25),treble:tone(40),full:Float32Array.from({length:48},(_,i)=>.2+.5*(.5+.5*Math.sin(i*.6)))};
 const input={width:innerWidth,height:innerHeight,time:features.motion,features,dynamics:d,quality:'auto',intensity:.85,scale:1,reduced:false,hdrMode:'off'};
 let captured;const use=gpu.use.bind(gpu);gpu.use=(program,uniforms)=>{if(program===gpu.ribbonSpectrum)captured=uniforms;use(program,uniforms);};
 window.drawSpectrumAudit=(name='full')=>{d.spectrumLight=lights[name];return gpu.draw(input);};
 drawSpectrumAudit();await gpu.warming;check(drawSpectrumAudit(),'GPU warmup');
 const gl=gpu.gl,report={hdr:gpu.hdr,checks:[],energy:{}};
 function energy(){const target=gpu.targets[0];gpu.bind(target);const data=gpu.hdr?new Float32Array(target.w*target.h*4):new Uint8Array(target.w*target.h*4);gl.readPixels(0,0,target.w,target.h,gl.RGBA,gpu.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,data);let value=0;for(let i=0;i<data.length;i+=4)value+=data[i]+data[i+1]+data[i+2];return value;}
 for(const name of Object.keys(lights)){drawSpectrumAudit(name);report.energy[name]=energy();}
 for(const name of ['bass','middle','treble','full'])check(report.energy[name]>report.energy.silent+1,'Missing spectrum light: '+name);
 drawSpectrumAudit('silent');check(Math.abs(energy()-report.energy.silent)<.01,'Silence retains no extra light');
 report.checks.push('tone bands add visible light; silence matches the unlit scene');

 // Inspect the actual GPU vertex outputs, not a duplicate JS shader formula.
 const variants={spectrum:shader.RIBBON_SPECTRUM_VERTEX,ribbon:shader.PARTICLE_VERTEX},programs={};
 for(const [name,vertex] of Object.entries(variants))programs[name]=await compileSceneProgram(gl,vertex,shader.PARTICLE_FRAGMENT,['gl_Position','v_color','v_alpha']);
 const phases=[0,1,.1,.9,.25,.75,.49,.51,.5],seedValues=phases.flatMap(x=>[x,.43,.4,.6]);
 // The seam-only check can miss coverage problems across the ribbon's width.
 // Verify a full 97 x 17 surface grid in the actual vertex programs as well.
 for(let u=0;u<=96;u++)for(let v=0;v<=16;v++){phases.push(u/96);seedValues.push(u/96,Math.min(.9999,v/16),.4,.6);}
 const seeds=new Float32Array(seedValues),births=new Float32Array(phases.flatMap(()=>[0,999,.7,1]));
 const seedBuffer=gl.createBuffer(),birthBuffer=gl.createBuffer(),output=gl.createBuffer(),feedback=gl.createTransformFeedback();
 gl.bindBuffer(gl.ARRAY_BUFFER,seedBuffer);gl.bufferData(gl.ARRAY_BUFFER,seeds,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,birthBuffer);gl.bufferData(gl.ARRAY_BUFFER,births,gl.STATIC_DRAW);
 gl.bindBuffer(gl.ARRAY_BUFFER,output);gl.bufferData(gl.ARRAY_BUFFER,phases.length*8*4,gl.STREAM_READ);
 function inspect(program,uniforms){
  gpu.use(program,uniforms);const attributes=[];
  for(const [name,buffer] of [['a_seed',seedBuffer],['a_birth',birthBuffer]]){const a=gl.getAttribLocation(program.program,name);if(a>=0){gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,0,0);attributes.push(a);}}
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,output);gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,phases.length);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);attributes.forEach(a=>gl.disableVertexAttribArray(a));
  const result=new Float32Array(phases.length*8);gl.bindBuffer(gl.ARRAY_BUFFER,output);gl.getBufferSubData(gl.ARRAY_BUFFER,0,result);return Array.from({length:phases.length},(_,i)=>result.slice(i*8,i*8+8));
 }
 const uniforms={...captured,u_spectrumLight:Float32Array.from({length:48},(_,i)=>i/47)};
 const out=inspect(programs.spectrum,uniforms);
 for(const [a,b] of [[0,1],[2,3],[4,5],[6,7]])for(let i=4;i<8;i++)check(Math.abs(out[a][i]-out[b][i])<.00001,'Mirrored band/color seam mismatch');
 check(out[0][7]===0&&out[8][7]>out[4][7],'Low/high mapping');
 for(const style of [0,1,2,3]){
  const u={...uniforms,u_particleStyle:style},a=inspect(programs.spectrum,u),b=inspect(programs.ribbon,u);
  for(let j=0;j<phases.length;j++)for(let i=0;i<4;i++)check(Math.abs(a[j][i]-b[j][i])<.00001,'Spectrum does not follow ribbon geometry, style '+style);
 }
 const dark=inspect(programs.spectrum,{...uniforms,u_spectrumLight:empty});check(dark.every(x=>x[7]===0),'Zero input must have zero radiance');
 report.checks.push('GPU mirrored frequency/color endpoints','all particle color styles share exact ribbon geometry across 1,649 surface samples','zero input emits no light');
 const population=new Float32Array(Math.floor(49152*.094)*4),lengthBins=new Uint32Array(96),widthBins=new Uint32Array(16);
 gl.bindBuffer(gl.ARRAY_BUFFER,gpu.seeds);gl.getBufferSubData(gl.ARRAY_BUFFER,0,population);
 for(let i=0;i<population.length;i+=4){lengthBins[Math.min(95,Math.floor(population[i]*96))]++;widthBins[Math.min(15,Math.floor(population[i+1]*16))]++;}
 check(lengthBins.every(x=>x>0)&&widthBins.every(x=>x>0),'Missing mobile spectrum coverage');
 report.mobileCoverage={particles:population.length/4,lengthSegments:96,minPerLengthSegment:Math.min(...lengthBins),widthSegments:16,minPerWidthSegment:Math.min(...widthBins)};
 for(const program of Object.values(programs))gl.deleteProgram(program.program);for(const buffer of [seedBuffer,birthBuffer,output])gl.deleteBuffer(buffer);gl.deleteTransformFeedback(feedback);
 input.quality='eco';input.width=412;input.height=915;d.portraitScene=true;drawSpectrumAudit('full');check(gpu.canvas.width>gpu.canvas.height,'Phone portrait rotation');
 input.quality='high';input.width=1280;input.height=900;d.portraitScene=false;drawSpectrumAudit('full');check(gl.getError()===gl.NO_ERROR,'WebGL error');
 report.checks.push('eco portrait and high-detail GPU paths');
 input.quality='auto';input.width=innerWidth;input.height=innerHeight;c.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:999999';drawSpectrumAudit('full');return report;
})()
