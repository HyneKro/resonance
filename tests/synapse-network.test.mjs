import test from 'node:test';
import assert from 'node:assert/strict';
import {createSynapseNetwork,SynapseSignals} from '../public/synapse-network.js';

const input={bass:.8,drums:0,lead:.7,texture:.5,energy:.8,lights:new Float32Array(48).fill(.65)};
const advance=(network,signals,seconds,options=input)=>{for(let i=0;i<Math.round(seconds*60);i++){signals.update((signals.clock??0)+1/60,{...options,nodes:network.nodes,count:network.count});network.update(signals);}};

test('Synapse prepares deterministic volumetric nodes with bounded nearest connections',async()=>{
 let yields=0;const a=await createSynapseNetwork(680,async()=>{yields++;}),b=await createSynapseNetwork(680);
 assert.deepEqual(a,b);assert.ok(yields>4);assert.ok(a.links.size>680&&a.links.size<=680*3);assert.equal(a.capacity,680*5);
 assert.ok(a.nodes.every(Number.isFinite));assert.ok(a.edges.every(Number.isFinite));
 const degree=new Uint16Array(a.count),pairs=new Set();
 for(const link of a.links.values()){
  const [x,y,opacity]=a.edges.slice(link.slot*4,link.slot*4+3);assert.ok(x>=0&&y<a.count&&x<y);assert.equal(opacity,1);
  const key=x+':'+y;assert.ok(!pairs.has(key));pairs.add(key);degree[x]++;degree[y]++;
  assert.ok(Math.hypot(...[0,1,2].map(j=>a.nodes[x*4+j]-a.nodes[y*4+j]))<=1.65);
 }
 assert.ok(degree.every(x=>x>=3));
 for(const axis of [0,1,2]){const values=Array.from({length:a.count},(_,i)=>a.nodes[i*4+axis]);assert.ok(Math.max(...values)-Math.min(...values)>2,'Not a flat billboard');}
});

test('Synapse all nodes travel and nearest links genuinely rearrange while remaining bounded',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals(),before=n.nodes.slice(),pairs=new Set(n.links.keys());s.update(0);advance(n,s,12);
 let changed=0;for(let i=0;i<n.count;i++)if(Math.hypot(...[0,1,2].map(j=>n.nodes[i*4+j]-before[i*4+j]))>.025)changed++;
 assert.equal(changed,n.count);assert.ok([...n.links.keys()].filter(x=>!pairs.has(x)).length>pairs.size*.3);
 assert.ok(n.links.size<n.capacity);assert.equal(n.links.size+n.free.length,n.capacity);assert.ok(n.rewires>60);
 assert.ok(n.nodes.every(Number.isFinite));assert.ok(n.edges.every(Number.isFinite));
 for(let i=0;i<n.count;i++)assert.ok(Math.hypot(n.nodes[i*4],n.nodes[i*4+1],n.nodes[i*4+2])<8);
});

test('Synapse new links crossfade and disappearing links release their slots',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);advance(n,s,3);
 assert.ok([...n.links.values()].some(x=>n.edges[x.slot*4+2]>.01&&n.edges[x.slot*4+2]<.99));
 const before=n.edges.slice();advance(n,s,1/60);
 for(let i=2;i<n.edges.length;i+=4)assert.ok(Math.abs(n.edges[i]-before[i])<.1,'Rewiring must not blink');
 const slots=new Set([...n.links.values()].map(x=>x.slot));assert.equal(slots.size,n.links.size);for(const free of n.free)assert.ok(!slots.has(free));
});

test('Synapse attacks enter an actual neighbouring link instead of a spatial shockwave',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);s.update(.02,{...input,onset:1,nodes:n.nodes,count:n.count});
 n.update(s);assert.equal(s.emitted,1);assert.equal(n.routes.length,1);const route=n.routes[0];
 assert.ok(route.a===s.events[2]||n.neighbours[s.events[2]].length===0);assert.ok(n.neighbours[route.a].includes(route.b));assert.ok(route.t>0&&route.t<1);
 assert.ok(n.currents[3]>0);assert.ok(n.nodes.slice(n.count*8).filter((v,k)=>k%4===1&&v>.01).length<=2);
});

