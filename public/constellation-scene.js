import {hash} from './constellation-model.js';
import {buildSpace,connections,OrbitCamera,projectPoint,pickSphere} from './constellation-space.js';

/** Perspective-projected 3D spheres with a bounded, on-screen-only canvas loop.
 * No second WebGL context, audio decoder or background worker is needed. */
export class ConstellationScene {
 constructor(canvas,{onSelect,onHover,viewport=()=>({top:0,bottom:0})}){
  this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.onSelect=onSelect;this.onHover=onHover;this.viewport=viewport;
  this.camera=new OrbitCamera();this.data={points:[],groups:[],links:[]};this.visible=new Set();this.selected='';this.current='';this.hover='';this.route=[];this.hits=[];this.sprites=new Map();this.pointers=new Map();this.active=true;this.frame=0;this.last=0;this.time=0;
  this.coarse=matchMedia('(pointer:coarse)').matches||innerWidth<750;this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.bind();this.resize();this.tick=this.tick.bind(this);this.visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}else this.wake();};document.addEventListener('visibilitychange',this.visibility);this.wake();
 }
 setData(nodes,positions){this.data=buildSpace(nodes,positions);this.byId=new Map(this.data.points.map(p=>[p.id,p]));this.visible=new Set(nodes.map(n=>n.id));this.setSelection(this.selected);}
 setSelection(id){this.selected=id;this.selectedLinks=connections(this.data.points,id);}
 focus(id,zoom){const p=this.byId?.get(id);if(p)this.camera.focus(p.position,zoom);}
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
 sprite(color){if(this.sprites.has(color))return this.sprites.get(color);const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');let g=ctx.createRadialGradient(48,48,1,48,48,47);g.addColorStop(0,color+'a0');g.addColorStop(.2,color+'55');g.addColorStop(1,color+'00');ctx.fillStyle=g;ctx.fillRect(0,0,96,96);g=ctx.createRadialGradient(44,43,0,48,48,13);g.addColorStop(0,'#fff7ff');g.addColorStop(.25,color);g.addColorStop(.8,color+'c9');g.addColorStop(1,color+'50');ctx.fillStyle=g;ctx.beginPath();ctx.arc(48,48,13,0,Math.PI*2);ctx.fill();this.sprites.set(color,c);return c;}
 draw(pose){
  const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;const inset=this.viewport(),top=inset.top||0,vh=Math.max(150,h-top-(inset.bottom||0));
  c.setTransform(this.ratio,0,0,this.ratio,0,0);c.fillStyle='#060a13';c.fillRect(0,0,w,h);this.hits=[];
  const project=p=>{const v=projectPoint(p,pose,w,vh);if(v)v.y+=top;return v;};
  // Distant dust stays behind the actual 3D library; its parallax is subtle.
  for(let i=0;i<180;i++){const x=((hash(i+'dustx')*w-pose.yaw*8)%w+w)%w,y=((hash(i+'dusty')*h-pose.pitch*5)%h+h)%h;c.fillStyle=i%5?'#aab6dc33':'#d9d9f56b';c.fillRect(x,y,i%5?1:1.5,i%5?1:1.5);}
  const shown=this.data.points.filter(p=>this.visible.has(p.id)),projected=new Map();
  for(const n of shown){const p=project(n.position);if(p&&p.x>-60&&p.y>-60&&p.x<w+60&&p.y<h+60)projected.set(n.id,{...p,node:n,radius:Math.max(1.8,Math.min(16,6*p.scale))});}
  for(const g of this.data.groups){const p=project(g.position);if(!p)continue;const r=Math.min(650,250*p.scale);if(p.x<-r||p.x>w+r||p.y<-r||p.y>h+r)continue;const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(1,r));glow.addColorStop(0,g.color+'17');glow.addColorStop(.45,g.color+'09');glow.addColorStop(1,g.color+'00');c.fillStyle=glow;c.fillRect(p.x-r,p.y-r,r*2,r*2);}
  const line=([a,b,type],strong=false)=>{const p=projected.get(a),q=projected.get(b);if(!p||!q)return;c.strokeStyle=type==='artist'?'#f5ecffd0':type==='route'?'#ffe0a9b8':strong?'#b7d7eb90':p.node.region.color+'18';c.lineWidth=strong?1.15:.6;c.setLineDash(type==='sound'?[3,6]:[]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);};
  for(const link of this.data.links.slice(0,700))line(link);for(const link of this.selectedLinks||[])line(link,true);for(let i=1;i<this.route.length;i++)line([this.route[i-1],this.route[i],'route'],true);
  const linked=new Set((this.selectedLinks||[]).map(l=>l[1])),ordered=[...projected.values()].sort((a,b)=>b.depth-a.depth);
  for(const p of ordered){const {node:n,x,y,radius:r}=p,special=n.id===this.selected||n.id===this.current||n.id===this.hover,dim=this.selected&&!special&&!linked.has(n.id);
   c.globalAlpha=dim?.5:Math.max(.45,Math.min(1,900/p.depth));const size=r*7.4;c.drawImage(this.sprite(n.region.color),x-size/2,y-size/2,size,size);
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
  canvas.onpointerdown=e=>{if(e.button!==0)return;e.stopPropagation();canvas.setPointerCapture(e.pointerId);const p=point(e);if(!this.pointers.size){this.origin=p;this.dragged=false;}this.pointers.set(e.pointerId,p);if(this.pointers.size>1){this.dragged=true;const [a,b]=[...this.pointers.values()];this.pinch={d:Math.hypot(a.x-b.x,a.y-b.y),zoom:this.camera.zoom};}};
  canvas.onpointermove=e=>{const p=point(e),old=this.pointers.get(e.pointerId);if(!old){const hit=pickSphere(this.hits,p.x,p.y);if(this.hover!==(hit?.node.id||'')){this.hover=hit?.node.id||'';canvas.style.cursor=this.hover?'pointer':'grab';this.onHover?.(hit?.node);}return;}e.stopPropagation();this.pointers.set(e.pointerId,p);
   if(this.pointers.size>1&&this.pinch){const [a,b]=[...this.pointers.values()];this.camera.scale(this.pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,this.pinch.d));}
   else if(this.dragged||Math.hypot(p.x-this.origin.x,p.y-this.origin.y)>7){this.dragged=true;this.camera.drag(p.x-old.x,p.y-old.y);} };
  canvas.onpointerup=e=>{e.stopPropagation();const p=point(e);if(!this.dragged&&!this.pinch){const hit=pickSphere(this.hits,p.x,p.y,e.pointerType==='touch');if(hit)this.onSelect?.(hit.node.id);}this.pointers.delete(e.pointerId);if(!this.pointers.size)this.pinch=null;};
  const cancel=()=>{this.pointers.clear();this.pinch=null;this.dragged=true;};canvas.onpointercancel=cancel;canvas.onlostpointercapture=e=>{if(this.pointers.has(e.pointerId))cancel();};this.blur=cancel;window.addEventListener('blur',cancel);
  canvas.onpointerleave=()=>{this.hover='';this.onHover?.(null);};canvas.onwheel=e=>{e.preventDefault();e.stopPropagation();this.camera.scale(this.camera.zoom*Math.exp(-e.deltaY*.0015));};
  canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home')this.home();else if(['+','=','-'].includes(e.key))this.camera.scale(this.camera.zoom*(e.key==='-'?.8:1.25));else this.camera.drag(e.key==='ArrowLeft'?-30:e.key==='ArrowRight'?30:0,e.key==='ArrowUp'?-30:e.key==='ArrowDown'?30:0);}if(e.key==='Enter'&&this.selected){e.preventDefault();this.onSelect?.(this.selected);}};
 }
 dispose(){this.active=false;cancelAnimationFrame(this.frame);this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.blur);this.pointers.clear();this.sprites.clear();this.canvas.width=this.canvas.height=1;}
}
