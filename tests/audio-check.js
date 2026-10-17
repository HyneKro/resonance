import {bandPower} from '/analysis.js';
const out=document.querySelector('#result'),messages=[];
function check(ok,label){if(!ok)throw Error(label);messages.push('PASS · '+label);}
try{
 for(const sr of [44100,48000,96000]){
  const ctx=new OfflineAudioContext(2,Math.ceil(sr*.16),sr),buffer=ctx.createBuffer(2,Math.ceil(sr*.16),sr);
  for(let ch=0;ch<2;ch++){const data=buffer.getChannelData(ch);for(let i=0;i<data.length;i++){const t=i/sr;data[i]=t>=.04&&t<.08?Math.sin(t*Math.PI*2*8000)*.2*(ch?-.7:1):0;}}
  const source=ctx.createBufferSource();source.buffer=buffer;
  const analysers=[8192,2048,1024].map(size=>{const a=ctx.createAnalyser();a.fftSize=size;a.smoothingTimeConstant=0;return a;});
  source.connect(analysers[0]);analysers[0].connect(analysers[1]);analysers[1].connect(analysers[2]);analysers[2].connect(ctx.destination);source.start();
  const suspended=ctx.suspend(.055),render=ctx.startRendering();await suspended;
  const values=analysers.map(a=>{const f=new Float32Array(a.frequencyBinCount);a.getFloatFrequencyData(f);return bandPower(f,sr,a.fftSize,7600,8400);});
  check(values[2]>values[0]*2,`${sr} Hz: a short treble accent registers earlier in the fast window (${values.map(x=>x.toFixed(5)).join(' / ')})`);
  await ctx.resume();const rendered=await render;
  let maxError=0;for(let ch=0;ch<2;ch++){const a=buffer.getChannelData(ch),b=rendered.getChannelData(ch);for(let i=0;i<a.length;i++)maxError=Math.max(maxError,Math.abs(a[i]-b[i]));}
  check(maxError<1e-7,`${sr} Hz: original stereo samples pass through the three analysers unchanged`);
 }
 out.textContent=messages.join('\n')+'\nALL AUDIO CHECKS PASSED';document.title='PASS — Audio checks';
}catch(e){out.textContent=messages.join('\n')+'\nFAIL · '+e.stack;document.title='FAIL — Audio checks';}