test('Synapse impulses need audible rising attacks and expire without held-note retriggers',()=>{
 const signals=new SynapseSignals();signals.update(0);signals.update(.02,{onset:1,energy:.7});assert.equal(signals.emitted,1);
 for(let i=2;i<600;i++)signals.update(i*.02,{onset:1,drums:1,energy:.7});assert.equal(signals.emitted,1);
 const last=signals.events[0];for(let i=600;i<700;i++)signals.update(i*.02,{});assert.ok(signals.time-last>10);
 signals.update(14,{onset:1,energy:0});assert.equal(signals.emitted,1);
 for(let i=701;i<1700;i++)signals.update(i*.02,{onset:i%25===0?1:0,energy:.7});assert.ok(signals.emitted>20);assert.equal(signals.events.length,32);assert.ok(signals.events.every(Number.isFinite));
});

test('Synapse discards missing time and holds frozen/reduced frames without catchup',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);s.update(.02,{onset:.9,energy:.8});n.update(s);const t=s.time,events=s.events.slice(),nodes=n.nodes.slice();
 for(const [clock,options]of [[.02,{}],[.04,{reduced:true}],[.06,{hold:true}],[300,{onset:1,energy:1}]]){s.update(clock,options);n.update(s);assert.equal(s.time,t);assert.deepEqual(s.events,events);assert.deepEqual(n.nodes,nodes);}
 s.suspend();s.update(600,{onset:1,energy:1});assert.equal(s.time,t);assert.equal(s.emitted,1);s.update(600.02,{onset:1,energy:1});assert.equal(s.emitted,1);
 s.update(NaN);assert.ok(Number.isFinite(s.time));s.reset();assert.equal(s.emitted,0);assert.ok(s.events.every(x=>x===0));assert.equal(s.time,0);
});

test('Synapse pause settles smoothly, finishes existing currents and keeps slow idle motion',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);advance(n,s,2);s.update(s.clock+.02,{...input,onset:1});n.update(s);
 const emitted=s.emitted,activity=s.activity,phase=s.phase,time=s.time;advance(n,s,.2,{...input,onset:1,active:false});assert.ok(s.activity<activity&&s.activity>activity*.5);
 advance(n,s,6,{...input,onset:1,active:false});assert.equal(s.emitted,emitted);assert.ok(s.activity<.001);assert.ok(s.time-time>6);
 const idle=s.phase;advance(n,s,1,{active:false});assert.ok(s.phase-idle>.07&&s.phase-idle<.08);assert.ok(s.phase>phase);
});

test('Synapse track colours ease continuously and clearing old attacks preserves geometry phase',()=>{
 const s=new SynapseSignals(),a=Array(18).fill(.1),b=Array(18).fill(.9);s.update(0,{palette:a});s.update(.02,{...input,palette:a,onset:1});
 const phase=s.phase,time=s.time;s.clearEvents();assert.equal(s.phase,phase);assert.equal(s.time,time);assert.equal(s.emitted,0);
 s.update(.04,{palette:b});assert.ok(s.palette[0]>.1&&s.palette[0]<.12);for(let i=3;i<=300;i++)s.update(i*.02,{palette:b});assert.ok(s.palette[0]>.88);
});


test('Synapse sparse facets share nearby moving nodes and fade safely within a bounded pool',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);
 const check=()=>{
  assert.ok(n.faces.size>80&&n.faces.size<n.facetCapacity);assert.equal(n.faces.size+n.faceFree.length,n.facetCapacity);
  const slots=new Set();for(const face of n.faces.values()){
   assert.ok(!slots.has(face.slot));slots.add(face.slot);const [a,b,c,fade]=n.facets.slice(face.slot*4,face.slot*4+4);
   assert.ok(a>=0&&a<b&&b<c&&c<n.count);assert.ok(fade>=0&&fade<=1);
   if(face.wanted)for(const [x,y]of [[a,b],[a,c],[b,c]])assert.ok(Math.hypot(...[0,1,2].map(j=>n.nodes[x*4+j]-n.nodes[y*4+j]))<2.5);
  }assert.ok(n.facets.every(Number.isFinite));for(const free of n.faceFree)assert.ok(!slots.has(free));
 };
 check();const oldFaces=new Set(n.faces.keys());advance(n,s,8);check();assert.ok([...n.faces.keys()].some(id=>!oldFaces.has(id)));
 const before=n.facets.slice();advance(n,s,1/60);for(let k=3;k<n.facets.length;k+=4)assert.ok(Math.abs(n.facets[k]-before[k])<.07,'Facets must crossfade');
});


