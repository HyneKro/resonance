// Fixed-step studio. Four liquid lobes share a surface; remaining bodies exchange
// mass-weighted impulses. The GPU adds small, bounded satellite beads.
import {FluxMotion} from './spectrum-history.js';
import {Inertia} from './inertia.js';
const STEP=1/120,FLOOR=-1.8;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):0));
// Music changes the targets of the sculpture, never its lifetime. Burst slots
// expire invisibly before reuse; their origins stay in world space as bodies move.
export class AerialMotion extends FluxMotion{
 constructor(){
  super();this.simulationClock=0;this.energy=0;this.hit=0;this.pulse=0;this.hitMotion=new Inertia(0,.32);this.cooldown=0;this.armed=true;
  this.detail=new Float32Array(96);this.detailMotion=Array.from({length:96},(_,i)=>new Inertia(0,[.38,.65,.30,.55][i%4]));
  this.tone=new Float32Array([.45,0,0,0]);this.toneMotion=Array.from(this.tone,(x,i)=>new Inertia(x,i===0?1.4:.65));this.previousSpectrum=new Float32Array(48);
  this.bursts=new Float32Array(48);this.powers=new Float32Array(12);this.emitted=0;for(let i=0;i<12;i++)this.bursts[i*4+3]=-1;
 }
 update(clock,options={}){
  super.update(clock,options);if(!this.dt)return this;
  const dt=this.dt,active=options.active!==false;
  this.energy+=(clamp(active?options.energy:0,0,1)-this.energy)*(1-Math.exp(-dt/(active?.18:.9)));
  this.simulationClock+=dt*(.12+this.activity*.88);this.pulse*=Math.exp(-dt*5.5);this.cooldown=Math.max(0,this.cooldown-dt);
  const level=(array,k)=>active?clamp(array?.[Math.max(0,Math.min(47,k))],0,1):0;
  let weight=0,centroid=0,flux=0,harmonic=0,percussive=0;
  for(let i=0;i<48;i++){const s=level(options.spectrum,i),w=s*s;weight+=w;centroid+=w*i/47;flux+=Math.abs(s-this.previousSpectrum[i]);this.previousSpectrum[i]=s;harmonic+=level(options.harmonic??options.spectrum,i);percussive+=level(options.percussive,i);}
  for(let i=0;i<24;i++){
   const k=i*2,j=i*4,sample=array=>(level(array,k-1)+level(array,k)*2+level(array,k+1)*2+level(array,k+2))/6;
   const s=sample(options.spectrum),h=sample(options.harmonic??options.spectrum),p=sample(options.percussive);
   const targets=[1-Math.exp(-s*2.7),1-Math.exp(-h*2.2),1-Math.exp(-p*3.2),clamp(sample(options.lights)*.75+flux*.12,0,1)];
   for(let a=0;a<4;a++)this.detail[j+a]=clamp(this.detailMotion[j+a].update(targets[a],dt),0,1);
  }
  const tones=[weight>.0001?centroid/weight:this.tone[0],harmonic/(harmonic+percussive+.01),clamp(flux*.32,0,1),this.energy];
  for(let i=0;i<4;i++)this.tone[i]=clamp(this.toneMotion[i].update(tones[i],dt),0,1);
  for(let i=0;i<12;i++){const k=i*4+3;if(this.bursts[k]>=0){this.bursts[k]+=dt;if(this.bursts[k]>4.5)this.bursts[k]=-1;}}
  const attack=active?Math.max(clamp(options.onset,0,1),clamp(options.roles?.drums,0,1)):0;
  if(attack<.22)this.armed=true;
  const strike=this.armed&&attack>.5&&this.cooldown===0;
  // A continuous bass passage can also release a slow stream, without claiming
  // every frame is a new percussion hit.
  if(options.spheres&&(strike||(active&&this.roles[0]>.62&&this.cooldown===0))){
   const slots=options.mobile?8:12;let index=-1;
   for(let i=0;i<slots;i++){const slot=(this.emitted+i)%slots;if(this.bursts[slot*4+3]<0){index=slot;break;}}
   if(index>=0){
    const k=index*4,source=(this.emitted*5+3)%Math.min(12,options.count||24),s=options.spheres,j=source*4;
    this.bursts.set([s[j],s[j+1]+s[j+3]*.6,s[j+2],0],k);this.powers[index]=clamp(.25+attack*.4+this.energy*.45,0,1);
    this.emitted++;this.cooldown=strike?.24:.85;
   }
  }
  // An attack injects energy into a continuous spring, never directly into a
  // rendered position/radius/light. A full particle pool must not suppress it.
  if(strike){this.pulse=Math.max(this.pulse,attack);this.armed=false;}
  this.hit=clamp(this.hitMotion.update(this.pulse,dt),0,1);
  return this;
 }
}
export class AerialPhysics{
 constructor(count=24){
  this.count=Math.round(clamp(count,8,24));this.positions=new Float32Array(96);this.previous=new Float32Array(96);this.rendered=new Float32Array(96);
  this.velocities=new Float64Array(this.count*3);this.anchors=new Float64Array(this.count*3);this.reset();
 }
 reset(){
  this.clock=null;this.accumulator=0;this.time=0;this.steps=0;this.bass=0;this.drums=0;this.lead=0;this.hit=0;this.hits=0;this.cooldown=0;this.armed=true;this.movement=1;this.liquid=.8;this.continuous=false;this.detail=null;
  this.positions.fill(0);this.velocities.fill(0);
  const composition=[[.4,.2,0,.68],[.83,.84,-.12,.45],[.86,-.4,.16,.42],[-.13,.44,-.1,.34],[-1.02,-.45,.4,.65],[-1.52,.67,-.23,.39],[1.72,.36,.52,.42],[-.12,-1.18,.84,.32],[1.53,-1.15,-.35,.28],[-.65,1.16,-.57,.22],[1.25,1.35,-.7,.20],[-2.13,-.93,-.4,.24]];
  for(let i=0;i<this.count;i++){
   const t=i*2.39996,r=1.85+(i%3)*.13,p=composition[i]||[Math.cos(t)*r,Math.sin(t)*1.35,Math.sin(t*1.71)*.85-.4,.075+(i%4)*.028];
   this.positions.set(p,i*4);this.anchors.set(p.slice(0,3),i*3);
  }this.previous.set(this.positions);this.rendered.set(this.positions);
 }
 suspend(){this.clock=null;this.accumulator=0;this.previous.set(this.positions);this.rendered.set(this.positions);}
 update(clock,roles={},options={}){
  if(!Number.isFinite(clock))return this.rendered;
  if(this.clock===null){this.clock=clock;return this.rendered;}
  const delta=clock-this.clock;this.clock=clock;
  if(delta<0||delta>.25){this.suspend();this.clock=clock;return this.rendered;}
  if(delta===0||options.reduced)return this.rendered;
  this.liquid=clamp(options.liquid??.8,0,1);
  this.continuous=options.continuous===true;this.detail=options.detail;
  this.movement=clamp(options.movement??1,.25,3.5);this.beat=clamp(options.beat??.55,0,2);
  this.accumulator+=delta;
  while(this.accumulator+1e-10>=STEP){this.previous.set(this.positions);this.step(roles);this.accumulator-=STEP;}
  const alpha=Math.max(0,this.accumulator/STEP);
  for(let i=0;i<this.count*4;i++)this.rendered[i]=this.previous[i]+(this.positions[i]-this.previous[i])*alpha;
  return this.rendered;
 }
 step(roles){
  this.time+=STEP;this.steps++;this.cooldown=Math.max(0,this.cooldown-STEP);
  const bass=clamp(roles.bass,0,1),drums=clamp(roles.drums,0,1),lead=clamp(roles.lead,0,1),onset=clamp(roles.onset,0,1),attack=Math.max(drums,onset);
  if(attack<.24)this.armed=true;
  const strike=this.armed&&this.cooldown===0&&attack>.48?attack:0;
  if(strike){this.armed=false;this.cooldown=.16;this.hits++;}
  this.bass+=(bass-this.bass)*.065;this.drums+=(drums-this.drums)*.18;this.lead+=(lead-this.lead)*.04;
  this.hit=this.continuous?onset:Math.max(strike,this.hit*Math.exp(-STEP*7));
  const p=this.positions,v=this.velocities,m=this.movement,t=this.time;
  for(let i=0;i<this.count;i++){
   const j=i*4,k=i*3,r=p[j+3],liquid=i<4&&this.liquid>.03,mobility=.55+.19/(r+.1),phase=t*(.35+i*.014)+i*2.4,band=this.detail?.[j]||0,harmonic=this.detail?.[j+1]||0,percussion=this.detail?.[j+2]||0;
   for(let a=0;a<3;a++){
    let target=this.anchors[k+a];
    if(liquid){
     // Gathering/separation plus bass expansion changes surface topology.
     const spread=.58+.55*Math.sin(t*.72)**2+this.bass*.6;
     target=(a===0?.4:a===1?.25:0)+(target-(a===0?.4:a===1?.25:0))*spread;
     target+=Math.sin(phase+a*1.8)*(.12+this.lead*.32)*m;
    }else target+=a===1?-.3+Math.sin(phase*.8)*(.18+this.lead*.2)+this.bass*.7:Math.sin(phase+a*2)*(.12+this.lead*.25)*m;
    target+=Math.sin(phase*(a===1?1.3:.8)+a*2.1)*(band*.20+harmonic*.24)*m;
    let force=(target-p[j+a])*(liquid?4.4:2.1)*mobility;
    if(a===1&&!liquid)force-=.48;
    if(this.continuous)force+=(this.hit*2.5+percussion*1.8)*this.beat*mobility*Math.sin(i*1.71+a+phase*.25);
    else if(strike)v[k+a]+=strike*this.beat*(liquid?.7:1.65)*mobility*(a===1?1.0:Math.sin(i*1.71+a)*.65);
    v[k+a]=clamp((v[k+a]+force*STEP*m)*Math.exp(-STEP*(liquid?1.55:.72)),-4.5,4.5);p[j+a]+=v[k+a]*STEP;
   }
  }
  for(let pass=0;pass<4;pass++)for(let i=0;i<this.count;i++)for(let j=i+1;j<this.count;j++){
   if(this.liquid>.03&&i<4&&j<4)continue;
   const a=i*4,b=j*4,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],dist=Math.hypot(dx,dy,dz),limit=p[a+3]+p[b+3]+.012;
   if(dist>=limit)continue;
   const nx=dist>1e-6?dx/dist:1,ny=dist>1e-6?dy/dist:0,nz=dist>1e-6?dz/dist:0;
   const ma=1/(p[a+3]**3+.015),mb=1/(p[b+3]**3+.015),wa=ma/(ma+mb),wb=1-wa,correction=limit-dist;
   const approach=(v[j*3]-v[i*3])*nx+(v[j*3+1]-v[i*3+1])*ny+(v[j*3+2]-v[i*3+2])*nz;
   for(let k=0;k<3;k++){const n=k===0?nx:k===1?ny:nz;p[a+k]-=n*correction*wa;p[b+k]+=n*correction*wb;if(approach<0){v[i*3+k]+=n*approach*1.62*wa;v[j*3+k]-=n*approach*1.62*wb;}}
  }
  for(let i=0;i<this.count;i++){
   const j=i*4,k=i*3,r=p[j+3];
   for(let a=0;a<3;a++){
    const lo=a===1?FLOOR+r+(i<4?.1:0):a===2?-1.6+r:-3+r,hi=a===1?2.25-r:a===2?1.6-r:3-r;
    if(p[j+a]<lo){p[j+a]=lo;v[k+a]=Math.abs(v[k+a])*.72;}
    if(p[j+a]>hi){p[j+a]=hi;v[k+a]=-Math.abs(v[k+a])*.64;}
    v[k+a]=clamp(v[k+a],-4.5,4.5);
   }
  }
 }
}
