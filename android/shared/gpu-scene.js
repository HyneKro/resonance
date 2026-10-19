import {compileSceneProgram} from './shader-loader.js';
import {cameraUniform} from './scene-camera.js';
import {ScenePreparation} from './scene-preparation.js';
import {KALEIDOSCOPE_MODES,kaleidoscopeIndex} from './kaleidoscope.js';
import {HDROutput} from './hdr-output.js';
import {visualDefaults} from './visual-settings.js';
import { expandPalette } from './artwork-palette.js?v=2';
import { QUAD, CELL_VERTEX, CELL_FRAGMENT, PARTICLE_VERTEX, PARTICLE_FRAGMENT, SPECTRAL_VERTEX, RIBBON_SPECTRUM_VERTEX, RIBBON_SPECTRUM_FRAGMENT, BIRTH_UPDATE, FLOW_UPDATE, FLOW_FRAGMENT, FLOW_VERTEX, BLOOM, FINISH } from './scene-shaders.js';
import { birthDistribution } from './particle-spectrum.js';
import { NEBULA_VERTEX, NEBULA_FRAGMENT } from './nebula-original.js';
import { NEBULA_LIVE } from './nebula-live.js';

export class GPUScene {
  constructor(canvas){
    this.canvas=canvas;this.failed=false;this.lost=false;this.ready=false;this.generation=0;this.needsFrame=true;
    this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,depth:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    if(!this.gl){this.failed=true;return;}
    this.output=new HDROutput(canvas,()=>{this.needsFrame=true;});
    canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;this.output.release();});
    canvas.addEventListener('webglcontextrestored',()=>{this.lost=false;this.targets=null;this.failed=false;this.prepare();});
    this.prepare();
  }
  prepare(){const generation=++this.generation;this.ready=false;this.warmed=false;this.warming=null;this.work=new ScenePreparation({cancelled:()=>generation!==this.generation||this.failed||this.lost});this.preparing=this.setup(generation).then(()=>{if(generation===this.generation&&!this.failed&&!this.lost){this.ready=true;this.needsFrame=true;}}).catch(e=>{if(generation===this.generation&&!this.failed&&!this.lost)this.fail(e);});}
  fail(error){this.failed=true;this.output?.release();console.warn('Visualizer fallback:',error.message);}
  dispose(){this.generation++;this.ready=false;this.failed=true;this.output?.dispose();this.gl?.getExtension('WEBGL_lose_context')?.loseContext();this.canvas.width=1;this.canvas.height=1;}
  async setup(generation){
    const gl=this.gl,work=this.work;await work.checkpoint();
    this.hdr=!!gl.getExtension('EXT_color_buffer_float');
    const specs=[['nebula',QUAD,NEBULA_LIVE],['nebulaParticles',NEBULA_VERTEX,NEBULA_FRAGMENT],['particles',PARTICLE_VERTEX,PARTICLE_FRAGMENT],['blur',QUAD,BLOOM],['finish',QUAD,FINISH],['spectral',SPECTRAL_VERTEX,PARTICLE_FRAGMENT],['ribbonSpectrum',RIBBON_SPECTRUM_VERTEX,RIBBON_SPECTRUM_FRAGMENT],['cells',CELL_VERTEX,CELL_FRAGMENT],['birthProgram',BIRTH_UPDATE,FLOW_FRAGMENT,['nextBirth']],['flowUpdate',FLOW_UPDATE,FLOW_FRAGMENT,['nextPosition','nextVelocity','nextBirth']],['flowDraw',FLOW_VERTEX,PARTICLE_FRAGMENT]];
    for(const [name,vertex,fragment,varyings]of specs){this[name]=await compileSceneProgram(gl,vertex,fragment,varyings,{cancelled:()=>generation!==this.generation||this.failed||this.lost,yieldWork:()=>work.checkpoint()});}
    this.flow=null;this.births=null;this.emptySpectrum=new Float32Array(48);this.birthCDF=new Float32Array(48);this.lastTime=undefined;this.lastMode=null;
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    this.maxParticles=262144;this.flowCapacity=32768;this.seeds=gl.createBuffer();let seed=8217;const data=new Float32Array(this.maxParticles*4);
    await work.fill(data.length,i=>{seed=(seed*1664525+1013904223)>>>0;data[i]=seed/4294967296;});
    await work.upload(gl,this.seeds,data,gl.STATIC_DRAW);
    const buffers=[];
    for(let i=0;i<2;i++){const buffer=gl.createBuffer();buffers.push(buffer);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,Math.floor(this.maxParticles*.42)*16,gl.DYNAMIC_COPY);await work.checkpoint();}
    this.births={program:this.birthProgram,buffers,current:0,feedback:gl.createTransformFeedback()};
    await this.setupFlow(work);await work.drain(gl);
  }
  location(p,name){if(!p.uniforms.has(name))p.uniforms.set(name,this.gl.getUniformLocation(p.program,name));return p.uniforms.get(name);}
  uniform(p,name,value){const gl=this.gl,loc=this.location(p,name);if(loc===null)return;if(Array.isArray(value)||ArrayBuffer.isView(value)){if(name==='u_harmonic'||name==='u_percussive')gl.uniform4fv(loc,value);else if(name==='u_spectrum'||name==='u_spectrumLight'||name==='u_birthCDF'||name==='u_themes'||name==='u_kaleidoWeights')gl.uniform1fv(loc,value);else if(name==='u_palette')gl.uniform3fv(loc,value);else if(value.length===4)gl.uniform4fv(loc,value);else if(value.length===3)gl.uniform3fv(loc,value);else gl.uniform2fv(loc,value);}else gl.uniform1f(loc,value);}
  use(p,uniforms={}){this.gl.useProgram(p.program);for(const [name,value]of Object.entries(uniforms))this.uniform(p,name,value);}
  texture(p,name,texture,unit=0){const gl=this.gl;gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(this.location(p,name),unit);}
  quadDraw(p){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);const a=gl.getAttribLocation(p.program,'a_position');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(a);}
  target(w,h,depth=false){
    const gl=this.gl,texture=gl.createTexture(),frame=gl.createFramebuffer();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,this.hdr?gl.RGBA16F:gl.RGBA8,w,h,0,gl.RGBA,this.hdr?gl.HALF_FLOAT:gl.UNSIGNED_BYTE,null);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frame);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,texture,0);
    let buffer=null;if(depth){buffer=gl.createRenderbuffer();gl.bindRenderbuffer(gl.RENDERBUFFER,buffer);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,w,h);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,buffer);}
    if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){
      this.hdr=false;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA8,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
      if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE){gl.deleteTexture(texture);gl.deleteFramebuffer(frame);if(buffer)gl.deleteRenderbuffer(buffer);throw Error('Scene buffer unavailable');}
    }
    this.canvas.dataset.colorBuffer=this.hdr?'float16':'unorm8';
    return {texture,frame,buffer,w,h};
  }
  resize(w,h){
    if(this.targets&&this.targets[0].w===w&&this.targets[0].h===h)return;
    const gl=this.gl;this.canvas.width=w;this.canvas.height=h;
    for(const t of this.targets||[]){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.frame);if(t.buffer)gl.deleteRenderbuffer(t.buffer);}
    this.targets=[this.target(w,h),this.target(Math.max(1,w>>2),Math.max(1,h>>2)),this.target(Math.max(1,w>>2),Math.max(1,h>>2)),this.target(Math.max(1,Math.round(w*.65)),Math.max(1,Math.round(h*.65)))];
  }
  async prepareTargets(w,h,work){
    const gl=this.gl;
    for(const t of this.targets||[]){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.frame);if(t.buffer)gl.deleteRenderbuffer(t.buffer);}
    this.targets=[];this.canvas.width=w;this.canvas.height=h;await work.checkpoint();
    for(const [x,y]of [[w,h],[Math.max(1,w>>2),Math.max(1,h>>2)],[Math.max(1,w>>2),Math.max(1,h>>2)],[Math.max(1,Math.round(w*.65)),Math.max(1,Math.round(h*.65))]]){
      this.targets.push(this.target(x,y));await work.drain(gl);
    }
  }
  bind(target){const gl=this.gl;gl.bindFramebuffer(gl.FRAMEBUFFER,target?.frame||null);gl.viewport(0,0,target?.w||this.canvas.width,target?.h||this.canvas.height);}
  points(program,count){
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.seeds);const a=gl.getAttribLocation(program.program,'a_seed');
    gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,0,0);
    const birth=gl.getAttribLocation(program.program,'a_birth');
    if(birth>=0){gl.bindBuffer(gl.ARRAY_BUFFER,this.births.buffers[this.births.current]);gl.enableVertexAttribArray(birth);gl.vertexAttribPointer(birth,4,gl.FLOAT,false,0,0);}
    gl.drawArrays(gl.POINTS,0,count);gl.disableVertexAttribArray(a);if(birth>=0)gl.disableVertexAttribArray(birth);
  }
  updateBirths(uniforms,count=Math.floor(this.maxParticles*.42)){
    const gl=this.gl;
    const b=this.births;this.use(b.program,uniforms);gl.enable(gl.RASTERIZER_DISCARD);
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,b.feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,b.buffers[1-b.current]);
    gl.beginTransformFeedback(gl.POINTS);this.points(b.program,count);gl.endTransformFeedback();
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.disable(gl.RASTERIZER_DISCARD);b.current=1-b.current;
  }
  async setupFlow(work){
    const gl=this.gl,update=this.flowUpdate,draw=this.flowDraw;
    const data=new Float32Array(this.flowCapacity*12);let randomSeed=37491;
    const random=()=>{randomSeed=(randomSeed*1664525+1013904223)>>>0;return randomSeed/4294967296;};
    // Start with a fully populated, layered plume; no empty warm-up or simultaneous respawn.
    await work.fill(this.flowCapacity,i=>{
      const a=random()*Math.PI*2,lane=random(),r=.45+lane*1.05,z=(random()-.5)*.018;
      data.set([Math.cos(a)*r,Math.sin(a*3+lane*5)*.28+z,Math.sin(a)*r*.65,1+random()*7,0,0,0,random(),0,0,-1,0],i*12);
    },{batch:256});
    const buffers=[];for(let i=0;i<2;i++){const b=gl.createBuffer();buffers.push(b);await work.upload(gl,b,data,gl.DYNAMIC_COPY);}
    this.flow={update,draw,buffers,feedback:gl.createTransformFeedback(),current:0};
  }
  flowAttributes(program,buffer){
    const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);const attributes=['a_positionAge','a_velocitySeed','a_birth'].map(name=>gl.getAttribLocation(program.program,name));
    attributes.forEach((a,i)=>{if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,48,i*16);}});return attributes.filter(a=>a>=0);
  }
  drawFlow(uniforms,count,delta,simulationCount=this.flowCapacity){
    const gl=this.gl,f=this.flow;
    // Discard elapsed wall time while paused, hidden, frozen, or in another scene.
    if(delta>0){
      const steps=Math.ceil(delta/(1/60));gl.enable(gl.RASTERIZER_DISCARD);
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,f.feedback);
      for(let i=0;i<steps;i++){
        this.use(f.update,{...uniforms,u_dt:delta/steps});
        const attributes=this.flowAttributes(f.update,f.buffers[f.current]);
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,f.buffers[1-f.current]);
        gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,simulationCount);gl.endTransformFeedback();
        gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);attributes.forEach(a=>gl.disableVertexAttribArray(a));f.current=1-f.current;
      }
      gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.disable(gl.RASTERIZER_DISCARD);
    }
    this.use(f.draw,uniforms);const attributes=this.flowAttributes(f.draw,f.buffers[f.current]);gl.drawArrays(gl.POINTS,0,count);attributes.forEach(a=>gl.disableVertexAttribArray(a));
  }
  dimensions({width,height,quality,scale=1,dynamics}){
    if(dynamics?.portraitScene&&height>width)[width,height]=[height,width];
    const cap=quality==='high'?1200:quality==='eco'?560:900;
    const density=Math.min(devicePixelRatio||1,quality==='high'?1.5:1,cap/Math.max(1,height),2200/Math.max(1,width))*(quality==='eco'?.85:quality==='auto'?scale:1);
    return {density,w:Math.max(1,Math.round(width*density)),h:Math.max(1,Math.round(height*density))};
  }
  async warm(input){
    const work=this.work,generation=this.generation;
    try{
      // First use can specialize a shader in the graphics driver. Exercise each
      // pass separately on a tiny surface, then allocate the real targets.
      this.output.update(input.hdrMode||'off');await this.output.preparing;await work.checkpoint();
      await this.prepareTargets(64,64,work);
      for(const _ of this.renderFrame(input,true))await work.drain(this.gl);
      if(this.output.ready)await this.output.device.queue.onSubmittedWorkDone();await work.checkpoint();
      const {w,h}=this.dimensions(input);await this.prepareTargets(w,h,work);
      // Also finish one full-resolution frame while the splash/wallpaper still
      // covers it. Do not queue live frames behind its first expensive draws.
      for(const _ of this.renderFrame(input))await work.drain(this.gl);
      if(this.output.ready)await this.output.device.queue.onSubmittedWorkDone();await work.checkpoint();
      work.check();this.lastTime=undefined;this.warmed=true;this.needsFrame=true;
    }catch(e){if(generation===this.generation&&!this.failed&&!this.lost)this.fail(e);}
  }
  draw(input){
    if(this.failed||this.lost||!this.ready)return false;
    if(!this.warmed){this.warming??=this.warm(input);return false;}
    try{for(const _ of this.renderFrame(input)){}return true;}catch(e){this.fail(e);return false;}
  }
  *renderFrame({width,height,time,features,dynamics,quality,intensity,scale=1,reduced=false,hdrMode='off'},warmup=false){
    const portrait=dynamics.portraitScene===true&&height>width;
    if(portrait)[width,height]=[height,width];
    if(dynamics.portraitScene){this.canvas.style.width=width+'px';this.canvas.style.height=height+'px';this.canvas.style.left='50%';this.canvas.style.top='50%';this.canvas.style.transform='translate(-50%,-50%)'+(portrait?' rotate(90deg)':'');}
    try{
      const gl=this.gl,delta=warmup?.001:Math.max(0,Math.min(.05,time-(this.lastTime??time))),extended=this.output.update(hdrMode);this.lastTime=time;
      const {density,w,h}=warmup?{density:1,w:64,h:64}:this.dimensions({width,height,quality,scale}),d=dynamics;
      const budget=warmup?256:quality==='eco'?49152:quality==='high'?this.maxParticles:131072,primaryCount=Math.floor(budget*.35),flowCount=Math.floor(budget*.12);
      const drive=reduced?.12:.55+intensity*.8;
      const a={...visualDefaults(),...d.appearance},identity=d.identity||{signature:[.4,.6,.3,.5],character:[.6,.4,.6,.5],themes:[.1,.5,.1,.1,.1,.1]},roles=d.roles||{},rhythm=d.rhythm||{phase:0,pulse:0,confidence:0};
      const birth=birthDistribution(features.spectrum,this.birthCDF);
      const recipe=identity.recipe||Array(8).fill(.5);
      this.kaleidoscopeWeights??=new Float32Array(KALEIDOSCOPE_MODES.length+1);
      if(!d.kaleidoscopeWeights){this.kaleidoscopeWeights.fill(0);this.kaleidoscopeWeights[d.kaleidoscope===true?kaleidoscopeIndex(d.kaleidoscopeMode)+1:0]=1;}
      const story=d.direction;const uniforms={u_story:story?[story.energy,story.texture,story.attack,story.anticipation]:[.5,.5,.3,0],u_storyMix:reduced?0:story?.mix||0,u_camera:cameraUniform(d.camera),u_focalLength:d.cameraFocalLength??1.9,u_rotation:d.rotationClock??0,u_shapeFrom:identity.shapeFrom||identity.signature,u_shapeTo:identity.shapeTo||identity.signature,u_kaleidoWeights:d.kaleidoscopeWeights||this.kaleidoscopeWeights,u_kaleidoMotion:reduced?0:time*.035,u_sculpture:identity.sculpture||[0,0,1,0],u_recipeA:recipe.slice(0,4),u_recipeB:recipe.slice(4,8),u_signature:identity.signature,u_character:identity.character,u_themes:identity.themes,u_roles:[roles.bass||0,roles.drums||0,roles.lead||0,roles.texture||0],u_shimmer:roles.shimmer||0,u_rhythm:[Math.sin(rhythm.phase*Math.PI*2),Math.cos(rhythm.phase*Math.PI*2),reduced?0:rhythm.pulse,rhythm.confidence],u_particle:[a.particleSpread,a.particleSize,a.beatMotion,a.filigree],u_cloud:[a.bgScale,a.bgSpeed,a.turbulence,a.textureDetail],u_light:[a.bloom,a.glow,reduced?0:a.flash,a.contrast],u_movement:reduced?.1:a.motionAmount,u_palette:expandPalette(d.colors).flat(),u_transients:Array.from(features.transients||features.accents,x=>x*(reduced?.1:1)),u_birthCDF:birth.cdf,u_birthTotal:birth.total,u_harmonic:features.harmonic||features.spectrum,u_percussive:features.percussive||features.spectrum,u_spectrum:features.spectrum,u_morph:features.morph||[.24,.32,.2,.18],u_particleStyle:({white:0,palette:1,frequency:2,birth:3})[d.particleColor]??1,u_resolution:[w,h],u_time:time,u_mode:0,u_energy:features.loudness,u_onset:features.onset,u_accents:features.accents.map(x=>x*(reduced?.1:1)),u_low:features.bands.slice(0,4),u_high:features.bands.slice(4),u_form:[d.shape,d.spread,d.flow,d.bloom],u_colorA:d.colors[0],u_colorB:d.colors[1],u_colorC:d.colors[2],u_evolve:1,u_intensity:intensity,u_drive:drive,u_pixel:density,u_ratio:width/height,u_weight:1,u_density:Math.min(2,98304/primaryCount*Math.pow(h/900,1.2))*.75};
      gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
      this.resize(w,h);const [scene,bloomA,bloomB,nebula]=this.targets;
      const atmosphere=features.atmosphere,back=d.background?.identity||identity,backColors=d.background?.colors||d.colors,backRecipe=back.recipe||recipe;const backUniforms={...uniforms,u_signature:back.signature,u_character:back.character,u_themes:back.themes,u_recipeA:backRecipe.slice(0,4),u_recipeB:backRecipe.slice(4,8),u_palette:expandPalette(backColors).flat(),u_colorA:backColors[0],u_colorB:backColors[1],u_colorC:backColors[2]};
      this.bind(nebula);this.use(this.nebula,{...backUniforms,u_liquid:[d.fluidity??.8,d.iridescence??.65,d.depth??.7],u_time:d.backgroundClock??time,u_driftTime:d.backgroundDriftClock??(d.backgroundClock??time)*.975,u_resolution:[nebula.w,nebula.h],u_energy:atmosphere.loudness,u_low:atmosphere.bands.slice(0,4),u_high:atmosphere.bands.slice(4),u_accents:atmosphere.accents.map(x=>x*(reduced?.1:1))});
      this.quadDraw(this.nebula);yield;
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);this.use(this.nebulaParticles,{...backUniforms,u_intensity:intensity*.30,u_pixel:density*.65});this.points(this.nebulaParticles,Math.floor(budget*.04));gl.disable(gl.BLEND);
      yield;

      this.bind(scene);gl.clearColor(.0002,.0003,.0005,1);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
      this.updateBirths(uniforms,warmup?128:undefined);yield;
      this.use(this.particles,uniforms);this.points(this.particles,primaryCount);yield;
      this.use(this.cells,{...uniforms,u_density:uniforms.u_density*1.4});this.points(this.cells,Math.floor(budget*.12));
      yield;
      this.drawFlow({...uniforms,u_mode:7,u_weight:features.flow*a.orbit,u_density:uniforms.u_density*primaryCount/flowCount},flowCount,delta,warmup?128:undefined);yield;
      if(warmup||d.spectralDetail>0){this.use(this.spectral,{...uniforms,u_spectrum:features.spectrum,u_weight:d.spectralDetail,u_density:uniforms.u_density*2.4});this.points(this.spectral,Math.floor(budget*.16));}yield;

      // A stable surface population shares the shape/camera and the existing
      // bloom pass. Only color comes from the actual background palette.
      const spectrumLight=d.spectrumLight||this.emptySpectrum;
      if(warmup||spectrumLight.some(level=>level>0)){
        const count=Math.floor(budget*.094);
        this.use(this.ribbonSpectrum,{...uniforms,u_palette:backUniforms.u_palette,u_spectrumLight:spectrumLight,u_density:Math.min(2.2,12288/count)*Math.pow(h/900,.6)});
        this.points(this.ribbonSpectrum,count);
      }yield;

      gl.disable(gl.BLEND);
      // Downsample, extract emissive light, then two separable bloom passes.
      this.bind(bloomA);this.use(this.blur,{u_direction:[1/w,1/h],u_extract:1});this.texture(this.blur,'u_image',scene.texture);this.quadDraw(this.blur);
      yield;
      this.bind(bloomB);this.use(this.blur,{u_direction:[(1+a.glow*4)/bloomA.w,0],u_extract:0});this.texture(this.blur,'u_image',bloomA.texture);this.quadDraw(this.blur);
      this.bind(bloomA);this.use(this.blur,{u_direction:[0,(1+a.glow*4)/bloomA.h],u_extract:0});this.texture(this.blur,'u_image',bloomB.texture);this.quadDraw(this.blur);
      yield;
      this.bind(null);this.use(this.finish,{...uniforms,u_hdrOutput:extended?1:0});this.texture(this.finish,'u_image',scene.texture);this.texture(this.finish,'u_bloom',bloomA.texture,1);this.texture(this.finish,'u_nebula',nebula.texture,2);this.quadDraw(this.finish);
      yield;
      if(extended&&!this.output.present()){this.uniform(this.finish,'u_hdrOutput',0);this.quadDraw(this.finish);}
      this.canvas.dataset.hdrOutput=this.output.state;
      this.needsFrame=false;this.canvas.dataset.scene='resonance';return true;
    }catch(e){throw e;}
  }
}