test('Synapse raw notes drive geometry independently of spectrum illumination and retain band identity',async()=>{
 const low=await createSynapseNetwork(680),high=await createSynapseNetwork(680),rest=await createSynapseNetwork(680);
 const states=[new SynapseSignals(),new SynapseSignals(),new SynapseSignals()];states.forEach(x=>x.update(0));
 const tone=band=>Float32Array.from({length:48},(_,k)=>.9*Math.exp(-Math.pow((k-band)/3,2)));
 for(let frame=1;frame<=180;frame++)for(let i=0;i<3;i++){
  const spectrum=i===2?new Float32Array(48):tone(i===0?8:39),state=states[i],n=[low,high,rest][i];
  state.update(frame/60,{energy:.7,spectrum,harmonic:spectrum,percussive:new Float32Array(48),lights:new Float32Array(48)});n.update(state);
 }
 const centroid=n=>{let sum=0,weighted=0;for(let i=0;i<n.count;i++){const k=i*4,d=Math.hypot(...[0,1,2].map(j=>n.nodes[k+j]-rest.nodes[k+j]));sum+=d;weighted+=d*n.frequencies[i];}return {weight:sum,band:weighted/sum};};
 const a=centroid(low),b=centroid(high);assert.ok(a.weight>10&&b.weight>10);assert.ok(a.band<.4&&b.band>.6,JSON.stringify({a,b}));
 assert.ok(states[0].spectrum.every(x=>x===0));assert.ok(states[0].detail.some(x=>x>.5));
});

test('Synapse harmonic, percussion and transient channels remain independent and decay on pause',()=>{
 const harmonic=new SynapseSignals(),percussive=new SynapseSignals(),spectrum=new Float32Array(48).fill(.7),zero=new Float32Array(48);
 harmonic.update(0);percussive.update(0);
 for(let i=1;i<=60;i++){
  harmonic.update(i/60,{energy:.7,spectrum,harmonic:spectrum,percussive:zero,lead:.6});
  percussive.update(i/60,{energy:.7,spectrum,harmonic:zero,percussive:spectrum,drums:.6});
 }
 assert.ok(harmonic.detail[1]>.65&&harmonic.detail[2]===0);assert.ok(percussive.detail[1]===0&&percussive.detail[2]>.65);assert.ok(harmonic.tension>percussive.tension+.5);
 const before=harmonic.emitted;harmonic.update(1.02,{energy:.7,hits:[0,.9,0]});assert.equal(harmonic.emitted,before+1);assert.equal(harmonic.events[(harmonic.next+7)%8*4+3],.5);
 assert.ok(harmonic.accents[1]>.5);for(let i=1;i<=360;i++)harmonic.update(1.02+i/60,{active:false,spectrum,harmonic:spectrum,hits:[1,1,1]});
 assert.ok(harmonic.detail.every(x=>x<.0001));assert.ok(harmonic.accents.every(x=>x<.0001));assert.equal(harmonic.emitted,before+1);
});

test('Synapse strong spring motion is stable across frame rates',async()=>{
 const a=await createSynapseNetwork(128),b=await createSynapseNetwork(128),detail=new Float32Array(192).fill(.65),roles=[.9,.7,.8,.7];
 for(let i=0;i<60;i++)a.place(0,128,3,.9,1/60,roles,[],detail,1.8,.8,.8);
 for(let i=0;i<30;i++)b.place(0,128,3,.9,1/30,roles,[],detail,1.8,.8,.8);
 assert.ok(a.nodes.every(Number.isFinite));let difference=0;for(let i=0;i<a.nodes.length;i++)difference=Math.max(difference,Math.abs(a.nodes[i]-b.nodes[i]));assert.ok(difference<.00005,String(difference));
});


