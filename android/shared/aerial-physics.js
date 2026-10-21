// Fixed-step studio. Four liquid lobes share a surface; remaining bodies exchange
// mass-weighted impulses. The GPU adds small, bounded satellite beads.
const STEP=1/120,FLOOR=-1.8;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number.isFinite(Number(x))?Number(x):0));
export class AerialPhysics{
 constructor(count=24){
  this.count=Math.round(clamp(count,8,24));this.positions=new Float32Array(96);this.previous=new Float32Array(96);this.rendered=new Float32Array(96);
  this.velocities=new Float64Array(this.count*3);this.anchors=new Float64Array(this.count*3);this.reset();
 }
 reset(){
  this.clock=null;this.accumulator=0;this.time=0;this.steps=0;this.bass=0;this.drums=0;this.lead=0;this.hit=0;this.hits=0;this.cooldown=0;this.armed=true;this.movement=1;this.liquid=.8;
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
  this.hit=Math.max(strike,this.hit*Math.exp(-STEP*7));
  const p=this.positions,v=this.velocities,m=this.movement,t=this.time;
  for(let i=0;i<this.count;i++){
   const j=i*4,k=i*3,r=p[j+3],liquid=i<4&&this.liquid>.03,mobility=.55+.19/(r+.1),phase=t*(.35+i*.014)+i*2.4;
   for(let a=0;a<3;a++){
    let target=this.anchors[k+a];
    if(liquid){
     // Gathering/separation plus bass expansion changes surface topology.
     const spread=.58+.55*Math.sin(t*.72)**2+this.bass*.6;
     target=(a===0?.4:a===1?.25:0)+(target-(a===0?.4:a===1?.25:0))*spread;
     target+=Math.sin(phase+a*1.8)*(.12+this.lead*.32)*m;
    }else target+=a===1?-.3+Math.sin(phase*.8)*(.18+this.lead*.2)+this.bass*.7:Math.sin(phase+a*2)*(.12+this.lead*.25)*m;
    let force=(target-p[j+a])*(liquid?4.4:2.1)*mobility;
    if(a===1&&!liquid)force-=.48;
    if(strike)v[k+a]+=strike*this.beat*(liquid?.7:1.65)*mobility*(a===1?1.0:Math.sin(i*1.71+a)*.65);
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
