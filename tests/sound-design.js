import {Feedback} from '/feedback.js';
const messages=[],check=(ok,label)=>{if(!ok)throw Error(label);messages.push('PASS · '+label);};
try{for(const rate of [44100,48000])for(const kind of ['hover','click','navigate','back','favorite','adjust','test']){
 const context=new OfflineAudioContext(1,rate,rate),output=context.createDynamicsCompressor();output.threshold.value=-4;output.knee.value=6;output.ratio.value=12;output.attack.value=.003;output.release.value=.1;output.connect(context.destination);
 const feedback=Object.create(Feedback.prototype);Object.assign(feedback,{audio:{muted:false,volume:.7,paused:true},volume:.5,enabled:true,unlocked:true,voices:0,activeVoices:new Set(),output,context:new Proxy(context,{get:(target,key)=>key==='state'?'running':typeof target[key]==='function'?target[key].bind(target):target[key]})});
 feedback.play(kind,2);const buffer=await context.startRendering(),data=buffer.getChannelData(0);let peak=0,tail=0,power=0;for(let i=0;i<data.length;i++){checkFinite(data[i]);peak=Math.max(peak,Math.abs(data[i]));power+=data[i]*data[i];if(i>rate*.85)tail=Math.max(tail,Math.abs(data[i]));}
 check(peak>.005&&peak<.95&&power>0&&tail<.00001,`${kind} at ${rate} Hz: audible, no clipped peaks, clean decay (${peak.toFixed(3)} peak)`);
 }
 document.querySelector('#result').textContent=messages.join('\n')+'\nALL SOUND DESIGN CHECKS PASSED';document.title='PASS · Interface sounds';
}catch(e){document.querySelector('#result').textContent=messages.join('\n')+'\nFAIL · '+e.stack;document.title='FAIL · Interface sounds';}
function checkFinite(x){if(!Number.isFinite(x))throw Error('Invalid sample');}
