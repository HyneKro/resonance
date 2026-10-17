import {Reactor} from '/reactor.js';
import {GPUScene} from '/gpu-scene.js';
import {VisualTrackSelection,createTrackCharacter} from '/track-character.js';
const result=document.querySelector('#result'),canvas=document.querySelector('canvas');
try{
 const audio={currentTime:0,paused:false},reactor=new Reactor(audio),scene=new GPUScene(canvas);await scene.preparing;
 const bands=new Float32Array(8).fill(.15),features={bands,spectrum:new Float32Array(48).fill(.2),accents:[0,0,0],transients:[0,0,0],loudness:.3,onset:0,morph:[.4,.3,.4,.2],atmosphere:{bands,accents:[0,0,0],loudness:.3}};
 const profile={duration:100,step:1,timeline:Array.from({length:100},(_,t)=>[t,-20,t<40?.1:.9,.3,.2])};
 const selection=new VisualTrackSelection({read:async track=>{await new Promise(r=>setTimeout(r,80));return {profile,character:createTrackCharacter(track)};},pending:()=>reactor.visualPending=true,apply:v=>reactor.selectVisualTrack(v)});
 let clock=0,previous=null,maxDelta=0,frameCount=0;
 const input=()=>({width:640,height:360,time:clock,features,dynamics:reactor.visualState(1/60),quality:'eco',intensity:1});
 scene.draw(input());await scene.warming;
 async function frames(n){for(let f=0;f<n;f++){
  clock+=1/60;reactor.clock=clock;audio.currentTime+=1/60;
  if(!scene.draw(input()))throw Error(scene.error||'Render failed');
  const pixels=new Uint8Array(canvas.width*canvas.height*4),gl=scene.gl;gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  if(previous){let sum=0;for(let i=0;i<pixels.length;i++)if(i%4!==3)sum+=Math.abs(pixels[i]-previous[i]);maxDelta=Math.max(maxDelta,sum/(pixels.length*.75));}previous=pixels;frameCount++;
  if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL error');
  await new Promise(requestAnimationFrame);
 }}
 await selection.select({id:'ocean',title:'Tidal',genre:'Ambient'},'one');await frames(240);
 audio.currentTime=0;const next=selection.select({id:'ember',title:'Solar',genre:'Metal'},'two');await frames(12);await next;await frames(260);
 audio.currentTime=82;await frames(260);
 await selection.select({id:'ember',title:'Solar',genre:'Metal',artwork:'arrived.webp'},'two');await frames(60);
 if(maxDelta>12)throw Error('Abrupt whole-frame change: '+maxDelta);
 result.textContent=`PASS · ${frameCount} rendered frames through song change, delayed lookup, seek and artwork refresh\nPASS · WebGL reports no errors\nLargest mean frame difference: ${maxDelta.toFixed(3)} / 255\nNo crossfade or audio gain involved.`;
 document.title='PASS — visual handoff';scene.dispose();
}catch(e){result.textContent='FAIL · '+e.stack;document.title='FAIL — visual handoff';}