test('Synapse carries in-flight graph signals across a track change',()=>{
 const s=new SynapseSignals();s.update(0);s.update(.02,{onset:1,energy:.8});const events=s.events.slice(),phase=s.phase,time=s.time;
 s.beginTrack();assert.equal(s.emitted,0);assert.equal(s.phase,phase);assert.equal(s.time,time);assert.deepEqual(s.events,events);
 s.update(.04,{onset:1,energy:.8});assert.equal(s.emitted,0);assert.ok(s.time>time);assert.deepEqual(s.events,events);
});

test('Synapse routed signals stay connected and continuous when they reach another junction',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);s.update(.02,{...input,onset:1,nodes:n.nodes,count:n.count});n.update(s);
 let previous=null,hops=0;for(let frame=0;frame<180;frame++){
  advance(n,s,1/60,{...input,onset:0});if(!n.routes.length)continue;const route=n.routes[0],point=[0,1,2].map(j=>n.nodes[route.a*4+j]*(1-route.t)+n.nodes[route.b*4+j]*route.t);
  if(previous)assert.ok(Math.hypot(...point.map((x,j)=>x-previous[j]))<.12,'A signal must not jump between nodes');previous=point;hops=Math.max(hops,route.hops);
  assert.ok(route.visited.includes(route.a));assert.ok(route.t>=0&&route.t<1);assert.ok(n.currents.every(Number.isFinite));
 }assert.ok(hops>=2,'Signals should actually visit several junctions');
});

test('Synapse heavy percussion remains local and all routed energy decays after pause',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);let peak=0,maxStep=0;
 for(let frame=1;frame<=480;frame++){
  const before=n.nodes.slice(0,n.count*4),hit=frame%30===1?1:0;s.update(frame/60,{...input,bass:1,onset:hit,hits:[hit,hit,hit],nodes:n.nodes,count:n.count});n.update(s);
  peak=Math.max(peak,n.nodes.slice(n.count*8).filter((v,k)=>k%4===1&&v>.03).length);
  for(let i=0;i<n.count;i++)maxStep=Math.max(maxStep,Math.hypot(...[0,1,2].map(j=>n.nodes[i*4+j]-before[i*4+j])));
  assert.ok(n.routes.length<=n.currentCapacity);
 }assert.ok(peak>2&&peak<n.count*.15,'Percussion must not flash the entire network');assert.ok(maxStep<.08);
 advance(n,s,8,{active:false});assert.equal(n.routes.length,0);assert.ok(n.currents.every(x=>x===0));assert.ok(n.nodes.slice(n.count*8).every(x=>x<.001));
});

test('Synapse overlapping regions have independent musical timing without hard motion groups',async()=>{
 const n=await createSynapseNetwork(680),quiet=await createSynapseNetwork(680),s=new SynapseSignals(),q=new SynapseSignals();s.update(0);q.update(0);
 const spectrum=Float32Array.from({length:48},(_,i)=>.9*Math.exp(-Math.pow((i-12)/4,2)));
 advance(n,s,4,{energy:.7,spectrum,harmonic:spectrum});advance(quiet,q,4,{energy:.7,spectrum:new Float32Array(48)});
 const rates=Array.from(n.localPhases),near=[],far=[];
 for(let j=0;j<24;j++)(Math.abs(n.domains[j].band-12)<5?near:far).push((n.localPhases[j]-quiet.localPhases[j])/n.domains[j].tempo);
 assert.ok(Math.max(...rates)>Math.min(...rates)*2,'Regions must not share one tempo');
 assert.ok(near.reduce((a,b)=>a+b,0)/near.length>far.reduce((a,b)=>a+b,0)/far.length+.5,'The sounding frequency must drive local clocks');
 for(let i=0;i<n.count;i++){
  const weights=n.regionWeights.slice(i*4,i*4+4);assert.ok(Math.abs(weights.reduce((a,b)=>a+b,0)-1)<.000001);
  assert.ok(weights.every(x=>x>0));assert.equal(new Set(n.regions.slice(i*4,i*4+4)).size,4);
 }
});

