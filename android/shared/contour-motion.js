// A continuous ink gesture, wet pools and a bounded memory of absorbed pigment.
// Every stage follows playback time; pause never catches up missing simulation.
const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
const hash=n=>{const v=Math.sin(n*127.1+19.3)*43758.5453;return v-Math.floor(v);};
export const CONTOUR_RAIN_COUNT=64,CONTOUR_DROP_LIFE=6.4,CONTOUR_MEMORY_COUNT=128,CONTOUR_MEMORY_LIFE=45;
export const CONTOUR_INK_WIDTH=CONTOUR_RAIN_COUNT+CONTOUR_MEMORY_COUNT;
export const CONTOUR_CURRENT_COUNT=32,CONTOUR_BLOOM_COUNT=8,CONTOUR_CURRENT_WIDTH=40;
// Same un-displaced gesture/layout as the shader. Binding uses paper distance;
// the rendered endpoint then follows the live frequency gesture on the GPU.
export function contourAnchor(t,ratio=1){
 const a=t*5.75+.25,q=Math.max(0,Math.min(1,(t-.76)/.24)),tail=q*q*(3-2*q);
 let x=(-.28+Math.cos(a)*.53)*(1-tail)+(-.04+(t-.76)*5)*tail;
 let y=(.06+Math.sin(a)*.53)*(1-tail)+(-.24+Math.sin(t*9)*.09)*tail;
 const scale=ratio<.85?Math.min(.58,ratio*.91):Math.min(.82,ratio*.52);
 if(ratio<.85)[x,y]=[y,-x];return [x*scale/ratio,y*scale+(ratio<.85?.03:0)];
}
export class ContourMotion {
 constructor(){
  const row=CONTOUR_INK_WIDTH*4;this.data=new Float32Array(row*4);
  this.drops=this.data.subarray(0,CONTOUR_RAIN_COUNT*4);this.memory=this.data.subarray(CONTOUR_RAIN_COUNT*4,row);
  this.details=this.data.subarray(row,row*2);this.links=this.data.subarray(row*2,row*2+CONTOUR_RAIN_COUNT*4);this.tints=this.data.subarray(row*3,row*4);
  this.connections=new Int16Array(CONTOUR_RAIN_COUNT);this.archived=new Uint8Array(CONTOUR_RAIN_COUNT);
  this.material=new Float32Array(4);this.accent=new Float32Array([1,.055,.025]);this.spectrum=new Float32Array(48);this.lights=new Float32Array(48);this.roles=new Float32Array(4);this.reset();
 }
 reset(){this.time=0;this.clock=null;this.next=0;this.memoryNext=0;this.emitted=0;this.remembered=0;this.envelope=0;this.lastHit=-10;this.lastLarge=-10;this.credit=0;this.rainEnergy=0;this.data.fill(0);this.connections.fill(-1);this.archived.fill(0);
  this.currentData??=new Float32Array(CONTOUR_CURRENT_WIDTH*4*4);this.currentData.fill(0);
  this.bound??=new Uint8Array(CONTOUR_RAIN_COUNT);this.bound.fill(0);this.currentNext=0;this.bloomNext=0;this.currents=0;this.blooms=0;this.lastBloom=-10;this.flowPhase=0;
  this.track=undefined;this.hasTrack=false;this.transition=0;this.spectrum.fill(0);this.lights.fill(0);this.roles.fill(0);
 }
 selectTrack(id){
  if(this.hasTrack&&this.track===id)return;
  // A new song changes the listening targets, never clears the painting.
  if(this.hasTrack){this.transition=1.6;this.envelope=1;this.lastHit=this.time;}
  this.track=id;this.hasTrack=true;
 }
 suspend(){this.clock=null;this.envelope=0;}
 update(clock,{onset=0,drums=0,bass=0,lead=0,texture=0,energy=0,reduced=false,colors,spectrum,lights,ratio=1}={}){
  if(!Number.isFinite(clock))return this;
  const attack=Math.max(unit(onset),unit(drums)*.8);energy=unit(energy);
  if(this.clock===null){this.clock=clock;this.envelope=attack;return this;}
  const dt=clock-this.clock;this.clock=clock;
  if(reduced||dt<=0||dt>.25){if(dt<0||dt>.25)this.envelope=attack;return this;}
  this.time+=dt;
  const response=1-Math.exp(-dt/(.065+.48*this.transition/1.6));
  for(let i=0;i<48;i++){this.spectrum[i]+=(unit(spectrum?.[i])-this.spectrum[i])*response;this.lights[i]+=(unit(lights?.[i])-this.lights[i])*response;}
  const roleTargets=[bass,drums,lead,texture];for(let i=0;i<4;i++)this.roles[i]+=(unit(roleTargets[i])-this.roles[i])*response;
  this.transition=Math.max(0,this.transition-dt);
  let total=0,weighted=0;for(let i=0;i<48;i++){const v=unit(spectrum?.[i]);total+=v;weighted+=v*i/47;}
  const balance=total>0?weighted/total:.3;
  if(colors?.length>=3){
   const mix=energy*.85,palette=colors[0].map((v,i)=>v*(1-balance)+colors[2][i]*balance);
   const lo=Math.min(...palette),hi=Math.max(...palette),response=1-Math.exp(-dt/1.4);
   for(let i=0;i<3;i++){const rest=[1,.055,.025][i],tint=hi-lo>.01?.035+.965*(palette[i]-lo)/(hi-lo):rest;this.accent[i]+=(rest*(1-mix)+tint*mix-this.accent[i])*response;}
  }
  const targets=[unit(bass),energy,balance,attack];
  for(let i=0;i<4;i++)this.material[i]+=(targets[i]-this.material[i])*(1-Math.exp(-dt/(i===3?.14:.30)));
  this.flowPhase+=dt*(.10+this.material[1]*.22+this.material[0]*.38);
  // Archive a selection of dry marks. Never replace a still-visible memory.
  for(let i=0;i<CONTOUR_RAIN_COUNT;i++){
   const at=i*4,wet=this.time-this.drops[at+2]-this.details[at+1];
   if(!this.drops[at+3]||this.archived[i]||wet<4.5)continue;
   this.archived[i]=1;
   if(this.details[at+2]<.5||(this.details[at+2]<1.5&&this.details[at+3]<.55))continue;
   for(let k=0;k<CONTOUR_MEMORY_COUNT;k++){
    const slot=(this.memoryNext+k)%CONTOUR_MEMORY_COUNT,m=slot*4;
    if(this.memory[m+3]&&this.time-this.memory[m+2]<CONTOUR_MEMORY_LIFE)continue;
    const dest=(CONTOUR_RAIN_COUNT+slot)*4;
    this.memory.set([this.drops[at],this.drops[at+1],this.time,.032+this.drops[at+3]*.045],m);
    this.details.set(this.details.subarray(at,at+4),dest);this.tints.set(this.tints.subarray(at,at+4),dest);
    this.memoryNext=(slot+1)%CONTOUR_MEMORY_COUNT;this.remembered++;break;
   }
  }
  this.rainEnergy+=(energy-this.rainEnergy)*(1-Math.exp(-dt/.28));
  this.credit+=energy>.015?dt*(.7+this.rainEnergy*6.5+unit(texture)*1.8):0;
  const rise=attack-this.envelope;
  if(energy>.015&&attack>.24&&rise>.09&&this.time-this.lastHit>.24){this.credit+=.7+attack*1.8;this.lastHit=this.time;}
  this.credit=Math.min(3,this.credit);
  if(energy>.015)while(this.credit>=1){
   let slot=-1;
   for(let j=0;j<CONTOUR_RAIN_COUNT;j++){const k=(this.next+j)%CONTOUR_RAIN_COUNT,at=k*4;if(!this.drops[at+3]||this.time-this.drops[at+2]>=CONTOUR_DROP_LIFE){slot=k;break;}}
   if(slot<0){this.credit=Math.min(1,this.credit);break;}
   const n=this.emitted++,seed=hash(n+11),at=slot*4;
   let kind=seed<.30?0:1;
   if(attack>.65&&energy>.35&&seed>.68&&this.time-this.lastLarge>1.2){kind=2;this.lastLarge=this.time;}
   const strength=unit(.16+energy*.46+unit(bass)*.22+attack*.24)*(.65+seed*.35);
   const radius=kind===0?.0028+strength*.004:kind===2?.040+strength*.028:.011+strength*.022;
   let x=((n*.61803398875+.17)%1)*1.8-.9,y=((n*.754877666+.31)%1)*1.35-.68;
   // Some rain falls near a recent pool, so wet stains can genuinely connect.
   if(n%4===2&&kind>0){
    for(let k=1;k<CONTOUR_RAIN_COUNT;k++){
     const a=((slot-k+CONTOUR_RAIN_COUNT)%CONTOUR_RAIN_COUNT)*4,age=this.time-this.drops[a+2]-this.details[a+1];
     if(this.drops[a+3]&&this.details[a+2]>.5&&age>0&&age<2.2){const angle=hash(n+31)*Math.PI*2,distance=this.details[a]*.75+radius*.85;x=this.drops[a]+Math.cos(angle)*distance/Math.max(.4,ratio);y=this.drops[a+1]+Math.sin(angle)*distance;break;}
    }
   }
   this.drops.set([Math.max(-.92,Math.min(.92,x)),Math.max(-.70,Math.min(.70,y)),this.time,strength],at);
   this.details.set([radius,.45+hash(n+21)*.40,kind,seed],at);
   const neutral=Math.min(...this.accent)*.85,peak=Math.max(.01,Math.max(...this.accent)-neutral);
   this.tints.set([...Array.from(this.accent,c=>(c-neutral)/peak),hash(n+41)>.36?1:0],at);
   this.archived[slot]=0;this.bound[slot]=0;this.connections[slot]=-1;this.links.fill(0,at,at+4);
   this.next=(slot+1)%CONTOUR_RAIN_COUNT;this.credit--;
  }
  this.updatePools(dt,Math.max(.4,Math.min(3,ratio)));
  this.updateCurrents(energy,attack,rise,Math.max(.4,Math.min(3,ratio)));
  this.envelope=attack>this.envelope?attack:this.envelope+(attack-this.envelope)*(1-Math.exp(-dt/.11));
  return this;
 }
 writeCurrent(slot,x,y,t,strength,seed,kind,tint,neighbor){
  const row=CONTOUR_CURRENT_WIDTH*4,at=slot*4;
  this.currentData.set([x,y,this.time,strength],at);
  this.currentData.set([t,seed,kind,kind?15:9],row+at);
  this.currentData.set(tint,row*2+at);
  this.currentData.set(neighbor||[x,y,0,0],row*3+at);
 }
 updateCurrents(energy,attack,rise,ratio){
  // A drop binds once after impact. Do not invent streams during silence, or
  // replace one while it is still wet/visible. Deposited pigment never recolors.
  if(energy>.04)for(let i=0;i<CONTOUR_RAIN_COUNT;i++){
   const at=i*4,age=this.time-this.drops[at+2]-this.details[at+1];
   if(this.bound[i]||!this.drops[at+3]||this.details[at+2]<.5||age<.15||age>1.3)continue;
   let best=Infinity,t=0;
   for(let k=3;k<62;k++){const u=k/64,p=contourAnchor(u,ratio),d=Math.hypot((p[0]-this.drops[at])*ratio,p[1]-this.drops[at+1]);if(d<best){best=d;t=u;}}
   if(best<.06||best>.55)continue;
   let slot=-1;
   for(let k=0;k<CONTOUR_CURRENT_COUNT;k++){const s=(this.currentNext+k)%CONTOUR_CURRENT_COUNT,a=s*4;if(!this.currentData[a+3]||this.time-this.currentData[a+2]>=9){slot=s;break;}}
   if(slot<0)break;
   const neighbor=this.connections[i],link=neighbor>=0?[this.drops[neighbor*4],this.drops[neighbor*4+1],1,this.details[at]]:null;
   this.writeCurrent(slot,this.drops[at],this.drops[at+1],t,this.drops[at+3],this.details[at+3],0,this.tints.subarray(at,at+4),link);
   this.bound[i]=1;this.currentNext=(slot+1)%CONTOUR_CURRENT_COUNT;this.currents++;
  }
  if(energy<.4||attack<.7||rise<.12||this.time-this.lastBloom<2.8)return;
  const slot=CONTOUR_CURRENT_COUNT+this.bloomNext,at=slot*4;
  if(this.currentData[at+3]&&this.time-this.currentData[at+2]<15)return;
  const seed=hash(this.blooms+91),t=.12+seed*.64;
  this.writeCurrent(slot,0,0,t,unit(energy*.55+attack*.45),seed,1,[...this.accent,1]);
  this.bloomNext=(this.bloomNext+1)%CONTOUR_BLOOM_COUNT;this.blooms++;this.lastBloom=this.time;
 }
 updatePools(dt,ratio){
  const radius=i=>{const at=i*4,age=this.time-this.drops[at+2]-this.details[at+1];return this.drops[at+3]>0&&this.details[at+2]>.5&&age>.025&&age<3.3?this.details[at]*(.34+.66*(1-Math.exp(-age*7))):0;};
  const radii=Array.from({length:CONTOUR_RAIN_COUNT},(_,i)=>radius(i));
  for(let i=0;i<CONTOUR_RAIN_COUNT;i++){
   const at=i*4,r=radii[i],old=this.connections[i];let target=-1,best=Infinity;
   if(r)for(let j=0;j<CONTOUR_RAIN_COUNT;j++){
    if(j===i||!radii[j])continue;
    const d=Math.hypot((this.drops[j*4]-this.drops[at])*ratio,this.drops[j*4+1]-this.drops[at+1]);
    if(d>r+radii[j]+Math.min(r,radii[j])*.55)continue;
    if(j===old){target=j;break;}
    if(d<best){best=d;target=j;}
   }
   if(old>=0&&target!==old&&this.links[at+3]>.001){this.links[at+3]*=Math.exp(-dt/.12);continue;}
   this.connections[i]=target;
   if(target<0){this.links[at+3]*=Math.exp(-dt/.12);continue;}
   this.links[at]=this.drops[target*4];this.links[at+1]=this.drops[target*4+1];this.links[at+2]=radii[target];
   this.links[at+3]+=(1-this.links[at+3])*(1-Math.exp(-dt/.12));
  }
 }
}

