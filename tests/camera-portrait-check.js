import {GPUScene} from '/gpu-scene.js';
try{
 const gallery=document.querySelector('#gallery'),colors=[[.72,.2,.7],[.12,.65,.8],[.95,.4,.2]],bands=new Float32Array(8).fill(.15),features={bands,spectrum:new Float32Array(48).fill(.2),accents:[0,0,0],loudness:.3,onset:0,flow:.2,atmosphere:{bands,accents:[0,0,0],loudness:.25}},results=[];
 for(const portrait of [false,true]){
  const view=document.createElement('div');view.className='view';const width=portrait?300:580,height=portrait?580:360;view.style.width=width+'px';view.style.height=height+'px';const canvas=document.createElement('canvas');view.append(canvas);gallery.append(view);
  const scene=new GPUScene(canvas);await scene.preparing;const dynamics={shape:.4,spread:.5,flow:.5,bloom:.2,colors,camera:[.8,.3,.1,.03],portraitScene:portrait,kaleidoscope:portrait,kaleidoscopeMode:'facets',backgroundClock:300,backgroundDriftClock:290};const input={width,height,time:10,features,dynamics,quality:'eco',intensity:1};scene.draw(input);await scene.warming;if(!scene.draw(input)||scene.failed)throw Error('Scene failed');
  const camera=scene.gl.getUniform(scene.particles.program,scene.location(scene.particles,'u_camera'));if(Math.abs(camera[0]-.8)>.0001)throw Error('Camera uniform did not reach particles');
  if(portrait){const rect=canvas.getBoundingClientRect();if(Math.abs(rect.width-width)>1||Math.abs(rect.height-height)>1||canvas.width<canvas.height)throw Error('Rotated scene does not fit portrait');if(!canvas.style.transform.includes('90deg'))throw Error('Scene is not rotated');}
  if(scene.gl.getError()!==scene.gl.NO_ERROR)throw Error('WebGL error');results.push({portrait,width:canvas.width,height:canvas.height,transform:canvas.style.transform});
 }
 document.querySelector('#result').textContent='PASS · '+JSON.stringify(results);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));console.log('CAMERA_CHECK:'+JSON.stringify({ok:true,results}));
}catch(e){document.querySelector('#result').textContent=e.stack;console.log('CAMERA_CHECK:'+JSON.stringify({ok:false,error:e.stack}));}
