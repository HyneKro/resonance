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
  // Position, spring velocity, then local musical energy / charge / harmonic / texture.
  this.nodes=new Float32Array(this.count*12);this.seeds=new Float32Array(this.count*4);
  this.anchors=new Float32Array(this.count*3);this.regions=new Uint8Array(this.count*4);this.regionWeights=new Float32Array(this.count*4);
  this.frequencies=new Float32Array(this.count);this.audioMotion=new Float64Array(this.count*6);this.appliedAudio=new Float64Array(this.count*3);
  this.burstCapacity=this.count>1000?144:48;this.bursts=new Float32Array(this.burstCapacity*8);this.burstVelocity=new Float64Array(this.burstCapacity*3);this.burstAge=new Float64Array(this.burstCapacity);this.burstLife=new Float64Array(this.burstCapacity);this.burstCursor=0;this.burstsSpawned=0;
  this.domains=Array.from({length:24},(_,i)=>{
   const x=(i%4-1.5)*2.8,y=(Math.floor(i/4)%2-.5)*2.6+x*.18,z=(Math.floor(i/8)-1)*2.2;
   const axis=[noise(i+823)*2-1,noise(i+1291)*2-1,noise(i+2143)*2-1],length=Math.hypot(...axis);
   return {center:[x,y,z],axis:axis.map(v=>v/length),tempo:.55+noise(i+4127)*.95,offset:noise(i+1181)*Math.PI*2,band:Math.floor(noise(i+3413)*47)};
  });
  this.localPhases=new Float64Array(24);this.localForces=new Float64Array(48);
  this.currentCapacity=this.count>1000?36:16;this.currents=new Float32Array(this.currentCapacity*4);
  this.routes=[];this.neighbours=Array.from({length:this.count},()=>[]);this.lastDischarge=-1;
  this.edgeRows=Math.ceil(this.capacity/1024);this.edges=new Float32Array(this.edgeRows*4096);
  this.links=new Map();this.free=Array.from({length:this.capacity},(_,i)=>this.capacity-i-1);
  this.facetCapacity=this.count*2;this.facetRows=Math.ceil(this.facetCapacity/1024);this.facets=new Float32Array(this.facetRows*4096);
  this.faces=new Map();this.faceFree=Array.from({length:this.facetCapacity},(_,i)=>this.facetCapacity-i-1);this.facetCount=0;
  this.edgeCount=0;this.rewireAt=0;this.rewires=0;this.version=0;this.steps=0;
  for(let i=0;i<this.count;i++){
   this.seeds.set([noise(i+19),noise(i+723),noise(i+1731),noise(i+4391)],i*4);
   const t=this.seeds[i*4],v=this.seeds[i*4+1]*2-1,depth=this.seeds[i*4+2]*2-1;
   const x=(t-.5)*10.6+Math.sin(v*4+this.seeds[i*4+3]*3)*.16;
   const y=v*1.75+(t-.5)*1.9+Math.sin(t*6.1)*.45+Math.sin(t*15+depth*3)*.12;
   const z=depth*2.55+Math.sin(t*5.6+v*2.1)*.44+Math.cos(v*4.2+t*9)*.12,angle=Math.sin(t*4)*.12;
   this.anchors.set([x,y*Math.cos(angle)-z*Math.sin(angle),z*Math.cos(angle)+y*Math.sin(angle)],i*3);
   this.frequencies[i]=clamp(.5+this.anchors[i*3]*.052+this.anchors[i*3+1]*.068+this.anchors[i*3+2]*.055);
   const nearest=this.domains.map((d,id)=>({id,distance:Math.hypot(x-d.center[0],y-d.center[1],z-d.center[2])})).sort((a,b)=>a.distance-b.distance).slice(0,4);
   const weights=nearest.map(d=>1/(.35+d.distance*d.distance)),total=weights.reduce((a,b)=>a+b,0);
   for(let j=0;j<4;j++){this.regions[i*4+j]=nearest[j].id;this.regionWeights[i*4+j]=weights[j]/total;}
  }
 }
 place(from,to,phase,drive,dt=0,roles=[0,0,0,0],spectrum=[],detail=[],force=1,beat=0,tension=0){
  const n=this.count,p=this.nodes,s=this.seeds;
  for(let j=0;j<this.domains.length;j++){
   const domain=this.domains[j],k=domain.band*4,harmonic=clamp(detail[k+1]);
   const local=this.localPhases[j]+domain.offset,amplitude=.11+drive*.08+harmonic*.075+roles[3]*.045;
   this.localForces[j*2]=Math.sin(local)*amplitude;this.localForces[j*2+1]=Math.cos(local*.73+domain.offset)*amplitude*.65;
  }
  for(let i=from;i<to;i++){
   const k=i*4,t=s[k],v=s[k+1]*2-1,depth=s[k+2]*2-1;
   const lane=Math.min(47,Math.floor(this.frequencies[i]*48)),band=clamp(detail[lane*4]??spectrum[lane]),harmonic=clamp(detail[lane*4+1]),percussive=clamp(detail[lane*4+2]),flux=clamp(detail[lane*4+3]);
   let x=this.anchors[i*3],y=this.anchors[i*3+1],z=this.anchors[i*3+2],ox=0,oy=0,oz=0;
   // Overlapping local circulations bend neighbouring patches in different
   // directions. There is no common rotation or swelling of the whole volume.
   for(let j=0;j<4;j++){
    const id=this.regions[k+j],domain=this.domains[id],weight=this.regionWeights[k+j],[ax,ay,az]=domain.axis;
    const dx=x-domain.center[0],dy=y-domain.center[1],dz=z-domain.center[2],falloff=weight/(1+Math.hypot(dx,dy,dz)*.45);
    const a=this.localForces[id*2],b=this.localForces[id*2+1],bass=(roles[0]*(.025+noise(id+97)*.045)+beat*.018*noise(id+157))*force;
    ox+=((ay*dz-az*dy)*a+(az*dz+ay*dy)*b+ax*bass)*falloff;
    oy+=((az*dx-ax*dz)*a+(-ay*dx-ax*dz)*b+ay*bass)*falloff;
    oz+=((ax*dy-ay*dx)*a+(ax*dy-az*dx)*b+az*bass)*falloff;
   }
   const local=phase*(.55+s[k+1]*1.1)+s[k+3]*23,flex=(.035+band*.22+harmonic*.10)*force;
   x+=ox+Math.sin(local*.71+v*7)*flex*.65;
   y+=oy+Math.sin(local+depth*5)*flex;
   z+=oz+Math.cos(local*.83+t*11)*flex+Math.sin(local*1.3)*(percussive*.035+flux*.025)*force;
   if(!dt){p.set([x,y,z,s[k+3]],k);p[n*4+k+3]=this.frequencies[i];continue;}
   const velocity=n*4+k,omega=2.1+noise(i+574)*2.3+band*.30,decay=Math.exp(-omega*dt);
   // Exact damped spring integration keeps strong attacks smooth on slow frames.
   for(let j=0;j<3;j++){
    const target=j===0?x:j===1?y:z,error=p[k+j]-this.appliedAudio[i*3+j]-target,travel=p[velocity+j]+omega*error,offset=this.audioMotion[i*6+j];
    p[k+j]=target+(error+travel*dt)*decay+offset;p[velocity+j]=(p[velocity+j]-omega*travel*dt)*decay;this.appliedAudio[i*3+j]=offset;
   }
   p[velocity+3]=this.frequencies[i];
  }
 }
 moveAudio(signals,beat,force){
  const dt=signals.dt;if(signals.time<(this.audioTime??0))this.audioMotion.fill(0);this.audioTime=signals.time;
  for(let i=0;i<this.count;i++){
   const k=i*6,at=i*3,frequency=this.frequencies[i],lane=Math.min(47,Math.floor(frequency*48))*4;
   const band=clamp(signals.detail[lane]),harmonic=clamp(signals.detail[lane+1]),percussive=clamp(signals.detail[lane+2]);
   const x=this.anchors[at],y=this.anchors[at+1],z=this.anchors[at+2],seed=this.seeds[i*4+3]*Math.PI*2;
   let phase=0;for(let j=0;j<4;j++)phase+=this.localPhases[this.regions[i*4+j]]*this.regionWeights[i*4+j];
   // Loudness changes the shape directly. Its lobes differ across all three
   // axes, rather than making the entire network expand uniformly.
   const bandDrive=Math.sqrt(band),harmonicDrive=Math.sqrt(harmonic);
   const amplitude=Math.min(.85,signals.energy*(.30+bandDrive*.95+harmonicDrive*.45)*force);
   const tx=Math.sin(y*1.7+z*1.25+phase*.7)*amplitude,ty=Math.sin(z*1.8+x*1.15-phase*.45)*amplitude*.90,tz=Math.cos(x*1.5-y*1.4+phase*.55)*amplitude;
   const low=Math.max(0,1-frequency/.58),mid=Math.exp(-Math.pow((frequency-.50)/.22,2));
   const kick=(signals.attacks?.[0]||0)*low*(.35+bandDrive*.65),strike=(signals.attacks?.[1]||0)*mid*(.30+Math.sqrt(percussive)*.70),hat=(signals.attacks?.[2]||0)*frequency*frequency*.3;
   const impulse=(kick*4.5+strike*2.4+hat)*clamp(beat,0,2)*force;
   const dx=Math.sin(seed+z*.7),dy=Math.cos(seed*.71+x*.5),dz=Math.sin(seed*.53-y*.8),length=Math.hypot(dx,dy,dz);
   for(let j=0;j<3;j++)this.audioMotion[k+3+j]+=(j===0?dx:j===1?dy:dz)/length*impulse;
   const speed=Math.hypot(this.audioMotion[k+3],this.audioMotion[k+4],this.audioMotion[k+5]);if(speed>3)for(let j=3;j<6;j++)this.audioMotion[k+j]*=3/speed;
   const omega=3.4+noise(i+213)*1.6,decay=Math.exp(-omega*dt);
   for(let j=0;j<3;j++){
    const target=j===0?tx:j===1?ty:tz,error=this.audioMotion[k+j]-target,travel=this.audioMotion[k+3+j]+omega*error;
    this.audioMotion[k+j]=target+(error+travel*dt)*decay;this.audioMotion[k+3+j]=(this.audioMotion[k+3+j]-omega*travel*dt)*decay;
   }
  }
 }
 updateBursts(signals,beat){
  const dt=signals.dt,capacity=this.burstCapacity,p=this.bursts;
  if(signals.time<(this.burstTime??0)){p.fill(0);this.burstLife.fill(0);this.burstAge.fill(0);this.burstCursor=0;this.burstsSpawned=0;this.lastBassBurst=-10;}this.burstTime=signals.time;
  const attack=signals.attacks?.[0]||0;
  if(attack>.18&&signals.energy>.02&&beat>0&&signals.time-(this.lastBassBurst??-10)>.24){
   this.lastBassBurst=signals.time;
   const count=Math.min(10,Math.round(3+7*attack*signals.energy));
   for(let j=0;j<count;j++){
    let slot=-1;for(let attempt=0;attempt<capacity;attempt++){const next=this.burstCursor++%capacity;if(!this.burstLife[next]||this.burstAge[next]>=this.burstLife[next]){slot=next;break;}}if(slot<0)break;
    const serial=this.burstsSpawned++,k=slot*4;let node=0,best=Infinity;
    for(let attempt=0;attempt<24;attempt++){const candidate=Math.floor(noise(serial*37+attempt+111)*this.count),score=Math.abs(this.frequencies[candidate]-.25)+noise(candidate+serial)*.12;if(score<best){best=score;node=candidate;}}
    const seed=noise(serial+431),theta=noise(serial+907)*Math.PI*2,vertical=noise(serial+661)*2-1,radius=Math.sqrt(1-vertical*vertical),speed=.35+attack*.65+signals.energy*.30;
    p.set([this.nodes[node*4],this.nodes[node*4+1],this.nodes[node*4+2],0],k);p.set([this.frequencies[node],3+seed*2,seed,0],capacity*4+k);
    this.burstVelocity.set([Math.cos(theta)*radius*speed,vertical*speed,Math.sin(theta)*radius*speed],slot*3);this.burstAge[slot]=0;this.burstLife[slot]=1.1+seed*1.2;
   }
  }
  for(let i=0;i<capacity;i++){
   const k=i*4,age=this.burstAge[i]+=dt,life=this.burstLife[i];if(!life||age>=life){p[k+3]=0;continue;}
   const t=age/life;for(let j=0;j<3;j++){this.burstVelocity[i*3+j]*=Math.exp(-dt*.45);p[k+j]+=this.burstVelocity[i*3+j]*dt;}
   p[k+3]=Math.sin(t*Math.PI)**1.5*.48*Math.min(1,age/.10);p[capacity*4+k+3]=t;
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
  for(const neighbours of this.neighbours)neighbours.length=0;
  for(const link of this.links.values())if(link.wanted){const k=link.slot*4,a=this.edges[k],b=this.edges[k+1];this.neighbours[a].push(b);this.neighbours[b].push(a);}
  this.rewires++;
 }
 nextNode(node,previous,band,seed,visited=[]){
  let best=-1,score=-Infinity;const p=this.nodes,k=node*4;
  for(const other of this.neighbours[node]){
   if(other===previous||visited.includes(other))continue;
   const at=other*4,dx=p[at]-p[k],dy=p[at+1]-p[k+1],dz=p[at+2]-p[k+2],length=Math.hypot(dx,dy,dz);
   let alignment=0;if(previous>=0){const before=previous*4;alignment=(dx*(p[k]-p[before])+dy*(p[k+1]-p[before+1])+dz*(p[k+2]-p[before+2]))/Math.max(.01,length*Math.hypot(p[k]-p[before],p[k+1]-p[before+1],p[k+2]-p[before+2]));}
   const value=alignment*.35-Math.abs(this.frequencies[other]-band)*.65+noise(other+seed*31)*.30;
   if(value>score){score=value;best=other;}
  }return best;
 }
 conduct(signals){
  const dt=signals.dt,p=this.nodes,n=this.count,base=n*8;
  if(signals.time<(this.signalTime??0)){this.routes.length=0;this.lastDischarge=-1;p.fill(0,base);}
  this.signalTime=signals.time;
  for(let i=0;i<n;i++){
   const k=base+i*4,lane=Math.min(47,Math.floor(this.frequencies[i]*48))*4;
   const raw=signals.detail[lane],harmonic=signals.detail[lane+1],texture=signals.roles[3];
   const target=raw*(.40+harmonic*.42);
   p[k]+=(target-p[k])*(1-Math.exp(-dt/(target>p[k]?.16:.62)));
   p[k+1]*=Math.exp(-dt/.38);
   p[k+2]+=(harmonic-p[k+2])*(1-Math.exp(-dt/.28));
   p[k+3]+=(texture*(.25+raw*.75)-p[k+3])*(1-Math.exp(-dt/.65));
  }
  // One small signal chooses a route through real neighbours. No expanding shell,
  // radial displacement or all-node flash is involved in an attack.
  for(let e=0;e<8;e++){
   const k=e*4,time=signals.events[k];if(signals.events[k+1]<=0||time<=this.lastDischarge)continue;
   let a=Math.floor(signals.events[k+2])%n;const band=signals.events[k+3];
   if(!this.neighbours[a].length){let best=Infinity,near=a;for(let i=0;i<n;i++)if(this.neighbours[i].length){const distance=Math.hypot(p[i*4]-p[a*4],p[i*4+1]-p[a*4+1],p[i*4+2]-p[a*4+2]);if(distance<best){best=distance;near=i;}}a=near;}
   const b=this.nextNode(a,-1,band,time);
   if(b>=0&&this.routes.length<this.currentCapacity)this.routes.push({a,b,t:0,power:signals.events[k+1],band,age:0,hops:0,seed:time,visited:[a]});
  }
  this.lastDischarge=Math.max(this.lastDischarge,...Array.from({length:8},(_,e)=>signals.events[e*4+1]>0?signals.events[e*4]:-1));
  this.currents.fill(0);
  const living=[];
  for(const route of this.routes){
   route.age+=dt;const a=route.a*4,b=route.b*4,length=Math.max(.08,Math.hypot(p[a]-p[b],p[a+1]-p[b+1],p[a+2]-p[b+2]));
   route.t+=dt*(1.05+signals.energy*.65)/length;
   if(route.t>=1){
    p[base+route.b*4+1]=Math.min(1,p[base+route.b*4+1]+route.power*.55);
    route.visited.push(route.b);const next=this.nextNode(route.b,route.a,route.band,route.seed+route.hops,route.visited);
    if(next<0||++route.hops>=7||route.age>3.5)continue;
    route.a=route.b;route.b=next;route.t=0;route.power*=.82;
   }
   const envelope=Math.min(1,route.age/.12)*Math.exp(-route.age*.22),power=route.power*envelope;
   const ka=base+route.a*4+1,kb=base+route.b*4+1;
   p[ka]=Math.max(p[ka],power*(1-route.t)*.65);p[kb]=Math.max(p[kb],power*route.t*.65);
   this.currents.set([route.a,route.b,route.t,power],living.length*4);living.push(route);
  }this.routes=living;
 }
 update(signals,{movement=1,beat=.55,turbulence=1}={}){
  const dt=signals.dt;if(!dt)return this;
  if(movement>0)for(let j=0;j<this.domains.length;j++){
   const d=this.domains[j],k=d.band*4;
   this.localPhases[j]+=dt*clamp(movement,0,2)*d.tempo*(.045+clamp(signals.detail[k])*.48+clamp(signals.detail[k+1])*.22+signals.activity*.035);
  }
  if(movement>0){this.moveAudio(signals,beat,clamp(turbulence,.25,2)*clamp(movement,0,2));this.place(0,this.count,signals.phase*clamp(movement,0,2),signals.activity*(1+signals.phrase*.15),dt,signals.roles,signals.spectrum,signals.detail,clamp(turbulence,.25,2),signals.beat*clamp(beat,0,2),signals.tension);}
  this.updateBursts(signals,beat);
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
  this.conduct(signals);this.steps++;this.version++;return this;
 }
}

