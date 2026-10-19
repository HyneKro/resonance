// Run inside the isolated Electron check. All audio renders offline: no sound,
// network music, microphone, owner library or playback settings are involved.
(async()=>{
 const {AudioFeatures}=await import('/analysis.js'),{VisualConductor}=await import('/visual-conductor.js'),{MusicalResponse}=await import('/musical-response.js'),{SoundRoles}=await import('/sound-roles.js');
 const check=(ok,label)=>{if(!ok)throw Error(label);};
 const sr=48000,duration=22,ctx=new OfflineAudioContext(2,sr*duration,sr),buffer=ctx.createBuffer(2,sr*duration,sr);
 let seed=7;const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
 for(let i=0;i<buffer.length;i++){
  const t=i/sr,beat=t%.5,hat=t%.25,n=noise(),quiet=t>=8&&t<12,build=t>=12&&t<16;
  const pad=(Math.sin(t*Math.PI*2*220)+Math.sin(t*Math.PI*2*277.18)+Math.sin(t*Math.PI*2*329.63))*.024;
  const melody=Math.sin(t*Math.PI*2*[440,554.37,659.25,830.61][Math.floor(t*2)%4])*.025*Math.exp(-beat*5);
  const kick=Math.sin(Math.PI*2*(55*beat+4*(1-Math.exp(-beat*35))))*.22*Math.exp(-beat*22);
  const snare=n*.085*Math.exp(-beat*35)*(Math.floor(t*2)%2),hiss=n*.02*Math.exp(-hat*80);
  const rise=build?.3+(t-12)*.175:quiet?.18:t>=16?1.25:.8;
  const sample=(pad+melody+(quiet?0:kick+snare+hiss))*rise;
  buffer.getChannelData(0)[i]=sample;buffer.getChannelData(1)[i]=sample*.83;
 }
 const source=ctx.createBufferSource();source.buffer=buffer;
 const analyzers=[8192,2048,1024].map(size=>{const a=ctx.createAnalyser();a.fftSize=size;a.smoothingTimeConstant=0;return a;});
 source.connect(analyzers[0]);analyzers[0].connect(analyzers[1]);analyzers[1].connect(analyzers[2]);analyzers[2].connect(ctx.destination);source.start();
 const bins=analyzers.map(a=>new Float32Array(a.frequencyBinCount)),wave=new Float32Array(1024),raw=new AudioFeatures(),conductor=new VisualConductor(),musical=new MusicalResponse(),roles=new SoundRoles();
 const report={frames:0,sampleError:0,peakArrival:0,baseVariation:0,musicalVariation:0,basePeak:0,musicalPeak:0,updateMs:[],checks:[]},saved=[];
 let previous=null,previousTime=0,suspended=ctx.suspend(1/60),render=ctx.startRendering();
 for(let i=1;i<duration*60-1;i++){
  await suspended;const t=ctx.currentTime,dt=t-previousTime;previousTime=t;
  analyzers.forEach((a,j)=>a.getFloatFrequencyData(bins[j]));analyzers[2].getFloatTimeDomainData(wave);
  raw.update(bins[0],wave,sr,8192,dt,t,true,{mid:{frequency:bins[1],fftSize:2048},fast:{frequency:bins[2],fftSize:1024}});
  const base=conductor.update(raw,dt,{responsiveness:2.5}),role=roles.update(raw,dt,{response:2.5}),start=performance.now(),r=musical.update(base,raw,dt,{time:t,roles:role});
  report.updateMs.push(performance.now()-start);report.frames++;report.peakArrival=Math.max(report.peakArrival,r.arrival);
  for(const key of ['harmonic','percussive','transients','morph'])check([...r.features[key]].every(v=>Number.isFinite(v)&&v>=0&&v<=1.001),'Invalid '+key+' at '+t);
  check(r.features.motion===base.motion,'Refinement must preserve the continuous animation clock');
  if(t>3&&previous){for(let k=0;k<48;k++){report.baseVariation+=Math.abs(base.harmonic[k]-previous.base[k]);report.musicalVariation+=Math.abs(r.features.harmonic[k]-previous.musical[k]);}}
  previous={base:[...base.harmonic],musical:[...r.features.harmonic]};
  report.basePeak=Math.max(report.basePeak,...base.transients);report.musicalPeak=Math.max(report.musicalPeak,...r.features.transients);
  if(saved.length<3&&t>=[7.5,14,17][saved.length])saved.push(structuredClone({time:t,base,features:r.features,roles:r.roles}));
  suspended=ctx.suspend((i+1)/60);await ctx.resume();
 }
 await suspended;await ctx.resume();const rendered=await render;
 for(let ch=0;ch<2;ch++){const a=buffer.getChannelData(ch),b=rendered.getChannelData(ch);for(let i=0;i<a.length;i++)report.sampleError=Math.max(report.sampleError,Math.abs(a[i]-b[i]));}
 check(report.sampleError<1e-7,'Audio samples were changed');check(report.musicalVariation<report.baseVariation,'Harmonic motion did not become calmer');check(report.musicalPeak>=report.basePeak*.9,'Percussion lost too much strength');
 report.updateMs.sort((a,b)=>a-b);report.updateP95Ms=report.updateMs[Math.floor(report.updateMs.length*.95)];report.updateMaxMs=report.updateMs.at(-1);delete report.updateMs;
 report.checks=['real multi-window FFT and shared analyzer','finite bounded outputs','continuous geometry clock','original stereo samples unchanged','lower harmonic variation','percussion peak retained'];
 window.musicalAuditFrames=saved;window.musicalAudioReport=report;return report;
})()
