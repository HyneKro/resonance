// Persistent leaders steer a denser GPU school. Local separation, alignment and
// cohesion share a bounded grid; followers never add quadratic CPU work.
const STEP=1/30,GRID=16,CELL=.65;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const value=(n,d=0)=>Number.isFinite(n)?n:d;
export class FishSchool {
 constructor(count=384){
  this.count=clamp(Math.floor(count)||160,16,384);const n=this.count;
  this.state=new Float32Array(n*6);this.previous=new Float32Array(n*6);this.next=new Float32Array(n*6);
  this.texture=new Float32Array(n*8);this.heads=new Int16Array(GRID**3);this.links=new Int16Array(n);this.reset();
 }
 reset(){
  this.clock=null;this.carry=0;this.phase=0;this.steps=0;this.hit=0;this.attacks=0;this.armed=true;this.cooldown=0;this.hole=.65;this.bass=0;this.lead=0;
  let seed=8271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<this.count;i++){
   const a=random()*Math.PI*2,r=1.45+random()*.92,z=(random()-.5)*1.6-.6;
   this.state.set([Math.cos(a)*r*1.3,Math.sin(a)*r*.8+.2,z,-Math.sin(a)*.62,Math.cos(a)*.42,0],i*6);
  }
  this.previous.set(this.state);this.sample(0);
 }
 suspend(){this.clock=null;}
 update(clock,roles={},options={}){
  if(!Number.isFinite(clock))return this.texture;
  const elapsed=this.clock===null?0:clock-this.clock;this.clock=clock;
  if(options.reduced||!(elapsed>0&&elapsed<.25))return this.texture;
  const motion=clamp(value(options.movement,1),0,3.5),beat=clamp(value(options.beat,.55),0,2);
  const bass=clamp(value(roles.bass),0,1),lead=clamp(value(roles.lead),0,1),attack=clamp(Math.max(value(roles.onset),value(roles.drums)*.8),0,1);
  this.cooldown=Math.max(0,this.cooldown-elapsed);if(attack<.24)this.armed=true;
  if(this.armed&&attack>.5&&this.cooldown===0){this.hit=Math.min(1.8,attack*beat*1.5);this.attacks++;this.armed=false;this.cooldown=.22;}
  this.carry+=Math.min(.1,elapsed);
  while(this.carry+1e-9>=STEP){this.step(bass,lead,{...options,movement:motion});this.carry=Math.max(0,this.carry-STEP);}
  this.sample(this.carry/STEP);return this.texture;
 }
 cell(v){return clamp(Math.floor(v/CELL+GRID/2),0,GRID-1);}
 step(bass=0,lead=0,{movement=1,opening=.65,turbulence=1}={}){
  const s=this.state,n=this.count,heads=this.heads,links=this.links;heads.fill(-1);this.previous.set(s);this.steps++;
  this.phase+=STEP*movement;this.hit*=Math.exp(-STEP*2.5);
  this.bass+=(bass-this.bass)*.14;this.lead+=(lead-this.lead)*.10;
  this.hole+=(clamp(value(opening,.65),0,1)-this.hole)*.06;
  const music=this.bass*movement,melody=this.lead*movement,t=this.phase;
  const wide=1.30+Math.sin(t*.17)*.12+music*.12,high=.80+Math.sin(t*.13)*.10;
  for(let i=0;i<n;i++){const at=i*6,key=this.cell(s[at])+GRID*(this.cell(s[at+1])+GRID*this.cell(s[at+2]));links[i]=heads[key];heads[key]=i;}
  for(let i=0;i<n;i++){
   const at=i*6,x=s[at],y=s[at+1],z=s[at+2],vx=s[at+3],vy=s[at+4],vz=s[at+5];
   let sx=0,sy=0,sz=0,ax=0,ay=0,az=0,cx=0,cy=0,cz=0,near=0;
   const gx=this.cell(x),gy=this.cell(y),gz=this.cell(z);
   for(let zz=Math.max(0,gz-1);zz<=Math.min(GRID-1,gz+1);zz++)for(let yy=Math.max(0,gy-1);yy<=Math.min(GRID-1,gy+1);yy++)for(let xx=Math.max(0,gx-1);xx<=Math.min(GRID-1,gx+1);xx++){
    for(let j=heads[xx+GRID*(yy+GRID*zz)];j>=0;j=links[j]){
     if(j===i)continue;const b=j*6,dx=x-s[b],dy=y-s[b+1],dz=z-s[b+2],d2=dx*dx+dy*dy+dz*dz;
     if(d2>.40)continue;near++;cx+=s[b];cy+=s[b+1];cz+=s[b+2];ax+=s[b+3];ay+=s[b+4];az+=s[b+5];
     if(d2<.055){const repel=.028/Math.max(.001,d2);sx+=dx*repel;sy+=dy*repel;sz+=dz*repel;}
    }
   }
   const xx=x/wide,yy=(y-.2)/high,r=Math.max(.08,Math.hypot(xx,yy)),angle=Math.atan2(yy,xx);
   // Turning waves and local flee pockets deform the school without teleports.
   const radius=.85+this.hole*1.13+music*.14+.16*Math.sin(angle*3-t*.38),pull=(r-radius)*.92;
   const wave=Math.sin(angle*2+t*.5),depth=-.7+wave*(.36+melody*.20);
   const flee=this.hit*Math.max(0,Math.cos(angle-t*.45))**4*2.4;
   let fx=-yy*.39-xx*pull+sx+xx/r*flee,fy=xx*.31-yy*pull+sy+yy/r*flee,fz=(depth-z)*.65+sz;
   const noise=clamp(value(turbulence,1),0,2)*(.09+melody*.10);
   fx+=Math.sin(y*2.8+z*1.5+t*.9)*noise;fy+=Math.cos(z*2.5-x*1.2+t*.7)*noise;fz+=Math.sin(x*2.4+y*1.6-t*.6)*noise;
   if(near){fx+=(ax/near-vx)*.85+(cx/near-x)*.15;fy+=(ay/near-vy)*.85+(cy/near-y)*.15;fz+=(az/near-vz)*.85+(cz/near-z)*.15;}
   const accel=Math.max(1,Math.hypot(fx,fy,fz)/2.2),dt=STEP*movement;
   let nx=vx+fx/accel*dt,ny=vy+fy/accel*dt,nz=vz+fz/accel*dt;
   const speed=Math.hypot(nx,ny,nz)||1,target=clamp(speed,.34,.67+music*.30+this.hit*.35),ratio=target/speed;nx*=ratio;ny*=ratio;nz*=ratio;
   this.next[at]=clamp(x+nx*dt,-4.5,4.5);this.next[at+1]=clamp(y+ny*dt,-3,3.5);this.next[at+2]=clamp(z+nz*dt,-3,2.4);
   this.next[at+3]=nx;this.next[at+4]=ny;this.next[at+5]=nz;
  }
  this.state=this.next;this.next=s;
 }
 sample(t){
  const n=this.count;for(let i=0;i<n;i++)for(let k=0;k<3;k++){
   this.texture[i*4+k]=this.previous[i*6+k]+(this.state[i*6+k]-this.previous[i*6+k])*t;
   this.texture[n*4+i*4+k]=this.previous[i*6+3+k]+(this.state[i*6+3+k]-this.previous[i*6+3+k])*t;
  }
  return this.texture;
 }
}
