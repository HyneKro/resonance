// A small persistent world: fixed-step, mass-aware contacts, no per-frame allocations.
const STEP=1/60,FLOOR=-1.8;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,Number(x)||0));
export class AerialPhysics{
 constructor(count=24){
  this.count=Math.round(clamp(count,8,24));this.positions=new Float32Array(24*4);
  this.previous=new Float32Array(24*4);this.rendered=new Float32Array(24*4);
  this.velocities=new Float64Array(this.count*3);this.anchors=new Float64Array(this.count*3);
  this.clock=null;this.accumulator=0;this.time=0;this.steps=0;this.bass=0;this.drums=0;this.lead=0;
  const composition=[[.5,.12,0,1.03],[-1.02,.73,.28,.48],[-1.43,-.38,.5,.39],[-.57,-.91,.8,.33],[1.75,.95,-.62,.26],[1.61,-.88,.35,.21],[-2.12,.22,-.4,.17],[.14,1.39,-.4,.13]];
  for(let i=0;i<this.count;i++){
   const t=i*2.39996,r=1.7+(i%4)*.23;
   const p=composition[i]||[Math.cos(t)*r,Math.sin(t)*1.18,Math.sin(t*1.71)*.85-.65,.055+(i%5)*.022];
   this.positions.set(p,i*4);this.anchors.set(p.slice(0,3),i*3);
  }
  this.previous.set(this.positions);this.rendered.set(this.positions);
 }
 suspend(){this.clock=null;this.accumulator=0;this.previous.set(this.positions);this.rendered.set(this.positions);}
 update(clock,roles={}){
  if(!Number.isFinite(clock))return this.rendered;
  if(this.clock===null){this.clock=clock;return this.rendered;}
  const delta=clock-this.clock;this.clock=clock;
  // Never fast-forward a hidden, switched-away or suspended world.
  if(delta<0||delta>.25){this.suspend();this.clock=clock;return this.rendered;}
  if(delta===0)return this.rendered;
  this.accumulator+=delta;
  while(this.accumulator+1e-10>=STEP){this.previous.set(this.positions);this.step(roles);this.accumulator-=STEP;}
  const alpha=Math.max(0,this.accumulator/STEP);
  for(let i=0;i<this.count*4;i++)this.rendered[i]=this.previous[i]+(this.positions[i]-this.previous[i])*alpha;
  return this.rendered;
 }
 step(roles){
  this.time+=STEP;this.steps++;
  const bass=clamp(roles.bass,0,1),drums=clamp(roles.drums,0,1),lead=clamp(roles.lead,0,1);
  const hit=Math.max(0,drums-this.drums);
  this.bass+=(bass-this.bass)*.07;this.drums+=(drums-this.drums)*.22;this.lead+=(lead-this.lead)*.045;
  // Long breathing phases alternate light buoyancy with a heavier settling motion.
  const weight=.5+.5*Math.sin(this.time*.11-.9),p=this.positions,v=this.velocities;
  for(let i=0;i<this.count;i++){
   const j=i*4,k=i*3,r=p[j+3],mobility=.4+.18/(r+.15),phase=this.time*(.17+i*.003)+i*2.4;
   for(let a=0;a<3;a++){
    const target=this.anchors[k+a]+(a===0?Math.sin(phase)*(.12+this.lead*.2):a===1?Math.cos(phase*.7)*.12-weight*.92+this.bass*.52:Math.sin(phase*.63)*.18);
    let force=(target-p[j+a])*.65*mobility;
    if(a===1)v[k+a]+=hit*.2*mobility*Math.sin(i*1.3+1.2);
    if(a===0)force+=this.lead*Math.cos(phase*.9)*.06;
    v[k+a]=(v[k+a]+force*STEP)*Math.exp(-STEP*.7);p[j+a]+=v[k+a]*STEP;
   }
  }
  // Resolve overlap and transfer only approaching velocity. Heavy spheres retain inertia.
  for(let pass=0;pass<3;pass++)for(let i=0;i<this.count;i++)for(let j=i+1;j<this.count;j++){
   const a=i*4,b=j*4,dx=p[b]-p[a],dy=p[b+1]-p[a+1],dz=p[b+2]-p[a+2],dist=Math.hypot(dx,dy,dz),limit=p[a+3]+p[b+3]+.015;
   if(dist>=limit)continue;
   const nx=dist>1e-6?dx/dist:1,ny=dist>1e-6?dy/dist:0,nz=dist>1e-6?dz/dist:0;
   const ma=1/(p[a+3]**3+.02),mb=1/(p[b+3]**3+.02),wa=ma/(ma+mb),wb=1-wa,correction=limit-dist;
   const approach=(v[j*3]-v[i*3])*nx+(v[j*3+1]-v[i*3+1])*ny+(v[j*3+2]-v[i*3+2])*nz;
   for(let k=0;k<3;k++){const normal=k===0?nx:k===1?ny:nz;p[a+k]-=normal*correction*wa;p[b+k]+=normal*correction*wb;if(approach<0){v[i*3+k]+=normal*approach*1.48*wa;v[j*3+k]-=normal*approach*1.48*wb;}}
  }
  for(let i=0;i<this.count;i++){
   const j=i*4,k=i*3,r=p[j+3];
   for(let a=0;a<3;a++){
    const lo=a===1?FLOOR+r:a===2?-1.6+r:-3+r,hi=a===1?1.9-r:a===2?1.6-r:3-r;
    if(p[j+a]<lo){p[j+a]=lo;v[k+a]=Math.abs(v[k+a])*.55;}
    if(p[j+a]>hi){p[j+a]=hi;v[k+a]=-Math.abs(v[k+a])*.55;}
   }
  }
 }
}
