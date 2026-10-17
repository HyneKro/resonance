import {GPUScene} from '/gpu-scene.js';
import {KaleidoscopeBlend,KALEIDOSCOPE_MODES} from '/kaleidoscope.js';
try{
 const canvas=document.querySelector('#scene'),scene=new GPUScene(canvas);await scene.preparing;
 const bands=new Float32Array(8).fill(.5),features={bands,spectrum:new Float32Array(48).fill(.5),accents:[0,0,0],loudness:.5,onset:0,flow:.5,atmosphere:{bands,accents:[0,0,0],loudness:.3}};
 const dynamics={shape:.4,spread:.5,flow:.5,bloom:.2,colors:[[.72,.2,.7],[.12,.65,.8],[.95,.4,.2]],camera:[0,0,0,0],spectralDetail:1.5,backgroundClock:300,backgroundDriftClock:290};
 const input={width:440,height:290,time:10,features,dynamics,quality:'eco',intensity:1,hdrMode:'off'};
 scene.draw(input);await scene.warming;if(!scene.draw(input)||scene.failed)throw Error('Scene failed');
 const gl=scene.gl,weights=new Float32Array(13),states=[{enabled:false},...KALEIDOSCOPE_MODES.map(m=>({enabled:true,mode:m.id}))];
 const read=()=>{const image=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,image);return image;};
 const render=(w,hdr=0)=>{scene.bind(null);scene.use(scene.finish,{u_kaleidoWeights:w,u_kaleidoMotion:.35,u_resolution:[canvas.width,canvas.height],u_light:[.6,0,0,1],u_hdrOutput:hdr});scene.quadDraw(scene.finish);if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL error');return read();};
 const capture=label=>{const figure=document.createElement('figure'),copy=document.createElement('canvas'),caption=document.createElement('figcaption');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);caption.textContent=label;figure.append(copy,caption);document.querySelector('#gallery').append(figure);};
 const endpoints=states.map((state,index)=>{weights.fill(0);weights[index]=1;return render(weights);});
 let pairs=0,maxError=0;
 for(let a=0;a<13;a++)for(let b=0;b<13;b++){
  if(a===b)continue;const blend=new KaleidoscopeBlend();blend.update(0,states[a]);blend.update(0,states[b]);for(let i=0;i<9;i++)blend.update(.05,states[b]);
  const pixels=render(blend.weights);let error=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)error=Math.max(error,Math.abs(pixels[i]-(endpoints[a][i]+endpoints[b][i])*.5));
  if(error>1.1)throw Error(`Dissolve is not the expected image blend: ${a} → ${b}: ${error}`);maxError=Math.max(maxError,error);pairs++;
 }
 for(const [a,b]of [[0,1],[1,4],[4,12],[12,0]]){
  const blend=new KaleidoscopeBlend();blend.update(0,states[a]);blend.update(0,states[b]);
  for(let step=0;step<=4;step++){if(step)for(let i=0;i<9;i++)blend.update(.025,states[b]);render(blend.weights);capture(`${a===0?'Off':KALEIDOSCOPE_MODES[a-1].id} → ${b===0?'Off':KALEIDOSCOPE_MODES[b-1].id} · ${step*25}%`);}
 }
 const blend=new KaleidoscopeBlend();blend.update(0,states[0]);for(const n of [3,8,0,11]){const before=render(blend.weights);blend.update(0,states[n]);const after=render(blend.weights);if(after.some((v,i)=>v!==before[i]))throw Error('Rapid retarget snaps');blend.update(.1,states[n]);}
 render(blend.weights,1); // Extended output uses the same blend before its transfer curve.
 document.querySelector('#result').textContent=`PASS · ${pairs} directed transitions, mid-fade pixel accuracy, rapid retargeting and HDR shader path`;
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));console.log('KALEIDO_CHECK:'+JSON.stringify({ok:true,pairs,maxError}));
}catch(e){document.querySelector('#result').textContent=e.stack;console.log('KALEIDO_CHECK:'+JSON.stringify({ok:false,error:e.stack}));}
