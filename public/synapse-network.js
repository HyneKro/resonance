// Built once, with persistent junctions and bounded local connectivity. Music
// deforms this rest mesh on the GPU; it never rebuilds nearest neighbours.
export async function createSynapseNetwork(count=1700,yieldWork=async()=>{}){
 count=Math.max(128,Math.min(2048,Math.floor(count)||1700));
 let seed=73991;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const nodes=new Float32Array(count*8),edges=[],adj=Array.from({length:count},()=>[]),grid=new Map(),seen=new Set();
 const cell=.65,key=(x,y,z)=>`${x},${y},${z}`;
 const connect=(a,b)=>{
  if(a===b)return;const id=Math.min(a,b)*count+Math.max(a,b);if(seen.has(id))return;seen.add(id);
  const length=Math.hypot(nodes[a*4]-nodes[b*4],nodes[a*4+1]-nodes[b*4+1],nodes[a*4+2]-nodes[b*4+2]);
  edges.push(a,b,length,random());adj[a].push([b,length]);adj[b].push([a,length]);
 };
 for(let i=0;i<count;i++){
  const t=random(),angle=random()*Math.PI*2,branch=random(),radius=(.18+.64*Math.sin(t*12+1)**2)*(.87+random()*.26);
  let x=(t-.5)*10,y=.58*Math.sin(t*8-1)+.28*Math.sin(t*18),z=.65*Math.sin(t*9);
  if(branch>.63&&branch<.86){x=-2.7+t*4.8;y=-2.3+t*4.8;z=-.6+Math.sin(t*7)*.7;}
  else if(branch>=.86){x=-4.7+t*9.8;y=1.65+Math.sin(t*7)*.36;z=-1.4;}
  x+=Math.cos(angle)*radius*.26;y+=Math.cos(angle)*radius;z+=Math.sin(angle)*radius;
  nodes.set([x,y,z,random()],i*4);
  const gx=Math.floor(x/cell),gy=Math.floor(y/cell),gz=Math.floor(z/cell),candidates=[];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
   for(const j of grid.get(key(gx+dx,gy+dy,gz+dz))||[]){const d=(x-nodes[j*4])**2+(y-nodes[j*4+1])**2+(z-nodes[j*4+2])**2;if(d<.85**2)candidates.push([j,d]);}
  }
  candidates.sort((a,b)=>a[1]-b[1]);
  for(const [j]of candidates.slice(0,5))connect(i,j);
  // A nearest predecessor bridges isolated patches, so every flash can travel
  // through the graph. This one-off search does no work in the render loop.
  if(i&&!candidates.length){let nearest=0,distance=Infinity;for(let j=0;j<i;j++){const d=(x-nodes[j*4])**2+(y-nodes[j*4+1])**2+(z-nodes[j*4+2])**2;if(d<distance){distance=d;nearest=j;}}connect(i,nearest);}
  const k=key(gx,gy,gz);if(!grid.has(k))grid.set(k,[]);grid.get(k).push(i);
  if(i%128===0)await yieldWork();
 }
 // Four graph-distance fields: an impulse follows strand lengths, not a
 // screen-space expanding circle. Distances interpolate along each edge.
 for(let origin=0;origin<4;origin++){
  const distances=new Float64Array(count).fill(Infinity),visited=new Uint8Array(count);let source=0,best=Infinity;
  for(let i=0;i<count;i++){const d=(nodes[i*4]-(-3+origin*2))**2+nodes[i*4+1]**2+nodes[i*4+2]**2;if(d<best){best=d;source=i;}}
  distances[source]=0;
  for(let step=0;step<count;step++){
   let at=-1,shortest=Infinity;for(let i=0;i<count;i++)if(!visited[i]&&distances[i]<shortest){at=i;shortest=distances[i];}
   if(at<0)break;visited[at]=1;
   for(const [next,length]of adj[at])distances[next]=Math.min(distances[next],shortest+length);
   if(step%256===0)await yieldWork();
  }
  for(let i=0;i<count;i++)nodes[count*4+i*4+origin]=distances[i];
 }
 return {count,nodes,edges:new Float32Array(edges),edgeCount:edges.length/4};
}

export class SynapseSignals{
 constructor(){this.events=new Float32Array(32);this.reset();}
 reset(){this.time=0;this.clock=null;this.envelope=0;this.next=0;this.emitted=0;this.lastHit=-10;this.events.fill(0);}
 suspend(){this.clock=null;this.envelope=0;}
 update(clock,{onset=0,drums=0,energy=0,reduced=false}={}){
  if(!Number.isFinite(clock))return this;
  const level=Math.max(0,Math.min(1,Math.max(Number(onset)||0,(Number(drums)||0)*.75)));
  if(this.clock===null){this.clock=clock;this.envelope=level;return this;}
  const dt=clock-this.clock;this.clock=clock;
  if(reduced||dt<=0||dt>.25){if(dt<0||dt>.25)this.envelope=level;return this;}
  this.time+=dt;
  if(energy>.015&&level>.25&&level-this.envelope>.10&&this.time-this.lastHit>.28){
   this.events.set([this.time,level,this.emitted%4,0],this.next*4);this.next=(this.next+1)%8;this.emitted++;this.lastHit=this.time;
  }
  this.envelope=level>this.envelope?level:this.envelope+(level-this.envelope)*(1-Math.exp(-dt/.12));
  return this;
 }
}
