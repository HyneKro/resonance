// Continuous scene time, bounded musical events and eased signals. Playback can
// rest without resetting orbital phase; explicit freeze still holds everything.
const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
const TAU=Math.PI*2,hash=n=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
const smooth=(a,b,x)=>{const t=unit((x-a)/(b-a));return t*t*(3-2*t);};
const mix=(a,b,t)=>a.map((x,i)=>x+(b[i]-x)*t);
const vivid=c=>{const low=Math.min(...c)*.92,v=c.map(x=>Math.max(.002,x-low)),high=Math.max(...v);return v.map(x=>(x/high)**1.45);};
const hue=(c,a)=>{const s=Math.sin(a)/Math.sqrt(3),co=Math.cos(a),v=c.reduce((a,b)=>a+b,0)/3*(1-co);return c.map((x,i)=>Math.max(.008,x*co+(c[(i+2)%3]-c[(i+1)%3])*s+v));};

// Sun at the focus. Equal time steps sweep equal areas, so perihelion is fast
// and the distant turn is slow. Newton's solve stays bounded for our e <= .76.
export function keplerPoint(mean,a,e){
 const m=((mean+Math.PI)%TAU+TAU)%TAU-Math.PI;
 let eccentric=m;
 for(let i=0;i<7;i++)eccentric-=(eccentric-e*Math.sin(eccentric)-m)/(1-e*Math.cos(eccentric));
 return [a*(Math.cos(eccentric)-e),a*Math.sqrt(1-e*e)*Math.sin(eccentric)];
}
export class AstraMotion {
 constructor(){
  this.bands=new Float32Array(48*4);this.orbits=new Float32Array(48*4);
  this.events=new Float32Array(12*4);this.envelopes=new Float32Array(48);
  this.cometTrail=new Float32Array(6*16*4);this.state=new Float32Array(4);
  this.roles=new Float32Array(4);this.lights=new Float32Array(48);this.warm=new Float32Array(3);this.cool=new Float32Array(3);this.reset();
 }
 reset(){
  for(const array of [this.bands,this.orbits,this.events,this.envelopes,this.cometTrail,this.state,this.roles,this.lights])array.fill(0);
  this.warm.set([1,.24,.035]);this.cool.set([.08,.4,1]);this.colored=false;
  this.comets=[];this.clock=null;this.time=0;this.next=0;this.emitted=0;
  this.lastHit=-10;this.lastComet=-10;this.envelope=0;return this;
 }
 suspend(){this.clock=null;}
 update(clock,spectrum,{onset=0,drums=0,bass=0,lead=0,texture=0,energy=0,reduced=false,movement=1,active=true,palette,lights}={}){
  if(!Number.isFinite(clock))return this;
  energy=active?unit(energy):0;bass=energy>.015?unit(bass):0;
  const targets=[bass,drums,lead,texture].map(v=>active?unit(v):0);
  const level=unit(Math.max(onset,drums*.85)),motion=Number.isFinite(movement)?Math.max(0,Math.min(3.5,movement)):0;
  const entry=this.clock===null,dt=entry?0:clock-this.clock;this.clock=clock;
  if(dt<=0||dt>.25||reduced||motion<=0){
   // Prime on entry/discontinuity, never manufacture a catch-up eruption.
   if(entry||dt>.25){for(let i=0;i<48;i++)this.envelopes[i]=active?unit(spectrum?.[i]):0;this.envelope=level;}
   if(!this.colored)this.updateColors(palette,0,true);
   return this;
  }
  this.time+=dt;
  for(let i=0;i<4;i++)this.roles[i]+=(targets[i]-this.roles[i])*(1-Math.exp(-dt/(targets[i]>this.roles[i]?.14:.65)));
  this.updateColors(palette,dt);
  this.state[2]+=(bass-this.state[2])*(1-Math.exp(-dt/.12));
  this.state[3]+=(energy-this.state[3])*(1-Math.exp(-dt/.35));
  // Visible quiet drift; music adds velocity rather than multiplying position.
  this.state[0]+=dt*(.024+this.state[3]*.14)*motion;
  this.state[1]+=dt*(.09+this.state[3]*.55+this.state[2]*.65)*motion;
  for(let i=0;i<48;i++){
   const at=i*4,a=active?unit(spectrum?.[i]):0,previous=this.envelopes[i];
   this.bands[at]+=(a-this.bands[at])*(1-Math.exp(-dt/(a>this.bands[at] ? .08 : .50)));
   const light=active&&Number.isFinite(lights?.[i])?Math.max(0,Math.min(4,lights[i])):0;
   this.lights[i]+=(light-this.lights[i])*(1-Math.exp(-dt/(light>this.lights[i]?.10:.55)));
   const speed=energy>.015?unit(a*.85+level*.25):0;
   this.orbits[at+1]+=(speed-this.orbits[at+1])*(1-Math.exp(-dt/(speed>this.orbits[at+1] ? .18 : .55)));
   this.orbits[at]+=dt*this.orbits[at+1]*(.30+.8/(1+i*.10))*motion;
   if(energy>.015&&a>.12&&a-previous>.09&&(this.bands[at+2]===0||this.time-this.bands[at+1]>.30)){
    this.bands[at+1]=this.time;this.bands[at+2]=a;this.bands[at+3]=a-previous;
   }
   this.envelopes[i]=Math.max(a,previous*Math.exp(-dt/.16));
  }
  const elapsed=this.time-this.lastHit,attack=level>.24&&level-this.envelope>.10;
  // Sustained heavy bass feeds small eruptions too; high held notes do not.
  const rollingBass=this.state[2]>.42&&elapsed>.70-.44*this.state[2];
  if(energy>.015&&((attack&&elapsed>.18)||rollingBass)){
   const strength=unit(Math.max(level,this.state[2]*.85)),seed=(this.emitted*.61803398875)%1;
   this.events.set([this.time,strength,seed,0],this.next*4);
   this.next=(this.next+1)%12;this.emitted++;this.lastHit=this.time;
   if(this.time-this.lastComet>2.3){
    this.comets.push({birth:this.time,strength,seed});if(this.comets.length>6)this.comets.shift();this.lastComet=this.time;
   }
  }
  this.envelope=Math.max(level,this.envelope*Math.exp(-dt/.14));
  this.updateComets();return this;
 }
 updateColors(palette,dt,initial=false){
  if(!palette||palette.length!==18||!Array.from(palette).every(Number.isFinite))return;
  const a=Array.from(palette.slice(12,15)),b=Array.from(palette.slice(3,6)),r=this.roles;
  const warm=vivid(hue(vivid(mix(a,b,smooth(.12,.85,r[2]))),r[0]*1.25-r[2]*1.55+r[3]*.6));
  const cool=vivid(mix(vivid(b),hue(warm,1.35),.65)),blend=initial?1:1-Math.exp(-dt/1.25);
  for(let i=0;i<3;i++){this.warm[i]+=(warm[i]-this.warm[i])*blend;this.cool[i]+=(cool[i]-this.cool[i])*blend;}
  this.colored=true;
 }
 updateComets(){
  this.cometTrail.fill(0);
  for(let i=0;i<this.comets.length;i++){
   const {birth,strength,seed}=this.comets[i],age=this.time-birth;
   const a=1.75+seed*.65,e=.62+hash(seed+4)*.14,rate=Math.sqrt(5/(a*a*a)),period=TAU/rate;
   const fade=smooth(0,.45,age)*(1-smooth(period-.8,period,age));
   if(!fade)continue;
   const yaw=seed*TAU,pitch=.35+hash(seed+12)*1.15,roll=hash(seed+19)*TAU;
   for(let j=0;j<16;j++){
    const tail=j/15,t=age-tail*.9,[x,y]=keplerPoint(-Math.PI+t*rate,a,e);
    const px=x*Math.cos(yaw)-y*Math.sin(yaw),py=x*Math.sin(yaw)+y*Math.cos(yaw);
    const yz=py*Math.cos(pitch),z=py*Math.sin(pitch),r=Math.hypot(x,y);
    this.cometTrail.set([px*Math.cos(roll)-yz*Math.sin(roll),px*Math.sin(roll)+yz*Math.cos(roll)+.22,z,
     t<0?0:fade*strength*(.55+.65/(r*r))*Math.pow(1-tail,2)],(i*16+j)*4);
   }
  }
 }
}
