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
 let changed=0;for(let i=0;i<n.count;i++)if(Math.hypot(...[0,1,2].map(j=>n.nodes[i*4+j]-before[i*4+j]))>.1)changed++;
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

test('Synapse attacks begin at one actual node and retain that origin as the node moves',async()=>{
 const n=await createSynapseNetwork(128),s=new SynapseSignals();s.update(0);s.update(.02,{...input,onset:1,nodes:n.nodes,count:n.count});
 assert.equal(s.emitted,1);const id=s.events[2],origin=s.origins.slice(0,3);assert.deepEqual(origin,n.nodes.slice(id*4,id*4+3));
 advance(n,s,1);assert.deepEqual(s.origins.slice(0,3),origin);assert.notDeepEqual(n.nodes.slice(id*4,id*4+3),origin);
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

test('Synapse pause settles smoothly, finishes existing waves and keeps slow idle motion',async()=>{
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
 const centroid=n=>{let sum=0,weighted=0;for(let i=0;i<n.count;i++){const k=i*4,d=Math.hypot(...[0,1,2].map(j=>n.nodes[k+j]-rest.nodes[k+j]));sum+=d;weighted+=d*n.nodes[k+3];}return {weight:sum,band:weighted/sum};};
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


test('Synapse carries in-flight pressure and light waves across a track change',()=>{
 const s=new SynapseSignals();s.update(0);s.update(.02,{onset:1,energy:.8});const events=s.events.slice(),origins=s.origins.slice(),phase=s.phase,time=s.time;
 s.beginTrack();assert.equal(s.emitted,0);assert.equal(s.phase,phase);assert.equal(s.time,time);assert.deepEqual(s.events,events);assert.deepEqual(s.origins,origins);
 s.update(.04,{onset:1,energy:.8});assert.equal(s.emitted,0);assert.ok(s.time>time);assert.deepEqual(s.events,events);
});