test('Synapse movement is local deformation rather than a shared translation, scale or rotation',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);advance(n,s,11);const before=n.nodes.slice();advance(n,s,1);
 const positions=[],motion=[];for(let i=0;i<n.count;i++){const k=i*4;positions.push([1,...before.slice(k,k+3)]);motion.push([0,1,2].map(j=>n.nodes[k+j]-before[k+j]));}
 const normal=Array.from({length:4},(_,i)=>Array.from({length:4},(_,j)=>positions.reduce((sum,p)=>sum+p[i]*p[j],0)));let residual=0,total=0;
 for(let axis=0;axis<3;axis++){
  const matrix=normal.map((row,i)=>[...row,positions.reduce((sum,p,k)=>sum+p[i]*motion[k][axis],0)]);
  for(let i=0;i<4;i++){
   let pivot=i;for(let j=i+1;j<4;j++)if(Math.abs(matrix[j][i])>Math.abs(matrix[pivot][i]))pivot=j;
   [matrix[i],matrix[pivot]]=[matrix[pivot],matrix[i]];const scale=matrix[i][i];for(let j=i;j<=4;j++)matrix[i][j]/=scale;
   for(let row=0;row<4;row++)if(row!==i){const amount=matrix[row][i];for(let j=i;j<=4;j++)matrix[row][j]-=matrix[i][j]*amount;}
  }
  const fit=matrix.map(row=>row[4]);for(let i=0;i<n.count;i++){const actual=motion[i][axis],predicted=positions[i].reduce((sum,x,j)=>sum+x*fit[j],0);residual+=(actual-predicted)**2;total+=actual**2;}
 }
 assert.ok(Math.sqrt(total/n.count)>.04,'The web must still visibly move');assert.ok(residual/total>.94,'A common transform must not explain the motion');
});

const mechanicalState=(time,energy=.8)=>({dt:1/60,time,phase:time*.25,activity:.6,energy,shimmer:0,phrase:0,beat:0,tension:.4,roles:[.6,0,.5,.3],detail:Float32Array.from({length:192},(_,i)=>i%4===0?.7:i%4===1?.5:0),spectrum:new Float32Array(48),events:new Float32Array(32),attacks:new Float32Array(3)});

test('Synapse loudness visibly morphs actual particle positions with identical flow clocks',async()=>{
 const loud=await createSynapseNetwork(680),quiet=await createSynapseNetwork(680);
 for(let i=1;i<=90;i++){loud.update(mechanicalState(i/60,.9));quiet.update(mechanicalState(i/60,.01));}
 assert.deepEqual(loud.localPhases,quiet.localPhases,'The difference must be physical displacement, not changing the flow clock');
 let total=0,large=0;for(let i=0;i<loud.count;i++){const d=Math.hypot(...[0,1,2].map(j=>loud.nodes[i*4+j]-quiet.nodes[i*4+j]));total+=d;if(d>.25)large++;}
 assert.ok(total/loud.count>.30,'Loudness deformation must be visible');assert.ok(large>loud.count*.65);assert.ok(loud.nodes.every(Number.isFinite));
});

test('Synapse physical motion remains visible at ordinary low spectrum magnitudes',async()=>{
 const n=await createSynapseNetwork(680),quiet=await createSynapseNetwork(680);
 for(let i=1;i<=90;i++){
  const sound=mechanicalState(i/60,.8),rest=mechanicalState(i/60,.01);for(const state of [sound,rest])state.detail=Float32Array.from({length:192},(_,k)=>k%4===0?.02:k%4===1?.01:0);
  n.update(sound);quiet.update(rest);
 }
 let displacement=0;for(let i=0;i<n.count;i++)displacement+=Math.hypot(...[0,1,2].map(j=>n.nodes[i*4+j]-quiet.nodes[i*4+j]));
 assert.ok(displacement/n.count>.25,'Real music levels must not need a nearly full-scale spectrum to move particles');
});

