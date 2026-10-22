// Junctions drift through a folded three-dimensional volume. Nearby connections
// are rebuilt at a bounded cadence and crossfade instead of snapping on/off.
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number(x)||0));
const noise=n=>{const x=Math.sin(n*127.1)*43758.5453;return x-Math.floor(x);};
export async function createSynapseNetwork(count=1700,yieldWork=async()=>{}){
 const network=new SynapseNetwork(count);
 for(let i=0;i<network.count;i+=128){network.place(i,Math.min(network.count,i+128),0,0);await yieldWork();}
 network.reconnect(true);await yieldWork();return network;
}

export class SynapseNetwork{
 constructor(count=1700){
  this.count=Math.max(128,Math.min(2048,Math.floor(count)||1700));this.capacity=this.count*5;
  this.nodes=new Float32Array(this.count*8);this.seeds=new Float32Array(this.count*4);
  this.edgeRows=Math.ceil(this.capacity/1024);this.edges=new Float32Array(this.edgeRows*4096);
  this.links=new Map();this.free=Array.from({length:this.capacity},(_,i)=>this.capacity-i-1);
  this.facetCapacity=this.count*2;this.facetRows=Math.ceil(this.facetCapacity/1024);this.facets=new Float32Array(this.facetRows*4096);
  this.faces=new Map();this.faceFree=Array.from({length:this.facetCapacity},(_,i)=>this.facetCapacity-i-1);this.facetCount=0;
  this.edgeCount=0;this.rewireAt=0;this.rewires=0;this.version=0;this.steps=0;
  for(let i=0;i<this.count;i++)this.seeds.set([noise(i+19),noise(i+723),noise(i+1731),noise(i+4391)],i*4);
 }
 place(from,to,phase,drive,dt=0,roles=[0,0,0,0],spectrum=[],detail=[],force=1,beat=0,tension=0){
  const n=this.count,p=this.nodes,s=this.seeds;
  for(let i=from;i<to;i++){
   const k=i*4,t=s[k],v=s[k+1]*2-1,depth=s[k+2]*2-1;
   const lane=Math.floor(s[k+3]*47),band=clamp(detail[lane*4]??spectrum[lane]),harmonic=clamp(detail[lane*4+1]),percussive=clamp(detail[lane*4+2]),flux=clamp(detail[lane*4+3]);
   const bass=roles[0],lead=roles[2],texture=roles[3],swell=(bass*.60+beat*.65)*force;
   // A spacious folded field, rather than a narrow branching tube. Independent
   // drift moves neighbours through each other without pinning a rigid lattice.
   let x=(t-.5)*10.6+Math.sin(v*4+phase*.31+s[k+3]*3)*(.16+drive*.70+harmonic*.23);
   let y=v*1.75+(t-.5)*1.9+Math.sin(t*6.1+phase*.16)*(.45+drive*.58);
   let z=depth*2.55+Math.sin(t*5.6+v*2.1-phase*.13)*(.44+drive*.62);
   y+=Math.sin(t*15+depth*3+phase*.58)*(.12+drive*.52)+band*Math.sin(v*3+phase*.9)*.70*force;
   y+=Math.sin(t*7.4+phase*.65)*swell+Math.cos(depth*2.2-phase*.7)*harmonic*lead*.45*force;
   z+=Math.cos(v*4.2+t*9-phase*.48)*(.12+drive*.62)+band*Math.cos(t*8-phase*.8)*.68*force;
   z+=Math.cos(t*9.2-phase*.72)*swell+Math.sin(v*6+phase*1.4)*(percussive*.30+flux*.55)*force;
   const angle=Math.sin(t*4+phase*.12)*(.12+lead*.40+texture*.30+tension*.15),c=Math.cos(angle),sn=Math.sin(angle);
   [y,z]=[y*c-z*sn,z*c+y*sn];
   if(!dt){p.set([x,y,z,s[k+3]],k);continue;}
   const velocity=n*4+k,omega=5.5+drive*2.5,decay=Math.exp(-omega*dt);
   // Exact damped spring integration keeps strong attacks smooth on slow frames.
   for(let j=0;j<3;j++){
    const target=j===0?x:j===1?y:z,error=p[k+j]-target,travel=p[velocity+j]+omega*error;
    p[k+j]=target+(error+travel*dt)*decay;p[velocity+j]=(p[velocity+j]-omega*travel*dt)*decay;
   }
   p[velocity+3]=band;
  }
 }
 reconnect(initial=false){
  const p=this.nodes,n=this.count,cell=1.65,grid=new Map(),key=(x,y,z)=>`${x},${y},${z}`;
  for(let i=0;i<n;i++){
   const k=i*4,id=key(Math.floor(p[k]/cell),Math.floor(p[k+1]/cell),Math.floor(p[k+2]/cell));
   if(!grid.has(id))grid.set(id,[]);grid.get(id).push(i);
  }
  for(const link of this.links.values())link.wanted=false;
  for(const face of this.faces.values())face.wanted=false;
  for(let i=0;i<n;i++){
   const k=i*4,gx=Math.floor(p[k]/cell),gy=Math.floor(p[k+1]/cell),gz=Math.floor(p[k+2]/cell);
   const nearest=[-1,-1,-1],distances=[Infinity,Infinity,Infinity];
   for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
    for(const j of grid.get(key(gx+dx,gy+dy,gz+dz))||[]){
     if(j===i)continue;const at=j*4,d=(p[k]-p[at])**2+(p[k+1]-p[at+1])**2+(p[k+2]-p[at+2])**2;
     if(d>1.65**2||d>=distances[2])continue;
     let slot=2;while(slot>0&&d<distances[slot-1]){distances[slot]=distances[slot-1];nearest[slot]=nearest[slot-1];slot--;}
     distances[slot]=d;nearest[slot]=j;
    }
   }
   for(const j of nearest){
    if(j<0)continue;const a=Math.min(i,j),b=Math.max(i,j),id=a*n+b;
    let link=this.links.get(id);
    if(!link&&this.free.length){
     const slot=this.free.pop();link={slot,wanted:true};this.links.set(id,link);
     this.edges.set([a,b,initial?1:0,noise(id+71)],slot*4);this.edgeCount=Math.max(this.edgeCount,slot+1);
    }
    if(link)link.wanted=true;
   }
   // Sparse triangles use the very same nearest neighbours and fade with the
   // changing graph. Their slot pool is bounded independently of the links.
   if(i%3===0&&nearest[1]>=0){
    const ids=[i,nearest[0],nearest[1]].sort((a,b)=>a-b),[a,b,c]=ids;
    const bc=Math.hypot(p[b*4]-p[c*4],p[b*4+1]-p[c*4+1],p[b*4+2]-p[c*4+2]);
    if(bc<1.5){
     const id=a*n*n+b*n+c;let face=this.faces.get(id);
     if(!face&&this.faceFree.length){const slot=this.faceFree.pop();face={slot,wanted:true};this.faces.set(id,face);this.facets.set([a,b,c,initial?1:0],slot*4);this.facetCount=Math.max(this.facetCount,slot+1);}
     if(face)face.wanted=true;
    }
   }
  }
  this.rewires++;
 }
 update(signals,{movement=1,beat=.55,turbulence=1}={}){
  const dt=signals.dt;if(!dt)return this;
  if(movement>0)this.place(0,this.count,signals.phase*clamp(movement,0,2),signals.activity*(1+signals.phrase*.15),dt,signals.roles,signals.spectrum,signals.detail,clamp(turbulence,.25,2),signals.beat*clamp(beat,0,2),signals.tension);
  this.rewireAt+=dt;if(this.rewireAt>=(this.count>1000?.14:.18)){this.rewireAt%=this.count>1000?.14:.18;this.reconnect();}
  for(const [id,link]of this.links){
   const k=link.slot*4,target=link.wanted?1:0;
   this.edges[k+2]+=(target-this.edges[k+2])*(1-Math.exp(-dt/(target?.22:.17)));
   if(!link.wanted&&this.edges[k+2]<.012){this.edges.fill(0,k,k+4);this.links.delete(id);this.free.push(link.slot);}
  }
  for(const [id,face]of this.faces){
   const k=face.slot*4+3,target=face.wanted?1:0;
   this.facets[k]+=(target-this.facets[k])*(1-Math.exp(-dt/(target?.40:.28)));
   if(!face.wanted&&this.facets[k]<.009){this.facets.fill(0,k-3,k+1);this.faces.delete(id);this.faceFree.push(face.slot);}
  }
  this.steps++;this.version++;return this;
 }
}

