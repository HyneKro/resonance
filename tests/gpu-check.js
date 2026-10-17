import {KALEIDOSCOPE_MODES} from '/kaleidoscope.js';
import {AtmosphereTransition} from '/atmosphere-transition.js';
import {GPUScene} from '/gpu-scene.js';
import {CharacterMixer,createTrackCharacter,FORM_NAMES} from '/track-character.js';
const result=document.querySelector('#result'),messages=[];
function check(value,label){if(!value)throw Error(label);messages.push('PASS · '+label);}
try{
 const canvas=document.querySelector('canvas'),scene=new GPUScene(canvas);check(!scene.failed,'WebGL2 programs compile');
 const bands=new Float32Array(8).fill(.5),spectrum=new Float32Array(48);spectrum[11]=.9;
 const features={bands,spectrum,accents:new Float32Array(3),loudness:.6,onset:0,morph:[.5,.5,.5,.5],flow:.3,atmosphere:{bands,accents:[0,0,0],loudness:.5}};
 const dynamics={shape:.4,spread:.4,flow:.5,bloom:.4,colors:[[.7,.3,.8],[.2,.7,.8],[.9,.8,.6]],particleColor:'birth',spectralDetail:.8};
 const draw=time=>scene.draw({width:640,height:420,time,features,dynamics,quality:'eco',intensity:1});
 const read=(buffer,offset,count)=>{const out=new Float32Array(count);scene.gl.bindBuffer(scene.gl.ARRAY_BUFFER,buffer);scene.gl.getBufferSubData(scene.gl.ARRAY_BUFFER,offset,out);return out;};
 check(draw(1)&&draw(1.01),'sculpture, nebula, flow, spectrum and bloom render');
 check(!scene.galaxy&&!scene.comets,'retired layers allocate no programs');
 const count=Math.floor(scene.maxParticles*.42);
 let births=read(scene.births.buffers[scene.births.current],0,count*4);
 check(Array.from({length:count},(_,i)=>births[i*4+2]).every(x=>Math.abs(x-11/47)<.00001),'every sculpture birth captures the only audible frequency');
 let flow=read(scene.flow.buffers[scene.flow.current],0,128*12);
 check(Array.from({length:128},(_,i)=>flow[i*12+10]).every(x=>Math.abs(x-11/47)<.00001),'persistent flow captures frequency on initial birth');
 spectrum.fill(0);spectrum[42]=.8;draw(1.1);
 let held=read(scene.births.buffers[scene.births.current],0,count*4),heldFlow=read(scene.flow.buffers[scene.flow.current],0,128*12);
 check(held.every((x,i)=>x===births[i]),'sculpture birth attributes stay unchanged when the music changes');
 check(Array.from({length:128},(_,i)=>heldFlow[i*12+10]===flow[i*12+10]).every(Boolean),'flow birth colors stay unchanged while particles travel');
 draw(25);births=read(scene.births.buffers[scene.births.current],0,count*4);
 check(Array.from({length:count},(_,i)=>births[i*4+2]).every(x=>Math.abs(x-42/47)<.00001),'expired particles capture the new frequency on rebirth');
 spectrum.fill(0);draw(45);births=read(scene.births.buffers[scene.births.current],0,count*4);
 check(Array.from({length:count},(_,i)=>births[i*4+2]).every(x=>x===-1),'silent births remain neutral instead of inventing a frequency');
 for(const particleColor of ['white','palette','frequency','birth']){dynamics.particleColor=particleColor;check(draw(45.1),'color mode '+particleColor+' renders');}
 const pixels=()=>{const p=new Uint8Array(canvas.width*canvas.height*4);scene.gl.readPixels(0,0,canvas.width,canvas.height,scene.gl.RGBA,scene.gl.UNSIGNED_BYTE,p);return p;};
 dynamics.appearance={bloom:0,glow:0,contrast:1,flash:0};draw(45.1);const base=pixels();
 dynamics.appearance={bloom:2.5,glow:2,contrast:1.8,flash:2,galaxyDensity:2,comets:2,gravity:1.5,particleSize:2,particleSpread:1.6,motionAmount:3.5};
 dynamics.roles={bass:1,drums:1,lead:1,texture:1,shimmer:1};dynamics.rhythm={phase:.25,pulse:1,confidence:1};dynamics.pointer=[.3,-.2,1,1];
 dynamics.identity={signature:[.9,.1,.8,.2],character:[1,.9,.8,.9],themes:[0,1,0,0,0,0]};check(draw(45.1),'maximum lighting, track character and motion render');const changed=pixels();
 check(changed.some((v,i)=>i%4!==3&&Math.abs(v-base[i])>15),'new appearance and track character visibly affect pixels');
 check(changed.some((v,i)=>i%4!==3&&v>40)&&changed.some((v,i)=>i%4!==3&&v<10),'maximum lighting retains luminous detail and dark space');
 // Compare identical frames at the user's default settings, including quiet music.
 const coverage=(a,b,threshold=12)=>{let n=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>threshold)n++;return n/(a.length/4);};
 dynamics.appearance={};dynamics.particleColor='palette';dynamics.roles={};dynamics.rhythm={phase:0,pulse:0,confidence:0};
 const gallery=document.createElement('section');gallery.id='gallery';document.querySelector('h1').after(gallery);
 const capture=name=>{const item=document.createElement('figure'),copy=document.createElement('canvas'),label=document.createElement('figcaption');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);label.textContent=name;item.append(copy,label);gallery.append(item);};
 const mixer=new CharacterMixer();mixer.select(createTrackCharacter({id:'stage',title:'Music',genre:'Ambient'}));
 dynamics.identity=mixer.update(0,{enabled:false,reduced:true});draw(48.1);capture('Character off · original membrane');
 const foreground=()=>{const gl=scene.gl,p=scene.hdr?new Float32Array(canvas.width*canvas.height*4):new Uint8Array(canvas.width*canvas.height*4);gl.bindFramebuffer(gl.FRAMEBUFFER,scene.targets[0].frame);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,scene.hdr?gl.FLOAT:gl.UNSIGNED_BYTE,p);gl.bindFramebuffer(gl.FRAMEBUFFER,null);return p;};
 const original=foreground(),forms=[];
 for(let i=0;i<6;i++){
  dynamics.identity={...dynamics.identity,sculpture:[i,i,1,1],themes:Array.from({length:6},(_,j)=>i===j?1:0)};draw(48.1);forms.push(foreground());const area=coverage(original,forms.at(-1),scene.hdr?.025:6);
  check(area>.015,`${FORM_NAMES[i]} changes ${(area*100).toFixed(1)}% of foreground pixels, excluding the background`);capture(FORM_NAMES[i]);
 }
 for(let i=0;i<forms.length;i++)for(let j=i+1;j<forms.length;j++)check(coverage(forms[i],forms[j],scene.hdr?.025:6)>.01,FORM_NAMES[i]+' and '+FORM_NAMES[j]+' have distinct silhouettes');


 const travel=new AtmosphereTransition();
 const prior={...dynamics.identity,backgroundTarget:null,recipe:Array(8).fill(.1)},incoming={...prior,signature:[.1,.9,.3,.8],recipe:Array(8).fill(.9)};
 dynamics.background=travel.update(prior,dynamics.colors,0);draw(48.1);
 const oldBackground=pixels();
 for(let i=0;i<120;i++){dynamics.background=travel.update(incoming,dynamics.colors,1/60);if(!draw(48.1))throw Error('Short travel frame '+i);}
 check(!scene.backgroundFrom&&!scene.backgroundTo&&scene.targets.length===4,'travel uses no dissolve buffers');
 const differences=coverage(oldBackground,pixels(),0);messages.push('Travel pixel difference '+differences+' recipes '+JSON.stringify(dynamics.background.identity.recipe));
 check(differences>.001,'short travel still changes the fluid');
 const normalPixels=pixels();dynamics.kaleidoscope=true;check(draw(48.1),'kaleidoscope toggle draws');check(coverage(normalPixels,pixels(),10)>.1,'kaleidoscope visibly mirrors the live image');capture('Kaleidoscope');
 const kaleidoPixels=[];for(const mode of KALEIDOSCOPE_MODES){dynamics.kaleidoscopeMode=mode.id;check(draw(48.1),mode.label+' draws');const image=pixels();for(const prior of kaleidoPixels)check(coverage(prior.image,image,6)>.025,mode.label+' differs from '+prior.name);kaleidoPixels.push({name:mode.label,image});capture(mode.label);}
 dynamics.kaleidoscope=false; dynamics.appearance={};dynamics.rotationClock=200;check(draw(48.1),'constant sculpture rotation draws');
 for(let from=0;from<24;from++)for(let to=0;to<24;to++){dynamics.identity={...dynamics.identity,sculpture:[from,to,.5,1],shapeFrom:[.1,.2,.3,.4],shapeTo:[.9,.8,.7,.6]};if(!scene.draw({width:160,height:120,time:48.1,features,dynamics,quality:'eco',intensity:1}))throw Error('Failed shape pair '+from+' / '+to);}
 check(true,'all 576 sculpture transition pairs render');
 check(scene.draw({width:800,height:480,time:48.1,features,dynamics,quality:'eco',intensity:1}),'resize during short travel renders');
 check(scene.draw({width:640,height:420,time:0,features,dynamics,quality:'eco',intensity:1,reduced:true}),'reduced motion renders safely');
 check(scene.gl.getError()===scene.gl.NO_ERROR,'no WebGL errors after transform feedback and all color passes');
 result.textContent=messages.join('\n')+'\nALL GPU CHECKS PASSED';document.title='PASS — Resonance GPU checks';
}catch(error){result.textContent=messages.join('\n')+'\nFAIL · '+error.stack;document.title='FAIL — Resonance GPU checks';}
