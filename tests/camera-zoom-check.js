import {GPUScene} from '/gpu-scene.js';
import {SceneCamera} from '/scene-camera.js';
try{
 const results=[],gallery=document.querySelector('#gallery');
 for(const [label,zoom,loud,rail,compensate]of [['Wide view',false,1,false,true],['Peak zoom · without FOV compensation',true,1,false,false],['Peak zoom · with FOV compensation',true,1,false,true],['Quiet music · automatic light zoom',true,.1,false,true],['Silence · toggle stays on',true,0,false,true],['Reactive zoom + rail + full vertical orbit',true,.9,true,true]]){
  const view=document.createElement('div');view.className='view';view.innerHTML='<p>'+label+'</p>';const canvas=document.createElement('canvas');view.append(canvas);gallery.append(view);
  const camera=new SceneCamera(),bands=new Float32Array(8).fill(loud),features={bands,spectrum:new Float32Array(48).fill(.5),accents:[0,0,0],loudness:loud,onset:0,flow:.5,atmosphere:{bands,accents:[0,0,0],loudness:.3}};
  if(rail)camera.drag(120,1550);let pose;for(let i=0;i<600;i++)pose=camera.update(1/120,{zoom,features,rail,speed:2});
  const scene=new GPUScene(canvas);await scene.preparing;
  const dynamics={shape:.4,spread:.5,flow:.5,bloom:.2,colors:[[.72,.2,.7],[.12,.65,.8],[.95,.4,.2]],camera:pose,cameraFocalLength:compensate?camera.focalLength:1.9,spectralDetail:1.5,backgroundClock:300,backgroundDriftClock:290};
  const input={width:460,height:300,time:10,features,dynamics,quality:'eco',intensity:1};scene.draw(input);await scene.warming;if(!scene.draw(input)||scene.failed)throw Error('Scene failed: '+label);
  const uploaded=scene.gl.getUniform(scene.particles.program,scene.location(scene.particles,'u_camera'));if(Math.abs(uploaded[2]-pose[2])>.0001)throw Error('Zoom did not reach the shader');
  const lens=scene.gl.getUniform(scene.particles.program,scene.location(scene.particles,'u_focalLength'));if(Math.abs(lens-dynamics.cameraFocalLength)>.0001)throw Error('FOV did not reach the shader');
  if(scene.gl.getError()!==scene.gl.NO_ERROR)throw Error('WebGL error: '+label);
  results.push({label,strength:camera.zoom.value,distance:5.4+pose[2],verticalFov:2*Math.atan(1/lens)*180/Math.PI,camera:pose});
 }
 document.querySelector('#result').textContent='PASS · all six perspectives render without GPU errors';await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));console.log('ZOOM_CHECK:'+JSON.stringify({ok:true,results}));
}catch(e){document.querySelector('#result').textContent=e.stack;console.log('ZOOM_CHECK:'+JSON.stringify({ok:false,error:e.stack}));}