// Rasterized only on a size/layout change. System fonts, no network or font loading.
export function contourLettering(width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d'),portrait=width<height,s=Math.min(width/(portrait?650:1000),height/700);
 const left=width*.09,right=width*.91,top=height*.17,bottom=height*.82;
 ctx.fillStyle='#222321';ctx.textBaseline='alphabetic';
 ctx.font=`${Math.max(6,26*s)}px Georgia, serif`;ctx.fillText('Contour',left,top);
 ctx.font=`${Math.max(4,9*s)}px sans-serif`;ctx.fillStyle='#62625a';
 ctx.fillText(portrait?'SOUND / INK':'S T U D I E S   I N   S O U N D',left,top+21*s);
 ctx.textAlign='right';ctx.fillText('RESONANCE',right,top);ctx.fillText('INK / PAPER',right,top+21*s);
 ctx.textAlign='left';ctx.fillText('FORM  /  FREQUENCY',left,bottom+20*s);
 ctx.textAlign='right';ctx.fillText('A LISTENING STUDY',right,bottom+20*s);
 ctx.strokeStyle='#7d7b6e';ctx.globalAlpha=.34;ctx.lineWidth=Math.max(.5,s*.65);
 ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle='#b51f18';ctx.fillRect(right-16*s,top+42*s,16*s,16*s);
 // A simple geometric seal, not invented calligraphy.
 ctx.strokeStyle='#f4efe3';ctx.lineWidth=Math.max(.5,s);ctx.strokeRect(right-12*s,top+46*s,8*s,8*s);
 return canvas;
}
