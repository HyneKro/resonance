import {AstraMotion} from './astra-motion.js';
import {ASTRA_PATH_VERTEX,ASTRA_PATH_FRAGMENT,ASTRA_BODY_VERTEX,ASTRA_BODY_FRAGMENT,ASTRA_DEBRIS_VERTEX,ASTRA_DEBRIS_FRAGMENT,ASTRA_DUST_VERTEX,ASTRA_DUST_FRAGMENT,ASTRA_BACKGROUND} from './astra-shaders.js';
import {ContourMotion,contourLettering,CONTOUR_INK_WIDTH} from './contour-motion.js';
import {CONTOUR_VERTEX,CONTOUR_FRAGMENT,CONTOUR_DROPS_VERTEX,CONTOUR_DROPS_FRAGMENT,CONTOUR_SHADOW_VERTEX,CONTOUR_SHADOW_FRAGMENT,CONTOUR_PAPER} from './contour-shaders.js';
import {AerialPhysics,AerialMotion} from './aerial-physics.js';
import {AERIAL_VERTEX,AERIAL_FRAGMENT,AERIAL_BACKGROUND,AERIAL_CURRENT_VERTEX,AERIAL_CURRENT_FRAGMENT} from './aerial-shaders.js';
import {attractorCurves,ATTRACTOR_SAMPLES,ATTRACTOR_ROWS} from './attractor-curves.js';
import {artDirection,ART_DIRECTIONS} from './art-directions.js';
import {createSynapseNetwork,SynapseSignals} from './synapse-network.js';
import {SYNAPSE_THREAD_VERTEX,SYNAPSE_THREAD_FRAGMENT,SYNAPSE_NODE_VERTEX,SYNAPSE_NODE_FRAGMENT,SYNAPSE_BACKGROUND,SYNAPSE_FACET_VERTEX,SYNAPSE_FACET_FRAGMENT} from './synapse-shaders.js';
import {SpectrumHistory,FluxMotion,AfterglowMotion} from './spectrum-history.js';
import {AFTERGLOW_BACKGROUND,AFTERGLOW_TERRAIN_VERTEX,AFTERGLOW_TERRAIN_FRAGMENT,AFTERGLOW_PALM_VERTEX,AFTERGLOW_PALM_FRAGMENT,AFTERGLOW_DUST_VERTEX,AFTERGLOW_DUST_FRAGMENT} from './afterglow-shaders.js';
import {createAfterglowPalms} from './afterglow-palms.js';
import {FLUX_VERTEX,FLUX_FRAGMENT,FLUX_BACKGROUND,FLUX_TRACE_VERTEX,FLUX_TRACE_FRAGMENT,FLUX_DUST_VERTEX} from './flux-shaders.js';
import {compileSceneProgram} from './shader-loader.js';
import {cameraUniform,fluxCameraDistance} from './scene-camera.js';
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
  constructor(canvas,{mobile=false}={}){
    this.mobile=mobile;
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
    const specs=[['roadBackground',QUAD,AFTERGLOW_BACKGROUND],['roadTerrain',AFTERGLOW_TERRAIN_VERTEX,AFTERGLOW_TERRAIN_FRAGMENT],['roadPalms',AFTERGLOW_PALM_VERTEX,AFTERGLOW_PALM_FRAGMENT],['roadDust',AFTERGLOW_DUST_VERTEX,AFTERGLOW_DUST_FRAGMENT],['astraPaths',ASTRA_PATH_VERTEX,ASTRA_PATH_FRAGMENT],['astraBodies',ASTRA_BODY_VERTEX,ASTRA_BODY_FRAGMENT],['astraDust',ASTRA_DUST_VERTEX,ASTRA_DUST_FRAGMENT],['astraBackground',QUAD,ASTRA_BACKGROUND],['contourBrush',CONTOUR_VERTEX,CONTOUR_FRAGMENT],['contourDrops',CONTOUR_DROPS_VERTEX,CONTOUR_DROPS_FRAGMENT],['contourShadows',CONTOUR_SHADOW_VERTEX,CONTOUR_SHADOW_FRAGMENT],['contourPaper',QUAD,CONTOUR_PAPER],['aerialSurface',AERIAL_VERTEX,AERIAL_FRAGMENT],['aerialBackground',QUAD,AERIAL_BACKGROUND],['fluxTrace',FLUX_TRACE_VERTEX,FLUX_TRACE_FRAGMENT],['fluxDust',FLUX_DUST_VERTEX,FLUX_FRAGMENT],['fluxPoints',FLUX_VERTEX,FLUX_FRAGMENT],['fluxBackground',QUAD,FLUX_BACKGROUND],['nebula',QUAD,NEBULA_LIVE],['nebulaParticles',NEBULA_VERTEX,NEBULA_FRAGMENT],['particles',PARTICLE_VERTEX,PARTICLE_FRAGMENT],['blur',QUAD,BLOOM],['finish',QUAD,FINISH],['spectral',SPECTRAL_VERTEX,PARTICLE_FRAGMENT],['ribbonSpectrum',RIBBON_SPECTRUM_VERTEX,RIBBON_SPECTRUM_FRAGMENT],['cells',CELL_VERTEX,CELL_FRAGMENT],['birthProgram',BIRTH_UPDATE,FLOW_FRAGMENT,['nextBirth']],['flowUpdate',FLOW_UPDATE,FLOW_FRAGMENT,['nextPosition','nextVelocity','nextBirth']],['flowDraw',FLOW_VERTEX,PARTICLE_FRAGMENT]];
    for(const [name,vertex,fragment,varyings]of specs){this[name]=await compileSceneProgram(gl,vertex,fragment,varyings,{cancelled:()=>generation!==this.generation||this.failed||this.lost,yieldWork:()=>work.checkpoint()});}
    for(const [name,vertex,fragment]of [['synapseThreads',SYNAPSE_THREAD_VERTEX,SYNAPSE_THREAD_FRAGMENT],['synapseNodes',SYNAPSE_NODE_VERTEX,SYNAPSE_NODE_FRAGMENT],['synapseFacets',SYNAPSE_FACET_VERTEX,SYNAPSE_FACET_FRAGMENT],['synapseBackground',QUAD,SYNAPSE_BACKGROUND]])this[name]=await compileSceneProgram(gl,vertex,fragment,undefined,{cancelled:()=>generation!==this.generation||this.failed||this.lost,yieldWork:()=>work.checkpoint()});
    this.astra??=new AstraMotion();this.astra.suspend();
    this.astraDebris=await compileSceneProgram(gl,ASTRA_DEBRIS_VERTEX,ASTRA_DEBRIS_FRAGMENT,undefined,{cancelled:()=>generation!==this.generation||this.failed||this.lost,yieldWork:()=>work.checkpoint()});
    this.astraHistoryVersion=-1;this.astraHistoryTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.astraHistoryTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,48,128,0,gl.RED,gl.UNSIGNED_BYTE,this.astra.history.data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.synapse??=new SynapseSignals();this.synapse.suspend();
    this.synapseNetworks??={};this.synapseTextures={};
    // Prepare both sizes once; phone quality never uploads the desktop mesh.
    for(const count of (this.mobile?[680]:[680,1700])){
      const network=this.synapseNetworks[count]??=await createSynapseNetwork(count,()=>work.checkpoint());
      const textures=[];const edgeRows=network.edgeRows,edgeData=network.edges;
      for(const [width,height,data]of [[count,2,network.nodes],[1024,edgeRows,edgeData],[1024,network.facetRows,network.facets]]){
        const tex=gl.createTexture();textures.push(tex);gl.bindTexture(gl.TEXTURE_2D,tex);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,width,height,0,gl.RGBA,gl.FLOAT,data);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);await work.checkpoint();
      }this.synapseTextures[count]=textures;
    }
    this.attractors=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.attractors);
    const curves=await attractorCurves(()=>work.checkpoint());
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,ATTRACTOR_SAMPLES,ATTRACTOR_ROWS,0,gl.RGBA,gl.FLOAT,curves);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.contour??=new ContourMotion();this.contour.suspend();this.letteringSize='';this.letteringTexture=gl.createTexture();
    this.inkTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.inkTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA32F,CONTOUR_INK_WIDTH,4,0,gl.RGBA,gl.FLOAT,this.contour.data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.aerial??=new AerialPhysics(this.mobile?16:24);this.aerial.suspend();this.aerialMotion??=new AerialMotion();this.aerialMotion.suspend();
    this.aerialCurrents=await compileSceneProgram(gl,AERIAL_CURRENT_VERTEX,AERIAL_CURRENT_FRAGMENT,undefined,{cancelled:()=>generation!==this.generation||this.failed||this.lost,yieldWork:()=>work.checkpoint()});
    this.spectrumHistory??=new SpectrumHistory(512);this.spectrumHistory.suspend();this.fluxMotion??=new FluxMotion();this.fluxMotion.suspend();
    this.roadPalmAtlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.roadPalmAtlas);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,createAfterglowPalms(this.mobile?128:256));
    gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);await work.checkpoint();
    this.roadHistory??=new SpectrumHistory();this.roadHistory.suspend();this.roadMotion??=new AfterglowMotion();this.roadMotion.suspend();this.roadHistoryVersion=-1;
    this.roadHistoryTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.roadHistoryTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,48,128,0,gl.RED,gl.UNSIGNED_BYTE,this.roadHistory.data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.historyVersion=-1;this.historyTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.historyTexture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,48,this.spectrumHistory.height,0,gl.RED,gl.UNSIGNED_BYTE,this.spectrumHistory.data);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
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
  uniform(p,name,value){const gl=this.gl,loc=this.location(p,name);if(loc===null)return;if(Array.isArray(value)||ArrayBuffer.isView(value)){if(name==='u_harmonic'||name==='u_percussive'||name==='u_spheres'||name==='u_bursts'||name==='u_aerialBands'||name==='u_signals'||name==='u_neuralBands'||name==='u_origins'||name==='u_orbitBands'||name==='u_astraEvents'||name==='u_orbitMotion'||name==='u_cometTrail')gl.uniform4fv(loc,value);else if(name==='u_currentPhase'||name==='u_contacts'||name==='u_spectrum'||name==='u_burstPower'||name==='u_ringEcho'||name==='u_spectrumLight'||name==='u_birthCDF'||name==='u_themes'||name==='u_kaleidoWeights')gl.uniform1fv(loc,value);else if(name==='u_palette')gl.uniform3fv(loc,value);else if(value.length===4)gl.uniform4fv(loc,value);else if(value.length===3)gl.uniform3fv(loc,value);else gl.uniform2fv(loc,value);}else gl.uniform1f(loc,value);}
  use(p,uniforms={}){this.gl.useProgram(p.program);if(this.attractors&&this.location(p,'u_attractors')!==null)this.texture(p,'u_attractors',this.attractors,3);for(const [name,value]of Object.entries(uniforms))this.uniform(p,name,value);}
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
    this.targets=[this.target(w,h,true),this.target(Math.max(1,w>>2),Math.max(1,h>>2)),this.target(Math.max(1,w>>2),Math.max(1,h>>2)),this.target(Math.max(1,Math.round(w*.65)),Math.max(1,Math.round(h*.65)))];
  }
  async prepareTargets(w,h,work){
    const gl=this.gl;
    for(const t of this.targets||[]){gl.deleteTexture(t.texture);gl.deleteFramebuffer(t.frame);if(t.buffer)gl.deleteRenderbuffer(t.buffer);}
    this.targets=[];this.canvas.width=w;this.canvas.height=h;await work.checkpoint();
    for(const [x,y]of [[w,h],[Math.max(1,w>>2),Math.max(1,h>>2)],[Math.max(1,w>>2),Math.max(1,h>>2)],[Math.max(1,Math.round(w*.65)),Math.max(1,Math.round(h*.65))]]){
      this.targets.push(this.target(x,y,this.targets.length===0));await work.drain(gl);
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
  roadMotes(count){
    const gl=this.gl,a=gl.getAttribLocation(this.roadDust.program,'a_seed');gl.bindBuffer(gl.ARRAY_BUFFER,this.seeds);
    gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,4,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(a,1);
    gl.drawArraysInstanced(gl.TRIANGLES,0,6,count);gl.vertexAttribDivisor(a,0);gl.disableVertexAttribArray(a);
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
    if(dynamics?.portraitScene&&![1,4,6].includes(dynamics.artStyle?.index??artDirection(dynamics.artDirection).index)&&height>width)[width,height]=[height,width];
    const cap=quality==='high'?1200:quality==='eco'?560:900;
    const density=Math.min(devicePixelRatio||1,quality==='high'?1.5:1,cap/Math.max(1,height),2200/Math.max(1,width))*(quality==='eco'?.85*(this.mobile?scale:1):quality==='auto'?scale:1);
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
      // Warm each material branch on a tiny target, yielding between passes.
      const initialStyle=input.dynamics?.artStyle?.index??artDirection(input.dynamics?.artDirection).index;
      for(const {index}of ART_DIRECTIONS)if(index!==initialStyle)for(const _ of this.renderFrame({...input,dynamics:{...input.dynamics,artStyle:{index,opacity:1}}},true))await work.drain(this.gl);
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
    const flat=(dynamics.artStyle?.index??artDirection(dynamics.artDirection).index)===4;
    const upright=flat||[1,6].includes(dynamics.artStyle?.index??artDirection(dynamics.artDirection).index);
    const portrait=!upright&&dynamics.portraitScene===true&&height>width;
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
      const selected=d.artStyle||{index:artDirection(d.artDirection).index,opacity:1},style=ART_DIRECTIONS.some(a=>a.index===selected.index)?selected:{...selected,index:0};
      if(style.index!==4)this.contour.suspend();
      if(style.index!==5){this.spectrumHistory.suspend();this.fluxMotion.suspend();}
      if(style.index!==2){this.roadHistory.suspend();this.roadMotion.suspend();}
      if(style.index!==6){this.aerial.suspend();this.aerialMotion.suspend();}
      if(style.index!==7)this.synapse.suspend();
      if(style.index!==3)this.astra.suspend();
      const sculpture=identity.sculpture||[0,0,1,0],precise=(sculpture[0]>=24?1-sculpture[2]:0)+(sculpture[1]>=24?sculpture[2]:0);
      const story=d.direction;const uniforms={u_retro:[a.retroScan,a.retroPhosphor,a.retroColor],u_world:d.artMotion||[time*.45,time*1.4,time*.15,time*.16],u_artDirection:style.index,u_styleOpacity:style.opacity,u_story:story?[story.energy,story.texture,story.attack,story.anticipation]:[.5,.5,.3,0],u_storyMix:reduced?0:story?.mix||0,u_camera:cameraUniform(d.camera),u_focalLength:d.cameraFocalLength??1.9,u_rotation:d.rotationClock??0,u_shapeFrom:identity.shapeFrom||identity.signature,u_shapeTo:identity.shapeTo||identity.signature,u_kaleidoWeights:d.kaleidoscopeWeights||this.kaleidoscopeWeights,u_kaleidoMotion:reduced?0:time*.035,u_sculpture:identity.sculpture||[0,0,1,0],u_recipeA:recipe.slice(0,4),u_recipeB:recipe.slice(4,8),u_signature:identity.signature,u_character:identity.character,u_themes:identity.themes,u_roles:[roles.bass||0,roles.drums||0,roles.lead||0,roles.texture||0],u_shimmer:roles.shimmer||0,u_rhythm:[Math.sin(rhythm.phase*Math.PI*2),Math.cos(rhythm.phase*Math.PI*2),reduced?0:rhythm.pulse,rhythm.confidence],u_particle:[a.particleSpread,a.particleSize,a.beatMotion,a.filigree],u_cloud:[a.bgScale,a.bgSpeed,a.turbulence,a.textureDetail],u_light:[a.bloom,a.glow,reduced?0:a.flash,a.contrast],u_movement:reduced?.1:a.motionAmount,u_palette:expandPalette(d.colors).flat(),u_transients:Array.from(features.transients||features.accents,x=>x*(reduced?.1:1)),u_birthCDF:birth.cdf,u_birthTotal:birth.total,u_harmonic:features.harmonic||features.spectrum,u_percussive:features.percussive||features.spectrum,u_spectrum:features.spectrum,u_morph:features.morph||[.24,.32,.2,.18],u_particleStyle:({white:0,palette:1,frequency:2,birth:3})[d.particleColor]??1,u_resolution:[w,h],u_time:time,u_mode:0,u_energy:features.loudness,u_onset:features.onset,u_accents:features.accents.map(x=>x*(reduced?.1:1)),u_low:features.bands.slice(0,4),u_high:features.bands.slice(4),u_form:[d.shape,d.spread,d.flow,d.bloom],u_colorA:d.colors[0],u_colorB:d.colors[1],u_colorC:d.colors[2],u_evolve:1,u_intensity:intensity,u_drive:drive,u_pixel:density,u_ratio:width/height,u_weight:1,u_density:Math.min(2,98304/primaryCount*Math.pow(h/900,1.2))*.75};
      gl.disable(gl.DEPTH_TEST);gl.depthMask(true);gl.disable(gl.BLEND);
      this.resize(w,h);const [scene,bloomA,bloomB,nebula]=this.targets;
      const atmosphere=features.atmosphere,back=d.background?.identity||identity,backColors=d.background?.colors||d.colors,backRecipe=back.recipe||recipe;const backUniforms={...uniforms,u_signature:back.signature,u_character:back.character,u_themes:back.themes,u_recipeA:backRecipe.slice(0,4),u_recipeB:backRecipe.slice(4,8),u_palette:expandPalette(backColors).flat(),u_colorA:backColors[0],u_colorB:backColors[1],u_colorC:backColors[2]};
      if(style.index===0){
      this.bind(nebula);this.use(this.nebula,{...backUniforms,u_liquid:[d.fluidity??.8,d.iridescence??.65,d.depth??.7],u_time:d.backgroundClock??time,u_driftTime:d.backgroundDriftClock??(d.backgroundClock??time)*.975,u_resolution:[nebula.w,nebula.h],u_energy:atmosphere.loudness,u_low:atmosphere.bands.slice(0,4),u_high:atmosphere.bands.slice(4),u_accents:atmosphere.accents.map(x=>x*(reduced?.1:1))});
      this.quadDraw(this.nebula);yield;
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);this.use(this.nebulaParticles,{...backUniforms,u_intensity:intensity*.30,u_pixel:density*.65});this.points(this.nebulaParticles,Math.floor(budget*.04));gl.disable(gl.BLEND);
      yield;

      this.bind(scene);gl.clearColor(.0002,.0003,.0005,1);gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
      // All surface passes use a prefix of these seeds. Updating the entire
      // desktop capacity on a phone was simulating six times the visible population.
      this.updateBirths(uniforms,warmup?128:this.mobile?primaryCount:undefined);yield;
      this.use(this.particles,uniforms);this.points(this.particles,primaryCount);yield;
      this.use(this.cells,{...uniforms,u_density:uniforms.u_density*(1.4-precise*.9)});this.points(this.cells,Math.floor(budget*.12));
      yield;
      // Simulate only the flow particles actually drawn on mobile. If this
      // layer is turned off, no invisible simulation is needed.
      if(warmup||!this.mobile||a.orbit>0)this.drawFlow({...uniforms,u_mode:7,u_weight:features.flow*a.orbit*(1-precise*.8),u_density:uniforms.u_density*primaryCount/flowCount},flowCount,delta,warmup?128:this.mobile?flowCount:undefined);yield;
      if(warmup||d.spectralDetail>0){this.use(this.spectral,{...uniforms,u_spectrum:features.spectrum,u_weight:d.spectralDetail,u_density:uniforms.u_density*2.4});this.points(this.spectral,Math.floor(budget*.16));}yield;

      // A stable surface population shares the shape/camera and the existing
      // bloom pass. Only color comes from the actual background palette.
      const spectrumLight=d.spectrumLight||this.emptySpectrum;
      if(warmup||spectrumLight.some(level=>level>0)){
        const count=Math.floor(budget*.094);
        this.use(this.ribbonSpectrum,{...uniforms,u_palette:backUniforms.u_palette,u_spectrumLight:spectrumLight,u_density:Math.min(2.2,12288/count)*Math.pow(h/900,.6)});
        this.points(this.ribbonSpectrum,count);
      }yield;

      }else if(style.index===7){
        const count=this.mobile?680:1700,network=this.synapseNetworks[count],[nodes,edges,facets]=this.synapseTextures[count];
        // Track changes keep position, velocity, palette and in-flight waves.
        // Only attack detector counters reset; playback is not the clock.
        if(this.synapseTrack!==d.trackId){this.synapse.beginTrack();this.synapseTrack=d.trackId;}
        const signals=this.synapse.update(d.synapseClock??d.spectrumClock??time,{...roles,onset:features.onset,energy:features.loudness,reduced,hold:d.synapseHold===true,active:d.synapseActive!==false,palette:uniforms.u_palette,lights:d.spectrumLight,spectrum:features.spectrum,harmonic:features.harmonic,percussive:features.percussive,accents:features.accents,hits:features.hits,rhythm:d.rhythm,direction:d.direction,nodes:network.nodes,count});
        network.update(signals,{movement:a.motionAmount,beat:a.beatMotion,turbulence:a.turbulence});
        if(signals.dt){
          gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,nodes);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,count,2,gl.RGBA,gl.FLOAT,network.nodes);
          gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,edges);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1024,network.edgeRows,gl.RGBA,gl.FLOAT,network.edges);
          gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,facets);gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,1024,network.facetRows,gl.RGBA,gl.FLOAT,network.facets);
        }
        uniforms.u_light=[a.bloom*(1.25+signals.energy*2.4+signals.beat*.8+signals.flux),a.glow,reduced?0:a.flash,a.contrast];
        const copies=this.mobile?1:2;
        const web={...uniforms,u_movement:reduced?0:uniforms.u_movement,u_roles:signals.roles,u_shimmer:signals.shimmer,u_palette:signals.palette,u_neural:[signals.phase,signals.activity,signals.energy,signals.shimmer],u_neuralBands:signals.detail,u_neuralAccents:signals.accents,u_neuralDrive:[signals.roles[0],signals.shimmer,signals.beat,signals.tension],u_neuralTone:[signals.centroid,signals.flux,signals.phrase,Math.max(.3,Math.min(1.7,.65+intensity*.45))],u_neuralStyle:[a.turbulence,a.textureDetail,a.beatMotion,a.orbit],u_chargeCopies:copies,u_signals:signals.events,u_origins:signals.origins,u_signalTime:signals.time,u_spectrumLight:signals.spectrum};
        this.bind(nebula);this.use(this.synapseBackground,{...web,u_resolution:[nebula.w,nebula.h]});this.quadDraw(this.synapseBackground);yield;
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
        this.use(this.synapseFacets,web);this.texture(this.synapseFacets,'u_nodes',nodes,7);this.texture(this.synapseFacets,'u_facets',facets,10);gl.drawArrays(gl.TRIANGLES,0,network.facetCount*3);
        this.use(this.synapseThreads,{...web,u_segments:1,u_threadLayer:0});this.texture(this.synapseThreads,'u_nodes',nodes,7);this.texture(this.synapseThreads,'u_edges',edges,8);this.texture(this.synapseThreads,'u_facets',facets,10);gl.drawArrays(gl.TRIANGLES,0,network.edgeCount*6);
        const strands=Math.round((this.mobile?5:13)*Math.min(1.4,a.filigree)),segments=this.mobile?3:5;
        this.use(this.synapseThreads,{u_segments:segments,u_weaveCount:Math.max(1,strands),u_threadLayer:1});this.texture(this.synapseThreads,'u_facets',facets,10);gl.drawArrays(gl.TRIANGLES,0,network.facetCount*strands*segments*6);
        this.use(this.synapseThreads,{u_segments:this.mobile?1:2,u_threadLayer:2});gl.drawArrays(gl.TRIANGLES,0,network.edgeCount*copies*(this.mobile?1:2)*6);yield;
        this.use(this.synapseNodes,{...web,u_nodeLayer:0});this.texture(this.synapseNodes,'u_nodes',nodes,7);this.texture(this.synapseNodes,'u_edges',edges,8);gl.drawArrays(gl.POINTS,0,count);
        this.uniform(this.synapseNodes,'u_nodeLayer',1);gl.drawArrays(gl.POINTS,0,network.edgeCount*copies);
        this.uniform(this.synapseNodes,'u_nodeLayer',2);gl.drawArrays(gl.POINTS,0,Math.round((this.mobile?160:650)*Math.min(1.5,a.orbit)));
        this.uniform(this.synapseNodes,'u_nodeLayer',3);gl.drawArrays(gl.POINTS,0,8*(this.mobile?48:144));yield;
      }else if(style.index===3){
        // Track changes only change the targets. The solar system retains phase,
        // existing ejecta and velocity while its sound and colours ease across.
        const stellar=this.astra.update(d.astraClock??d.spectrumClock??time,features.spectrum,{...roles,onset:features.onset,energy:features.loudness,active:d.astraActive!==false,palette:uniforms.u_palette,lights:d.spectrumLight,reduced,movement:a.motionAmount,spread:a.particleSpread});
        const history=stellar.history;
        gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.astraHistoryTexture);
        if(this.astraHistoryVersion!==history.version){gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,48,128,gl.RED,gl.UNSIGNED_BYTE,history.data);this.astraHistoryVersion=history.version;}
        const sky={...uniforms,u_particle:[stellar.spread,...uniforms.u_particle.slice(1)],u_roles:stellar.roles,u_stellarWarm:stellar.warm,u_stellarCool:stellar.cool,u_orbitBands:stellar.bands,u_orbitMotion:stellar.orbits,u_astraEvents:stellar.events,u_ringEcho:stellar.echoes,u_historyHead:history.head,u_historyPhase:history.accumulator*30,u_astraTime:stellar.time,u_stellarState:stellar.state,u_cometTrail:stellar.cometTrail,u_movement:reduced?0:uniforms.u_movement,u_spectrumLight:stellar.lights};
        for(const p of [this.astraBodies,this.astraPaths,this.astraDust,this.astraDebris]){gl.useProgram(p.program);this.texture(p,'u_astraHistory',this.astraHistoryTexture,5);}
        this.bind(nebula);this.use(this.astraBackground,{...sky,u_resolution:[nebula.w,nebula.h]});this.quadDraw(this.astraBackground);yield;
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
        this.use(this.astraBodies,{...sky,u_bodyOffset:0,u_bodyDetail:this.mobile?[64,32]:[128,64]});gl.drawArrays(gl.TRIANGLES,0,(this.mobile?2048:8192)*6);
        this.use(this.astraBodies,{...sky,u_bodyOffset:1,u_bodyDetail:this.mobile?[24,12]:[48,24]});gl.drawArrays(gl.TRIANGLES,0,16*(this.mobile?288:1152)*6);
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        this.use(this.astraDebris,sky);gl.drawArrays(gl.POINTS,0,this.mobile?180:520);yield;
        gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
        const segments=this.mobile?192:320;
        for(const part of [4,0,1]){this.use(this.astraPaths,{...sky,u_segments:segments,u_pathPart:part});gl.drawArrays(gl.TRIANGLES,0,72*segments*6);}yield;
        this.use(this.astraDust,sky);this.points(this.astraDust,warmup?256:this.mobile?14000:34000);yield;
      }else if(style.index===4){
        this.contour.selectTrack(d.trackId);
        const ink=this.contour.update(d.contourClock??d.spectrumClock??time,{...roles,onset:features.onset,energy:features.loudness,active:d.contourActive!==false,hold:d.contourHold===true,reduced,colors:d.colors,spectrum:features.spectrum,lights:d.spectrumLight,ratio:w/h});
        gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,this.inkTexture);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,CONTOUR_INK_WIDTH,4,gl.RGBA,gl.FLOAT,ink.data);
        const neutral=Math.min(...ink.accent)*.85,peak=Math.max(.01,Math.max(...ink.accent)-neutral);
        uniforms.u_inkAccent=Array.from(ink.accent,x=>(x-neutral)/peak);
        const inkUniforms={...uniforms,u_movement:reduced?0:uniforms.u_movement,u_inkTime:ink.time,u_waterTime:ink.waterTime,u_inkMaterial:ink.material,u_inkPhase:ink.inkPhase,u_roles:ink.roles,u_spectrum:ink.spectrum,u_spectrumLight:ink.lights};
        const size=w+'x'+h;
        if(this.letteringSize!==size){
          const labels=contourLettering(w,h);gl.activeTexture(gl.TEXTURE6);gl.bindTexture(gl.TEXTURE_2D,this.letteringTexture);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,labels);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.letteringSize=size;
        }
        this.bind(nebula);this.use(this.contourPaper,{...inkUniforms,u_paper:1});this.texture(this.contourPaper,'u_lettering',this.letteringTexture,6);this.quadDraw(this.contourPaper);yield;
        gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        this.use(this.contourShadows,{...inkUniforms,u_resolution:[nebula.w,nebula.h]});gl.drawArraysInstanced(gl.TRIANGLES,0,6,64);
        this.use(this.contourDrops,{...inkUniforms,u_inkStage:2,u_resolution:[nebula.w,nebula.h]});this.texture(this.contourDrops,'u_inkData',this.inkTexture,9);gl.drawArraysInstanced(gl.TRIANGLES,0,6,64);
        this.use(this.contourDrops,{...inkUniforms,u_inkStage:1,u_resolution:[nebula.w,nebula.h]});this.texture(this.contourDrops,'u_inkData',this.inkTexture,9);gl.drawArraysInstanced(gl.TRIANGLES,0,2*6,128);
        this.uniform(this.contourDrops,'u_inkStage',0);gl.drawArraysInstanced(gl.TRIANGLES,0,18*6,64);yield;
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
        const segments=this.mobile?112:192,strands=this.mobile?36:64;
        for(const [layer,count]of [[3,1],[0,strands],[1,2],[2,3]]){
          this.use(this.contourBrush,{...inkUniforms,u_segments:segments,u_strands:count,u_inkLayer:layer});gl.drawArrays(gl.TRIANGLES,0,segments*count*6);
        }yield;
        this.use(this.contourPaper,{...inkUniforms,u_paper:0});this.texture(this.contourPaper,'u_lettering',this.letteringTexture,6);this.quadDraw(this.contourPaper);yield;
      }else if(style.index===6){
        const count=this.mobile?16:24;
        if(this.aerial.count!==count)this.aerial=new AerialPhysics(count);
        const motion=this.aerialMotion;
        if(this.aerialTrack!==d.trackId){motion.beginTrack();this.aerialTrack=d.trackId;}
        motion.update(d.aerialClock??d.spectrumClock??time,{active:d.aerialActive!==false,hold:d.aerialHold===true,reduced,movement:a.motionAmount,spectrum:features.spectrum,lights:d.spectrumLight,roles,palette:uniforms.u_palette,energy:features.loudness,onset:features.onset,harmonic:features.harmonic,percussive:features.percussive,spheres:this.aerial.rendered,count,mobile:this.mobile});
        const spheres=this.aerial.update(motion.simulationClock,{bass:motion.roles[0],drums:motion.roles[1],lead:motion.roles[2],onset:motion.hit},{reduced:reduced||d.aerialHold===true,movement:a.motionAmount,beat:a.beatMotion,liquid:a.aerialFluid,continuous:true,detail:motion.detail,drive:motion.drive});
        uniforms.u_light=[a.bloom*(1.25+motion.energy*.65),a.glow,reduced?0:a.flash,a.contrast];
        const beads=this.mobile?64:180,burstSlots=this.mobile?8:12;
        const studio={...uniforms,u_palette:motion.palette,u_currentPhase:motion.currentUniform,u_contacts:this.aerial.contacts,u_aerialBands:motion.detail,u_aerialTone:motion.tone,u_roles:motion.roles,u_spectrum:motion.spectrum,u_energy:motion.energy,u_colorA:motion.palette.subarray(0,3),u_colorB:motion.palette.subarray(3,6),u_colorC:motion.palette.subarray(6,9),u_spheres:spheres,u_sphereCount:count,u_fluidPass:0,u_aerial:[a.aerialFluid,a.aerialShade],u_studio:[motion.phase,motion.hit,reduced?0:a.motionAmount,this.mobile?1:0],u_bursts:motion.bursts,u_burstPower:motion.powers,u_beadCount:beads,u_beadDensity:Math.min(1.1,a.filigree*.7)*Math.min(1.1,a.orbit),u_spectrumLight:motion.lights};
        this.bind(nebula);this.use(this.aerialBackground,studio);this.quadDraw(this.aerialBackground);yield;
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST);this.use(this.aerialSurface,studio);gl.drawArrays(gl.TRIANGLES,a.aerialFluid>.03?24:0,(count-(a.aerialFluid>.03?4:0))*6);yield;
        if(a.aerialFluid>.03){this.use(this.aerialSurface,{...studio,u_fluidPass:1});gl.drawArrays(gl.TRIANGLES,0,6);}yield;
        gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
        this.use(this.aerialSurface,studio);gl.drawArrays(gl.TRIANGLES,24*6,(beads+burstSlots*8)*6);yield;
        gl.blendFunc(gl.ONE,gl.ONE);this.use(this.aerialCurrents,{...studio,u_currentSegments:this.mobile?64:96,u_currentGlobal:this.mobile?3:6});gl.drawArrays(gl.TRIANGLES,0,(this.mobile?19:30)*(this.mobile?64:96)*6);yield;
      }else if(style.index===5){
        const history=this.spectrumHistory,motion=this.fluxMotion;
        if(this.historyTrack!==d.trackId){motion.beginTrack();this.historyTrack=d.trackId;}
        motion.update(d.fluxClock??d.spectrumClock??time,{active:d.fluxActive!==false,hold:d.fluxHold===true,reduced,movement:a.motionAmount,spectrum:features.spectrum,lights:d.spectrumLight,roles,palette:uniforms.u_palette});
        if(motion.dt)history.update(motion.historyClock,motion.spectrum);
        if(this.historyVersion!==history.version){
          gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.historyTexture);
          gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,48,history.height,gl.RED,gl.UNSIGNED_BYTE,history.data);this.historyVersion=history.version;
        }
        uniforms.u_light=[a.bloom*(1.45+motion.roles[0]*.55+motion.roles[1]*.35),a.glow,reduced?0:a.flash,a.contrast];
        const flux={...uniforms,u_roles:motion.roles,u_palette:motion.palette,u_fluxDistance:fluxCameraDistance(uniforms.u_camera,{aspect:w/h,scale:a.particleSpread,movement:a.motionAmount,explore:d.fluxZoom||0}),u_fluxZoom:d.fluxZoom||0,u_historyHead:history.head,u_historyPhase:history.accumulator*30,u_fluxClock:motion.phase,u_spectrumLight:motion.lights};
        this.bind(nebula);this.use(this.fluxBackground,{...backUniforms,u_resolution:[nebula.w,nebula.h]});this.quadDraw(this.fluxBackground);
        gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);
        this.use(this.fluxDust,{...flux,u_resolution:[nebula.w,nebula.h],u_pixel:density*.7});this.points(this.fluxDust,warmup?32:Math.round((this.mobile?420:1300)*Math.min(1.5,a.orbit)));yield;
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        for(const cross of [0,1]){
          const rows=cross?(this.mobile?14:28):(this.mobile?80:160);
          this.use(this.fluxTrace,{...flux,u_traceRows:rows,u_crossTrace:cross});
          this.texture(this.fluxTrace,'u_history',this.historyTexture,5);gl.drawArrays(gl.TRIANGLES,0,rows*256*6);
        }yield;
        const count=Math.floor(budget*(this.mobile?.48:.7));
        for(const layer of [0,1,2]){
          this.use(this.fluxPoints,{...flux,u_layer:layer,u_density:Math.min(2.5,65536/count)*Math.pow(h/900,.75)});
          this.texture(this.fluxPoints,'u_history',this.historyTexture,5);this.points(this.fluxPoints,Math.floor(count*(layer===0?1:layer===1?.40:.35)));yield;
        }
      }else if(style.index===2){
        const history=this.roadHistory,motion=this.roadMotion;
        if(this.roadHistoryTrack!==d.trackId){motion.beginTrack();this.roadHistoryTrack=d.trackId;}
        motion.update(d.afterglowClock??d.spectrumClock??time,{active:d.afterglowActive!==false,hold:d.afterglowHold===true,reduced,movement:a.motionAmount,spectrum:features.spectrum,lights:d.spectrumLight,roles,palette:uniforms.u_palette});
        if(motion.dt)history.update(motion.historyClock,motion.spectrum);
        if(this.roadHistoryVersion!==history.version){
          gl.activeTexture(gl.TEXTURE5);gl.bindTexture(gl.TEXTURE_2D,this.roadHistoryTexture);
          gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,48,128,gl.RED,gl.UNSIGNED_BYTE,history.data);this.roadHistoryVersion=history.version;
        }
        uniforms.u_world=Array.from(motion.world);uniforms.u_roles=motion.roles;uniforms.u_spectrum=motion.spectrum;uniforms.u_movement=reduced?.1:motion.movement;
        [uniforms.u_colorA,uniforms.u_colorB,uniforms.u_colorC]=[motion.palette.subarray(0,3),motion.palette.subarray(3,6),motion.palette.subarray(6,9)];
        uniforms.u_light=[a.bloom*(1.65+motion.roles[0]*.45+motion.roles[1]*.25),a.glow,reduced?0:a.flash,a.contrast];
        const road={...uniforms,u_historyHead:history.head,u_historyPhase:history.accumulator*30,u_retro:[a.retroScan,a.retroPhosphor,a.retroColor],u_spectrumLight:motion.lights};
        this.bind(nebula);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        this.bind(scene);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
        this.use(this.roadBackground,road);this.quadDraw(this.roadBackground);yield;
        gl.enable(gl.DEPTH_TEST);this.use(this.roadTerrain,road);this.texture(this.roadTerrain,'u_history',this.roadHistoryTexture,5);
        gl.drawArrays(gl.TRIANGLES,0,2*48*128*6);yield;
        gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
        this.use(this.roadPalms,road);this.texture(this.roadPalms,'u_palmAtlas',this.roadPalmAtlas,6);gl.drawArrays(gl.TRIANGLES,0,40*6);yield;
        gl.blendFunc(gl.ONE,gl.ONE);
        for(let tail=this.mobile?3:4;tail>=0;tail--){this.use(this.roadDust,{...road,u_density:1,u_tail:tail});this.roadMotes(warmup?16:Math.round((this.mobile?160:520)*a.orbit));}yield;
      }
      gl.depthMask(true);gl.disable(gl.DEPTH_TEST);gl.disable(gl.BLEND);
      // Downsample and extract emissive light before the separable bloom passes.
      this.bind(bloomA);this.use(this.blur,{u_direction:[1/w,1/h],u_extract:1,u_inkGlow:style.index===4?1:0,u_inkAccent:uniforms.u_inkAccent||[0,0,0]});this.texture(this.blur,'u_image',scene.texture);this.quadDraw(this.blur);
      yield;
      // Astra's stronger light needs a smooth broad halo, not widely spaced
      // blur samples that repeat bright ring edges as ghost bands.
      const glowRadius=style.index===7?Math.min(4.5,1.3+a.glow*1.8+this.synapse.activity*.7):style.index===6?Math.min(1.6,.8+a.glow*.4):style.index===5?Math.min(4,1.4+a.glow*1.8):style.index===2?Math.min(4,1.5+a.glow*1.7):style.index===3||style.index===4?Math.min(4,1+a.glow*1.5):1+a.glow*4;
      for(let pass=0;pass<(style.index===6?3:style.index>=2?2:1);pass++){
        this.bind(bloomB);this.use(this.blur,{u_direction:[glowRadius/bloomA.w,0],u_extract:0});this.texture(this.blur,'u_image',bloomA.texture);this.quadDraw(this.blur);
        this.bind(bloomA);this.use(this.blur,{u_direction:[0,glowRadius/bloomA.h],u_extract:0});this.texture(this.blur,'u_image',bloomB.texture);this.quadDraw(this.blur);
      }
      yield;
      this.bind(null);this.use(this.finish,{...uniforms,u_hdrOutput:extended?1:0});this.texture(this.finish,'u_image',scene.texture);this.texture(this.finish,'u_bloom',bloomA.texture,1);this.texture(this.finish,'u_nebula',nebula.texture,2);this.quadDraw(this.finish);
      yield;
      if(extended&&!this.output.present()){this.uniform(this.finish,'u_hdrOutput',0);this.quadDraw(this.finish);}
      this.canvas.dataset.hdrOutput=this.output.state;
      this.needsFrame=false;this.canvas.dataset.scene='resonance';this.canvas.dataset.artDirection=style.index;return true;
    }catch(e){throw e;}
  }
}