export class SynapseSignals{
 constructor(){this.events=new Float32Array(32);this.origins=new Float32Array(32);this.roles=new Float32Array(4);this.spectrum=new Float32Array(48);this.detail=new Float32Array(48*4);this.previous=new Float32Array(48);this.accents=new Float32Array(3);this.palette=new Float32Array(18);this.reset();}
 reset(){this.time=0;this.phase=0;this.clock=null;this.dt=0;this.activity=0;this.energy=0;this.shimmer=0;this.flux=0;this.centroid=.5;this.tension=0;this.beat=0;this.phrase=0;this.initialized=false;this.clearEvents();this.roles.fill(0);this.spectrum.fill(0);this.detail.fill(0);this.previous.fill(0);this.accents.fill(0);}
 clearEvents(){this.envelope=0;this.laneEnvelopes=[0,0,0];this.next=0;this.emitted=0;this.lastHit=-10;this.events.fill(0);this.origins.fill(0);}
 beginTrack(){
  // Keep in-flight light and pressure waves continuous through a song change.
  this.envelope=0;this.laneEnvelopes=[0,0,0];this.emitted=0;this.lastHit=this.time;
 }
 suspend(){this.clock=null;this.dt=0;}
 update(clock,{onset=0,drums=0,bass=0,lead=0,texture=0,shimmer=0,energy=0,reduced=false,hold=false,active=true,palette,lights,spectrum,harmonic,percussive,accents,hits,rhythm,direction,nodes,count=0}={}){
  this.dt=0;if(!Number.isFinite(clock))return this;
  const level=active?clamp(Math.max(Number(onset)||0,(Number(drums)||0)*.85)):0;
  if(!this.initialized){if(palette?.length===18)this.palette.set(palette);else this.palette.set([.12,.48,.62,.13,.65,.8,.3,.42,.85,.7,.22,.48,1,.35,.18,.8,.5,.22]);this.initialized=true;}
  if(this.clock===null){this.clock=clock;this.envelope=level;return this;}
  const dt=clock-this.clock;this.clock=clock;
  if(reduced||hold||dt<=0||dt>.25){if(dt<0||dt>.25)this.envelope=level;return this;}
  this.dt=dt;this.time+=dt;
  const mix=(a,b,t)=>a+(b-a)*(1-Math.exp(-dt/t));
  const incoming=[bass,drums,lead,texture];for(let i=0;i<4;i++)this.roles[i]=mix(this.roles[i],active?clamp(incoming[i]):0,active?.065:.8);
  this.energy=mix(this.energy,active?clamp(energy):0,.24);this.shimmer=mix(this.shimmer,active?clamp(shimmer):0,.10);
  this.activity=mix(this.activity,active?clamp(Math.max(energy,bass*.9,lead*.7)):0,.4);
  let sum=0,weighted=0,fluxSum=0,harmonicSum=0;
  for(let i=0;i<48;i++){
   const raw=active?clamp(spectrum?.[i]??lights?.[i]):0,k=i*4;
   const h=active?clamp(harmonic?.[i]??raw*.65):0,p=active?clamp(percussive?.[i]??raw*.35):0;
   const rise=active?clamp((raw-this.previous[i])*3.5):0;this.previous[i]=raw;
   const values=[raw,h,p,rise];for(let j=0;j<4;j++)this.detail[k+j]=mix(this.detail[k+j],values[j],active?(j===3?.07:.045):.55);
   this.spectrum[i]=mix(this.spectrum[i],active?clamp(lights?.[i]):0,.065);
   sum+=raw;weighted+=raw*i/47;fluxSum+=rise;harmonicSum+=h;
  }
  this.flux=mix(this.flux,clamp(fluxSum/48*2.5),.09);
  this.centroid=mix(this.centroid,sum>.01?weighted/sum:.5,.4);
  this.tension=mix(this.tension,active?clamp(harmonicSum/48*.75+lead*.45+texture*.35):0,.45);
  const trusted=rhythm?.confidence>.5?clamp(rhythm.pulse)*clamp((rhythm.confidence-.5)*2):0;
  let lane=-1,strongest=0;
  for(let i=0;i<3;i++){
   const hit=active?clamp(Math.max(accents?.[i]||0,hits?.[i]||0)):0;
   this.accents[i]=mix(this.accents[i],hit,hit>this.accents[i]?.018:.24);
   const rise=hit-this.laneEnvelopes[i];if(rise>strongest){strongest=rise;lane=i;}
   this.laneEnvelopes[i]=hit>this.laneEnvelopes[i]?hit:mix(this.laneEnvelopes[i],hit,.10);
  }
  this.beat=mix(this.beat,active?Math.max(trusted,this.accents[0]):0,.065);
  this.phrase=mix(this.phrase,active?clamp((direction?.energy||0)*(direction?.mix||0)):0,.75);
  this.phase+=dt*(.075+this.activity*(1.75+this.flux)+this.roles[1]*.70+this.roles[2]*.20);
  if(palette?.length===18)for(let i=0;i<18;i++)this.palette[i]=mix(this.palette[i],clamp(palette[i],0,2),1.3);
  if(active&&energy>.015&&this.time-this.lastHit>.16&&((level>.25&&level-this.envelope>.065)||strongest>.12)){
   const source=count?Math.floor(noise(this.emitted+311)*count):this.emitted%4,k=this.next*4;
   const strength=clamp(.15+Math.max(level,strongest)*.95+energy*.30,0,1.5);
   this.events.set([this.time,strength,source,lane<0?this.centroid:lane*.5],k);
   this.origins.set(nodes&&count?[nodes[source*4],nodes[source*4+1],nodes[source*4+2],1]:[-3+(source%4)*2,0,0,1],k);
   this.next=(this.next+1)%8;this.emitted++;this.lastHit=this.time;
  }
  this.envelope=level>this.envelope?level:mix(this.envelope,level,.12);return this;
 }
}
