import {hash} from './constellation-model.js';
import {buildSpace,connections,OrbitCamera,projectPoint,pickSphere,flowingPosition} from './constellation-space.js';
import {ConstellationSky} from './constellation-sky.js';

/** Perspective-projected 3D spheres with a bounded, on-screen-only canvas loop.
 * No second WebGL context, audio decoder or background worker is needed. */
export class ConstellationScene {
 constructor(canvas,{onSelect,onHover,onEmpty,viewport=()=>({top:0,bottom:0})}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onSelect=onSelect;this.onHover=onHover;this.onEmpty=onEmpty;this.viewport=viewport;
  this.camera=new OrbitCamera();this.data={points:[],groups:[],links:[]};this.visible=new Set();this.selected='';this.current='';this.hover='';this.route=[];this.hits=[];this.sprites=new Map();this.pointers=new Map();this.active=true;this.frame=0;this.last=0;this.time=0;
  this.coarse=matchMedia('(pointer:coarse)').matches||innerWidth<750;this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
  this.sky=new ConstellationSky(this.coarse);
  this.dust=Array.from({length:this.coarse?500:1100},(_,i)=>{const a=hash(i+'skyaz')*Math.PI*2,z=hash(i+'skyheight')*2-1,r=Math.sqrt(1-z*z);return {point:[Math.cos(a)*r*5000,z*5000,Math.sin(a)*r*5000],size:hash(i+'skysize')>.96?1.4:.55,phase:hash(i+'skytwinkle')*6.28};});
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.bind();this.resize();this.tick=this.tick.bind(this);this.visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}else this.wake();};document.addEventListener('visibilitychange',this.visibility);this.wake();
 }
 setData(nodes,positions){this.data=buildSpace(nodes,positions);this.byId=new Map(this.data.points.map(p=>[p.id,p]));this.visible=new Set(nodes.map(n=>n.id));this.selectedLinks=null;this.setSelection(this.selected);}
 setSelection(id){if(this.selected===id&&this.selectedLinks)return;this.selected=id;this.selectedLinks=connections(this.data.points,id);}
 focus(id,zoom){const p=this.byId?.get(id);if(p)this.camera.focus(flowingPosition(p,this.time),zoom);}
 home(){
  this.camera.home();if(!this.data.points.length)return;
  const positions=this.data.points.filter(p=>this.visible.has(p.id)).map(p=>p.position);if(!positions.length)return;
  const center=[0,1,2].map(i=>(Math.min(...positions.map(p=>p[i]))+Math.max(...positions.map(p=>p[i])))/2),inset=this.viewport(),w=this.width,h=Math.max(150,this.height-(inset.top||0)-(inset.bottom||0)),f=Math.min(w,h*1.55)*1.12;
  let distance=360;for(const p of positions){const [x,y,z]=p.map((v,i)=>v-center[i]);distance=Math.max(distance,Math.max(Math.abs(x)*f/(w*.43),Math.abs(y)*f/(h*.4))-z);}
  this.camera.center=center;this.camera.scale(1250/distance);
 }
 resize(){const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.ratio=Math.min(devicePixelRatio||1,this.coarse?1.5:2);this.canvas.width=Math.round(r.width*this.ratio);this.canvas.height=Math.round(r.height*this.ratio);}
 wake(){if(!this.active||document.hidden||this.frame)return;this.frame=requestAnimationFrame(this.tick);}
 tick(now){this.frame=0;if(!this.active||document.hidden)return;const interval=this.reduced.matches?100:this.coarse?1000/30:1000/60;if(now-this.last>=interval-.5){const dt=Math.min(.05,(now-this.last)/1000||.016);this.last=now;if(!this.reduced.matches)this.time+=dt;this.draw(this.camera.update(dt,this.reduced.matches));}this.wake();}
 sprite(color,variant=0){
  const key=color+variant;if(this.sprites.has(key))return this.sprites.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
  const glow=c.createRadialGradient(64,64,1,64,64,63);glow.addColorStop(0,color+'ba');glow.addColorStop(.18,color+'48');glow.addColorStop(.48,color+'19');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(0,0,128,128);
  c.globalCompositeOperation='screen';
  // Fine nested ribbons echo the living emitter in the listening visualizer.
  for(let j=0;j<12;j++){c.beginPath();for(let i=0;i<=90;i++){const a=i/90*Math.PI*2,r=12+j*.95+Math.sin(a*(3+variant)+j*.19)*2.8,x=64+Math.cos(a)*r,y=64+Math.sin(a)*r*(.55+variant*.08);if(i)c.lineTo(x,y);else c.moveTo(x,y);}c.strokeStyle=color+(j%3===0?'9a':'46');c.lineWidth=.65;c.stroke();}
  for(let i=0;i<85;i++){const a=hash(i+'a'+variant)*6.28,r=13+hash(i+'r'+variant)*30;c.fillStyle=color+(i%3?'88':'dc');c.beginPath();c.arc(64+Math.cos(a)*r,64+Math.sin(a)*r*.65,i%5?.45:.8,0,6.28);c.fill();}
  const core=c.createRadialGradient(63,63,0,64,64,8);core.addColorStop(0,'#fffffff0');core.addColorStop(.22,color+'ee');core.addColorStop(1,color+'00');c.fillStyle=core;c.fillRect(54,54,20,20);
  this.sprites.set(key,canvas);return canvas;
 }
 draw(pose){
  const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;const inset=this.viewport(),top=inset.top||0,vh=Math.max(150,h-top-(inset.bottom||0));
  c.setTransform(this.ratio,0,0,this.ratio,0,0);c.fillStyle='#060a13';c.fillRect(0,0,w,h);this.hits=[];
  const project=p=>{const v=projectPoint(p,pose,w,vh);if(v)v.y+=top;return v;};
  this.sky.draw(c,w,h,pose,top,vh);
  const skyPose={...pose,zoom:1,center:[0,0,0]};
  for(const star of this.dust){const p=projectPoint(star.point,skyPose,w,vh);if(!p||p.depth<1300)continue;p.y+=top;if(p.x<0||p.x>w||p.y<0||p.y>h)continue;c.globalAlpha=.35+Math.sin(this.time*.35+star.phase)*.12;c.fillStyle='#c9d8f2';c.fillRect(p.x,p.y,star.size,star.size);}c.globalAlpha=1;
  const shown=this.data.points.filter(p=>this.visible.has(p.id)),projected=new Map();
  for(const n of shown){const p=project(flowingPosition(n,this.time));if(p&&p.x>-60&&p.y>-60&&p.x<w+60&&p.y<h+60)projected.set(n.id,{...p,node:n,radius:Math.max(1.8,Math.min(16,6*p.scale))});}
  for(const g of this.data.groups){const p=project(g.position);if(!p)continue;const r=Math.min(650,250*p.scale);if(p.x<-r||p.x>w+r||p.y<-r||p.y>h+r)continue;const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(1,r));glow.addColorStop(0,g.color+'17');glow.addColorStop(.45,g.color+'09');glow.addColorStop(1,g.color+'00');c.fillStyle=glow;c.fillRect(p.x-r,p.y-r,r*2,r*2);}
  const line=([a,b,type],strong=false)=>{const p=projected.get(a),q=projected.get(b);if(!p||!q)return;c.strokeStyle=type==='artist'?'#f5ecffd0':type==='route'?'#ffe0a9b8':strong?'#b7d7eb90':p.node.region.color+'18';c.lineWidth=strong?1.15:.6;c.setLineDash(type==='sound'?[3,6]:[]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);};
  for(const link of this.data.links.slice(0,700))line(link);for(const link of this.selectedLinks||[])line(link,true);for(let i=1;i<this.route.length;i++)line([this.route[i-1],this.route[i],'route'],true);
  const linked=new Set((this.selectedLinks||[]).map(l=>l[1])),ordered=[...projected.values()].sort((a,b)=>b.depth-a.depth);
  for(const p of ordered){const {node:n,x,y,radius:r}=p,special=n.id===this.selected||n.id===this.current||n.id===this.hover,dim=this.selected&&!special&&!linked.has(n.id);
   c.globalAlpha=dim?.45:Math.max(.55,Math.min(1,900/p.depth));const size=r*7.8,sprite=this.sprite(n.region.color,n.signature.count%3);
   if(special||r>4){c.save();c.translate(x,y);c.rotate(n.signature.tilt+this.time*.045);c.drawImage(sprite,-size/2,-size/2,size,size);c.restore();}else c.drawImage(sprite,x-size/2,y-size/2,size,size);
   // Each artist keeps the same satellite count, inclination and orbit style
   // across songs. At distant LOD these become a tiny, quiet halo.
   if(special||r>3.3&&!dim){const s=n.signature,orbit=r*(special?2.6:2),count=s.count;c.fillStyle=n.region.color;for(let i=0;i<count;i++){const a=s.phase+i/count*Math.PI*2+this.time*.28,px=Math.cos(a)*orbit,py=Math.sin(a)*orbit*(s.style==='halo'?.45:.8);const xx=x+px*Math.cos(s.tilt)-py*Math.sin(s.tilt),yy=y+px*Math.sin(s.tilt)+py*Math.cos(s.tilt);c.beginPath();c.arc(xx,yy,special?1.5:1,0,Math.PI*2);c.fill();}}
   if(special){c.strokeStyle=n.id===this.current?'#ffffffc0':n.region.color+'a0';c.lineWidth=1;c.beginPath();c.ellipse(x,y,r*2.1,r*.85,-.45,0,Math.PI*2);c.stroke();}c.globalAlpha=1;this.hits.push(p);
  }
  // Screen-space labels have collision avoidance, unlike the depth-sorted stars.
  const boxes=[];const label=(text,x,y,color,size=11)=>{c.font=`${size}px system-ui`;const tw=Math.min(w-32,c.measureText(text).width+18),xx=Math.max(16,Math.min(w-tw-16,x-tw/2)),yy=Math.max(top+10,Math.min(h-(inset.bottom||0)-24,y));if(boxes.some(b=>xx<b[0]+b[2]&&xx+tw>b[0]&&yy<b[1]+22&&yy+22>b[1]))return;boxes.push([xx,yy,tw]);c.fillStyle='#070c16dd';c.fillRect(xx,yy,tw,22);c.fillStyle=color;c.textAlign='center';c.fillText(text,xx+tw/2,yy+15,tw-12);};
  for(const id of new Set([this.hover,this.selected,this.current])){const p=projected.get(id);if(p)label(p.node.title.slice(0,42),p.x,p.y+p.radius*3+8,'#f2efff',12);}
  if(pose.zoom<1.9)for(const g of this.data.groups){if(!shown.some(n=>n.region.id===g.id))continue;const p=project(g.position);if(p&&p.x>0&&p.x<w&&p.y>top&&p.y<h-(inset.bottom||0))label(g.name.toUpperCase(),p.x,p.y-55*p.scale,g.color,9);}
 }
 bind(){const canvas=this.canvas,point=e=>{const r=canvas.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};};
  const pan=(dx,dy)=>{const v=this.viewport?.()||{};this.camera.pan(dx,dy,this.width||800,Math.max(150,(this.height||600)-(v.top||0)-(v.bottom||0)));};
  canvas.oncontextmenu=e=>{e.preventDefault();e.stopPropagation();};
  canvas.onpointerdown=e=>{if(![0,1,2].includes(e.button))return;e.stopPropagation();canvas.setPointerCapture(e.pointerId);const p=point(e);if(!this.pointers.size){this.origin=p;this.dragged=false;this.panning=e.button!==0||e.shiftKey;this.secondary=e.button!==0;}this.pointers.set(e.pointerId,p);canvas.style.cursor='grabbing';if(this.pointers.size>1){this.dragged=true;const [a,b]=[...this.pointers.values()];this.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.camera.zoom,x:(a.x+b.x)/2,y:(a.y+b.y)/2};}};
  canvas.onpointermove=e=>{const p=point(e),old=this.pointers.get(e.pointerId);if(!old){const hit=pickSphere(this.hits,p.x,p.y);if(this.hover!==(hit?.node.id||'')){this.hover=hit?.node.id||'';canvas.style.cursor=this.hover?'pointer':'grab';this.onHover?.(hit?.node);}return;}e.stopPropagation();this.pointers.set(e.pointerId,p);
   if(this.pointers.size>1&&this.pinch){const [a,b]=[...this.pointers.values()],x=(a.x+b.x)/2,y=(a.y+b.y)/2;pan(x-this.pinch.x,y-this.pinch.y);this.pinch.x=x;this.pinch.y=y;this.camera.scale(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,this.pinch.d));}
   else if(this.dragged||Math.hypot(p.x-this.origin.x,p.y-this.origin.y)>7){this.dragged=true;if(this.panning)pan(p.x-old.x,p.y-old.y);else this.camera.drag(p.x-old.x,p.y-old.y);} };
  canvas.onpointerup=e=>{e.stopPropagation();const p=point(e);if(this.pointers.has(e.pointerId)&&!this.dragged&&!this.pinch&&!this.secondary){const hit=pickSphere(this.hits,p.x,p.y,e.pointerType==='touch');if(hit)this.onSelect?.(hit.node.id);else this.onEmpty?.();}this.pointers.delete(e.pointerId);if(!this.pointers.size){this.pinch=null;canvas.style.cursor='grab';}};
  const cancel=()=>{this.pointers.clear();this.pinch=null;this.dragged=true;};canvas.onpointercancel=cancel;canvas.onlostpointercapture=e=>{if(this.pointers.has(e.pointerId))cancel();};this.blur=cancel;window.addEventListener('blur',cancel);
  canvas.onpointerleave=()=>{this.hover='';this.onHover?.(null);};canvas.onwheel=e=>{e.preventDefault();e.stopPropagation();this.camera.scale(this.camera.zoom*Math.exp(-e.deltaY*.0015));};
  canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')this.home();else if(['+','=','-'].includes(e.key))this.camera.scale(this.camera.zoom*(e.key==='-'?.8:1.25));else{const dx=e.key==='ArrowLeft'?-30:e.key==='ArrowRight'?30:0,dy=e.key==='ArrowUp'?-30:e.key==='ArrowDown'?30:0;if(e.shiftKey)pan(dx,dy);else this.camera.drag(dx,dy);}}if(e.key==='Enter'&&this.selected){e.preventDefault();this.onSelect?.(this.selected);}};
 }
 dispose(){this.active=false;cancelAnimationFrame(this.frame);this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.blur);this.pointers.clear();this.sprites.clear();this.sky.dispose();this.canvas.width=this.canvas.height=1;}
}
