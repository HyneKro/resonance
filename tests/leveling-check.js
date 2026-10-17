import {Reactor} from '/reactor.js';
import {levelingDb} from '/song-analysis.js';
const lines=[],out=document.querySelector('#result');
function check(ok,label){if(!ok)throw Error(label);lines.push('PASS · '+label);}
async function render(amplitude,db){
 const context=new OfflineAudioContext(2,48000,48000),buffer=context.createBuffer(2,48000,48000);
 for(let ch=0;ch<2;ch++){const samples=buffer.getChannelData(ch);for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i/48000*440*Math.PI*2)*amplitude*(ch?-.7:1);}
 const source=context.createBufferSource();source.buffer=buffer;
 const r={context,source,filters:[],analyser:context.createAnalyser(),midAnalyser:context.createAnalyser(),fastAnalyser:context.createAnalyser(),setPlaybackGain:Reactor.prototype.setPlaybackGain};
 Reactor.prototype.eq.call(r,[0,0,0]);r.setPlaybackGain(db,{immediate:true});r.setPlaybackGain(db);source.start();
 const paused=context.suspend(.5),rendering=context.startRendering();await paused;
 const spectrum=new Float32Array(r.analyser.frequencyBinCount);r.analyser.getFloatFrequencyData(spectrum);
 await context.resume();const result=await rendering;
 let error=0,power=0;for(let ch=0;ch<2;ch++){const original=buffer.getChannelData(ch),output=result.getChannelData(ch);for(let i=0;i<output.length;i++){error=Math.max(error,Math.abs(output[i]-original[i]*10**(db/20)));if(!ch)power+=output[i]**2;}}
 return {error,rms:Math.sqrt(power/48000),spectrum};
}
try{
 const quiet=await render(.2,levelingDb({integratedLufs:-17,truePeakDb:20*Math.log10(.2)},true));
 const loud=await render(.8,levelingDb({integratedLufs:-17+20*Math.log10(4),truePeakDb:20*Math.log10(.8)},true));
 const bypass=await render(.8,0);
 check(quiet.error<1e-6&&loud.error<1e-6,'Every output sample follows the fixed gain from the very first frame');
 check(Math.abs(20*Math.log10(quiet.rms/loud.rms))<.001,'A 12 dB difference is leveled to within 0.001 dB for these known profiles');
 check(bypass.error===0,'Turning leveling off passes stereo samples unchanged');
 check(loud.spectrum.every((x,i)=>x===bypass.spectrum[i]),'Leveling leaves the visualizer analysis unchanged');
 out.textContent=lines.join('\n')+'\nALL GAIN CHECKS PASSED';document.title='PASS — gain checks';
}catch(e){out.textContent=lines.join('\n')+'\nFAIL · '+e.stack;document.title='FAIL — gain checks';}