test('Synapse bass physically kicks the low-frequency area without a whole-scene shockwave',async()=>{
 const kicked=await createSynapseNetwork(680),steady=await createSynapseNetwork(680);
 for(let i=1;i<=60;i++){const state=mechanicalState(i/60);kicked.update(state);steady.update(state);}
 for(let i=1;i<=12;i++){const hit=mechanicalState(1+i/60),rest=mechanicalState(1+i/60);if(i===1)hit.attacks[0]=1;kicked.update(hit);steady.update(rest);}
 const low=[],high=[];for(let i=0;i<kicked.count;i++){const d=Math.hypot(...[0,1,2].map(j=>kicked.nodes[i*4+j]-steady.nodes[i*4+j]));if(kicked.frequencies[i]<.35)low.push(d);if(kicked.frequencies[i]>.7)high.push(d);}
 const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;assert.ok(mean(low)>.045,mean(low));assert.ok(mean(high)<.002,mean(high));
});

test('Synapse frequency identity is a smooth three-dimensional gradient rather than a random seed',async()=>{
 const n=await createSynapseNetwork(680);assert.ok(Math.max(...n.frequencies)-Math.min(...n.frequencies)>.75);
 let depthPair=false,heightPair=false;
 for(let a=0;a<n.count;a++)for(let b=a+1;b<n.count;b++){
  const dx=n.anchors[a*3]-n.anchors[b*3],dy=n.anchors[a*3+1]-n.anchors[b*3+1],dz=n.anchors[a*3+2]-n.anchors[b*3+2],df=n.frequencies[a]-n.frequencies[b];
  if(Math.abs(dx)<.15&&Math.abs(dy)<.15&&Math.abs(dz)>2&&df*dz>0&&Math.abs(df)>.09)depthPair=true;
  if(Math.abs(dx)<.15&&Math.abs(dz)<.15&&Math.abs(dy)>2&&df*dy>0&&Math.abs(df)>.12)heightPair=true;
 }assert.ok(depthPair&&heightPair,'Frequency must vary with depth and height as well as width');
 for(let i=0;i<n.count;i++)assert.equal(n.nodes[n.count*4+i*4+3],n.frequencies[i]);
});

test('Synapse bass bursts stay small, do not retrigger held notes, and fade completely',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);s.update(.02,{energy:.8,onset:1,bass:.8,hits:[1,0,0],nodes:n.nodes,count:n.count});n.update(s);
 const spawned=n.burstsSpawned;assert.ok(spawned>=3&&spawned<=10);advance(n,s,.3,{energy:.8,onset:1,bass:.8,hits:[1,0,0]});assert.equal(n.burstsSpawned,spawned);
 assert.ok(n.bursts.slice(0,n.burstCapacity*4).some((v,i)=>i%4===3&&v>.01));assert.ok(n.bursts.every(Number.isFinite));
 advance(n,s,4,{active:false});assert.equal(n.burstsSpawned,spawned);for(let i=0;i<n.burstCapacity;i++)assert.equal(n.bursts[i*4+3],0);
});

test('Synapse repeated bass transients remain physical when broad onset envelopes stay high',async()=>{
 const n=await createSynapseNetwork(680),s=new SynapseSignals();s.update(0);let peaks=0;
 for(let frame=1;frame<=240;frame++){
  const t=frame/60,kick=Math.exp(-(t%.5)*22),spectrum=new Float32Array(48).fill(.02),percussive=Float32Array.from({length:48},(_,k)=>k<16?.12*kick:0);
  s.update(t,{energy:.7,onset:.9,accents:[.9,0,0],bass:.8,spectrum,percussive,nodes:n.nodes,count:n.count});if(s.attacks[0]>.18)peaks++;n.update(s);
 }
 assert.ok(peaks>=6,'Repeated kicks need their own detector, not a held global onset');assert.ok(n.burstsSpawned>=18&&n.burstsSpawned<=80);
});
