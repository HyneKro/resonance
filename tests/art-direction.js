import {GPUScene} from '/gpu-scene.js';import {SCULPTURE_NAMES} from '/sculpture-forms.js';
const canvas=document.querySelector('#stage'),scene=new GPUScene(canvas),report=document.querySelector('#report'),messages=[];
const check=(ok,label)=>{if(!ok)throw Error(label);messages.push('PASS · '+label);};
const bands=new Float32Array(8).fill(.45),spectrum=new Float32Array(48).fill(.55),features={bands,spectrum,accents:[0,0,0],transients:[.1,0,0],loudness:.5,onset:0,morph:[.4,.5,.5,.6],flow:.18,atmosphere:{bands,accents:[0,0,0],loudness:.25}};
const colors=[[.08,.55,.82],[.56,.025,.42],[.16,.08,.69],[.08,.7,.66],[.35,.06,.53],[.02,.24,.4]],identity={signature:[.52,.32,.7,.45],character:[.6,.5,.7,.5],themes:[.8,.2,0,0,0,0],recipe:[.7,.3,.5,.8,.4,.6,.2,.4],sculpture:[0,0,1,1]};
const dynamics={identity,colors,shape:.4,spread:.5,flow:.4,bloom:.3,particleColor:'palette',spectralDetail:.45,roles:{bass:.4,drums:.3,lead:.4,shimmer:.3},rhythm:{phase:16,pulse:.3,confidence:.9},appearance:{}};
const draw=(w=500,h=330)=>scene.draw({width:w,height:h,time:28,features,dynamics,quality:'high',intensity:1.2});
const capture=(target,name)=>{const figure=document.createElement('figure'),copy=document.createElement('canvas'),label=document.createElement('figcaption');copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);label.textContent=name;figure.append(copy,label);document.querySelector(target).append(figure);};
const pixels=()=>{const p=new Uint8Array(canvas.width*canvas.height*4);scene.gl.readPixels(0,0,canvas.width,canvas.height,scene.gl.RGBA,scene.gl.UNSIGNED_BYTE,p);return p;};
const difference=(a,b)=>{let changed=0;for(let i=0;i<a.length;i+=4)if(Math.max(...[0,1,2].map(j=>Math.abs(a[i+j]-b[i+j])))>14)changed++;return changed/(a.length/4);};
try{check(!scene.failed,'all expanded sculpture shaders compile');const images=[];
 for(let i=0;i<24;i++){identity.sculpture=[i,i,1,1];if(i<6)identity.themes=Array.from({length:6},(_,j)=>i===j?1:0);else identity.themes=[.8,.2,0,0,0,0];check(draw(),'sculpture '+SCULPTURE_NAMES[i]+' renders');images.push(pixels());capture('#gallery',SCULPTURE_NAMES[i]);}
 for(let i=6;i<24;i++)check(images.slice(0,i).every(p=>difference(p,images[i])>.005),SCULPTURE_NAMES[i]+' has a distinct silhouette');
 const before=images[8];identity.sculpture=[8,8,1,1];identity.signature=[.1,.8,.25,.75];draw();check(difference(before,pixels())>.03,'the same form has track-specific proportions');identity.signature=[.52,.32,.7,.45];
 check(scene.gl.getError()===scene.gl.NO_ERROR,'no WebGL errors');report.textContent=messages.join('\n')+'\nALL ART DIRECTION CHECKS PASSED';document.title='PASS · Resonance art direction';
}catch(e){report.textContent=messages.join('\n')+'\nFAIL · '+e.stack;document.title='FAIL · Resonance art direction';}
identity.sculpture=[8,8,1,1];draw(innerWidth,500);