export class SynapseSignals{
 constructor(){this.events=new Float32Array(32);this.roles=new Float32Array(4);this.spectrum=new Float32Array(48);this.detail=new Float32Array(48*4);this.previous=new Float32Array(48);this.accents=new Float32Array(3);this.attacks=new Float32Array(3);this.palette=new Float32Array(18);this.reset();}
 reset(){this.time=0;this.phase=0;this.clock=null;this.dt=0;this.activity=0;this.energy=0;this.shimmer=0;this.flux=0;this.centroid=.5;this.tension=0;this.beat=0;this.phrase=0;this.lastBassPerc=0;this.bassPercPeak=0;this.lastRhythmPulse=0;this.initialized=false;this.clearEvents();this.roles.fill(0);this.spectrum.fill(0);this.detail.fill(0);this.previous.fill(0);this.accents.fill(0);this.attacks.fill(0);}
 clearEvents(){this.envelope=0;this.laneEnvelopes=[0,0,0];this.next=0;this.emitted=0;this.lastHit=-10;this.events.fill(0);}
 beginTrack(){
  // Keep in-flight graph signals and the material phase through a song change.
  this.envelope=0;this.laneEnvelopes=[0,0,0];this.emitted=0;this.lastHit=this.time;
 }
 suspend(){this.clock=null;this.dt=0;}
 update(clock,{onset=0,drums=0,bass=0,lead=0,texture=0,shimmer=0,energy=0,reduced=false,hold=false,active=true,palette,lights,spectrum,harmonic,percussive,accents,hits,rhythm,direction,nodes,count=0}={}){
  this.dt=0;this.attacks.fill(0);if(!Number.isFinite(clock))return this;
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
  let sum=0,weighted=0,fluxSum=0,harmonicSum=0,bassPerc=0;
  for(let i=0;i<48;i++){
   const raw=active?clamp(spectrum?.[i]??lights?.[i]):0,k=i*4;
   const h=active?clamp(harmonic?.[i]??raw*.65):0,p=active?clamp(percussive?.[i]??raw*.35):0;
   const rise=active?clamp((raw-this.previous[i])*3.5):0;this.previous[i]=raw;
   const values=[raw,h,p,rise];for(let j=0;j<4;j++)this.detail[k+j]=mix(this.detail[k+j],values[j],active?(j===3?.12:values[j]>this.detail[k+j]?.11:.34):.65);
   this.spectrum[i]=mix(this.spectrum[i],active?clamp(lights?.[i]):0,.065);
   sum+=raw;weighted+=raw*i/47;fluxSum+=rise;harmonicSum+=h;if(i<16)bassPerc+=p/16;
  }
  this.flux=mix(this.flux,clamp(fluxSum/48*2.5),.09);
  this.centroid=mix(this.centroid,sum>.01?weighted/sum:.5,.4);
  this.tension=mix(this.tension,active?clamp(harmonicSum/48*.75+lead*.45+texture*.35):0,.45);
  const trusted=rhythm?.confidence>.5?clamp(rhythm.pulse)*clamp((rhythm.confidence-.5)*2):0;
  let lane=-1,strongest=0;
  for(let i=0;i<3;i++){
   const hit=active?clamp(Math.max(accents?.[i]||0,hits?.[i]||0)):0;
   this.accents[i]=mix(this.accents[i],hit,hit>this.accents[i]?.018:.24);
   const rise=hit-this.laneEnvelopes[i];if(rise>strongest){strongest=rise;lane=i;}this.attacks[i]=active&&energy>.015?clamp(rise):0;
   this.laneEnvelopes[i]=hit>this.laneEnvelopes[i]?hit:mix(this.laneEnvelopes[i],hit,.10);
  }
  this.beat=mix(this.beat,active?Math.max(trusted,this.accents[0]):0,.065);
  if(active&&energy>.015)this.attacks[0]=Math.max(this.attacks[0],clamp(level-this.envelope)*clamp(bass)*.75);
  // Broad onset/accent envelopes can stay high between kicks. Detect the
  // rising low-percussion energy too, normalized to its recent local peak.
  this.bassPercPeak=Math.max(bassPerc,this.bassPercPeak*Math.exp(-dt/1.4));const bassRise=bassPerc-this.lastBassPerc;
  const lowAttack=active&&energy>.015&&bassRise>Math.max(.0002,this.bassPercPeak*.045)?clamp(bassRise/Math.max(.004,this.bassPercPeak)*1.7):0;
  const rhythmAttack=active&&energy>.015?clamp(trusted-this.lastRhythmPulse)*clamp(bass)*.7:0;
  this.attacks[0]=Math.max(this.attacks[0],lowAttack,rhythmAttack);this.lastBassPerc=bassPerc;this.lastRhythmPulse=trusted;
  if(lowAttack>strongest){strongest=lowAttack;lane=0;}
  this.phrase=mix(this.phrase,active?clamp((direction?.energy||0)*(direction?.mix||0)):0,.75);
  this.phase+=dt*(.075+this.activity*.30+this.roles[0]*.055+this.roles[2]*.07);
  if(palette?.length===18)for(let i=0;i<18;i++)this.palette[i]=mix(this.palette[i],clamp(palette[i],0,2),1.3);
  if(active&&energy>.015&&this.time-this.lastHit>.24&&((level>.25&&level-this.envelope>.065)||strongest>.12)){
   const band=lane<0?this.centroid:[.12,.5,.86][lane];let source=count?Math.floor(noise(this.emitted+311)*count):this.emitted%4,best=Infinity;
   if(nodes&&count)for(let j=0;j<24;j++){const candidate=Math.floor(noise(this.emitted*29+j+311)*count),score=Math.abs(nodes[count*4+candidate*4+3]-band)+noise(candidate+this.emitted)*.20;if(score<best){best=score;source=candidate;}}
   const k=this.next*4,strength=clamp(.16+Math.max(level,strongest)*.50+energy*.20,0,.85);
   this.events.set([this.time,strength,source,band],k);
   this.next=(this.next+1)%8;this.emitted++;this.lastHit=this.time;
  }
  this.envelope=level>this.envelope?level:mix(this.envelope,level,.12);return this;
 }
}
