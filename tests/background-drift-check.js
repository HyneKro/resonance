import {AtmosphereTransition,AtmosphereDrift} from '/atmosphere-transition.js';
import {compileSceneProgram} from '/shader-loader.js';
import {QUAD} from '/scene-shaders.js';
import {NEBULA_LIVE} from '/nebula-live.js';
import {GPUScene} from '/gpu-scene.js';

try{
 const canvas=document.createElement('canvas');canvas.width=320;canvas.height=180;
 const gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true,antialias:false});
 if(!gl)throw Error('WebGL2 unavailable');
 const program=await compileSceneProgram(gl,QUAD,NEBULA_LIVE);
 const renderer=Object.assign(Object.create(GPUScene.prototype),{gl,quad:gl.createBuffer()});
 gl.bindBuffer(gl.ARRAY_BUFFER,renderer.quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const colors=[[.62,.24,.8],[.16,.65,.76],[.94,.56,.3],[.5,.3,.7],[.2,.5,.7],[.8,.5,.5]],stats=[];
 const profile=n=>({signature:Array(4).fill(.5),character:Array(4).fill(.5),themes:Array(6).fill(1/6),recipe:[.5,.5,.5,.5,n,.5,.5,.5]});
 const draw=(time,driftTime,identity)=>{
  renderer.use(program,{u_resolution:[320,180],u_time:time,u_driftTime:driftTime,u_energy:.3,u_intensity:1,u_drive:1,u_low:[.1,.2,.15,.12],u_high:[.12,.1,.06,.02],u_form:[.35,.4,.5,0],u_colorA:colors[0],u_colorB:colors[1],u_colorC:colors[2],u_accents:[0,0,0],u_transients:[0,0,0],u_palette:colors.flat(),u_liquid:[.8,.65,.7],u_cloud:[1,1,1,1],u_signature:identity.signature,u_character:identity.character,u_roles:[0,0,0,0],u_rhythm:[0,1,0,0],u_light:[.35,.45,.1,1.12],u_recipeA:identity.recipe.slice(0,4),u_recipeB:identity.recipe.slice(4),u_themes:identity.themes,u_shimmer:0,u_movement:1});
  renderer.quadDraw(program);
  const pixels=new Uint8Array(320*180*4);gl.readPixels(0,0,320,180,gl.RGBA,gl.UNSIGNED_BYTE,pixels);return pixels;
 };
 const difference=(a,b)=>{let sum=0;for(let i=0;i<a.length;i++)if(i%4!==3)sum+=Math.abs(a[i]-b[i]);return sum/(a.length*.75);};
 const capture=(row,label)=>{const figure=document.createElement('figure'),copy=document.createElement('canvas'),caption=document.createElement('figcaption');copy.width=320;copy.height=180;copy.getContext('2d').drawImage(canvas,0,0);caption.textContent=label;figure.append(copy,caption);row.append(figure);};
 for(const age of [60,21600,86400]){
  const transition=new AtmosphereTransition(),drift=new AtmosphereDrift(),row=document.createElement('div');row.className='row';document.querySelector('#gallery').append(row);
  let frame=transition.update(profile(0),colors,0),phase=drift.update(age,frame.identity.recipe[4]);
  let previousFixed=draw(age,phase,frame.identity),previousOld=previousFixed;capture(row,`${age===60?'1 minute':age/3600+' hours'} · before changing song`);
  let fixedMotion=0,oldMotion=0;
  for(let i=1;i<=60;i++){
   frame=transition.update(profile(1),colors,1/30);const time=age+i/30;
   phase=drift.update(time,frame.identity.recipe[4]);
   const old=draw(time,time*(.55+frame.identity.recipe[4]*.85),frame.identity);
   oldMotion+=difference(old,previousOld);previousOld=old;
   if(i===60)capture(row,'Previous behaviour · after transition');
   const fixed=draw(time,phase,frame.identity);
   fixedMotion+=difference(fixed,previousFixed);previousFixed=fixed;
   if(i===60)capture(row,'Corrected · after transition');
  }
  stats.push({sessionHours:age/3600,oldMeanFrameChange:oldMotion/60,fixedMeanFrameChange:fixedMotion/60});
  if(age>=21600&&oldMotion<fixedMotion*3)throw Error('Long-session motion was not reduced sufficiently: '+JSON.stringify(stats.at(-1)));
 }
 if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL error in background render');
 // Also exercise the real scene's uniform wiring and staged shader warm-up.
 const scene=new GPUScene(document.createElement('canvas'));await scene.preparing;
 const bands=new Float32Array(8),features={bands,spectrum:new Float32Array(48),accents:[0,0,0],loudness:0,onset:0,flow:0,atmosphere:{bands,accents:[0,0,0],loudness:0}};
 const dynamics={shape:.35,spread:.4,flow:.5,bloom:0,colors,backgroundClock:21600,backgroundDriftClock:21060.25};
 const input={width:320,height:180,time:1,features,dynamics,quality:'eco',intensity:1};
 scene.draw(input);await scene.warming;
 if(!scene.draw(input)||scene.failed)throw Error('Full scene failed');
 const actual=scene.gl.getUniform(scene.nebula.program,scene.location(scene.nebula,'u_driftTime'));
 if(actual!==dynamics.backgroundDriftClock)throw Error('Integrated drift did not reach the shader');
 if(scene.gl.getError()!==scene.gl.NO_ERROR)throw Error('Full scene WebGL error');scene.dispose();
 document.querySelector('#result').textContent='PASS · shader + full scene + long-session renders\n'+JSON.stringify(stats);
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 console.log('DRIFT_CHECK:'+JSON.stringify({ok:true,stats}));
}catch(error){document.querySelector('#result').textContent=error.stack;console.log('DRIFT_CHECK:'+JSON.stringify({ok:false,error:error.stack}));}
