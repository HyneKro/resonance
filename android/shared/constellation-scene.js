import {StarAtmosphere,drawJourneyThread,drawStarFlare} from './constellation-effects.js';
import {hash} from './constellation-model.js';
import {buildSpace,connections,OrbitCamera,createProjector,pickSphere,flowingPosition,sameArtistIds,placeMapLabels,projectSegment} from './constellation-space.js';
import {ConstellationSky,backdropStars} from './constellation-sky.js';

/** Perspective-projected 3D spheres with a bounded, on-screen-only canvas loop.
 * The lightweight sky context is disposed together with this view. */
export class ConstellationScene {
 constructor(canvas,{gestureRoot=canvas,onSelect,onHover,onEmpty,onHome,onGroups,viewport=()=>({top:0,bottom:0})}){
  this.canvas=canvas;this.gestureRoot=gestureRoot;this.ctx=canvas.getContext('2d',{alpha:true});this.onSelect=onSelect;this.onHover=onHover;this.onEmpty=onEmpty;this.onHome=onHome;this.onGroups=onGroups;this.focusedGroup='';this.focusMix=0;this.viewport=()=>{const now=performance.now();if(!this.insets||now-this.insetTime>180){this.insets=viewport();this.insetTime=now;}return this.insets;};
  this.camera=new OrbitCamera();this.data={points:[],groups:[],links:[]};this.visible=new Set();this.selected='';this.current='';this.hover='';this.route=[];this.hits=[];this.sprites=new Map();this.pointers=new Map();this.active=true;this.frame=0;this.last=0;this.time=0;
  this.coarse=matchMedia('(pointer:coarse)').matches||innerWidth<750;this.reduced=matchMedia('(prefers-reduced-motion:reduce)');
  this.sky=new ConstellationSky(this.coarse);this.sky.mount(canvas);
  this.dust=backdropStars(this.coarse);this.atmosphere=new StarAtmosphere(this.coarse);
  this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(canvas);this.bind();this.resize();this.tick=this.tick.bind(this);this.visibility=()=>{if(document.hidden){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;}else this.wake();};document.addEventListener('visibilitychange',this.visibility);this.wake();
 }
 setData(nodes,positions){this.data=buildSpace(nodes,positions);this.byId=new Map(this.data.points.map(p=>[p.id,p]));this.visible=new Set(nodes.map(n=>n.id));this.selectedLinks=null;this.setSelection(this.selected);}
 setSelection(id){if(this.selected===id&&this.selectedLinks)return;this.selected=id;if(id)this.focusedGroup='';this.selectedLinks=connections(this.data.points,id);this.artistPeers=sameArtistIds(this.data.points,id);}
 focus(id,zoom){const p=this.byId?.get(id);if(p)this.camera.focus(flowingPosition(p,this.time),zoom);}
 fit(points,reset=false){
  if(!points.length)return;if(reset)this.camera.home();
  const center=[0,1,2].map(i=>(Math.min(...points.map(p=>p[i]))+Math.max(...points.map(p=>p[i])))/2),inset=this.viewport(),w=this.width-(inset.right||0),h=Math.max(150,this.height-(inset.top||0)-(inset.bottom||0)),f=Math.min(w,h*1.55)*1.12;
  const yaw=reset?0:this.camera.yaw,pitch=reset?0:this.camera.pitch,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  let distance=260;for(const p of points){const [x,y,z]=p.map((v,i)=>v-center[i]),xx=x*cy-z*sy,zz=x*sy+z*cy,yy=y*cp-zz*sp,depth=y*sp+zz*cp;distance=Math.max(distance,Math.max((Math.abs(xx)+55)*f/(w*.39),(Math.abs(yy)+55)*f/(h*.34))-depth);}
  this.camera.focus(center,1250/distance);
 }
 focusGroup(id){const group=[...this.data.groups,...this.data.artistGroups].find(g=>g.id===id);if(!group)return;this.focusedGroup=id;this.setSelection('');this.fit(group.ids.filter(id=>this.visible.has(id)).map(id=>this.byId.get(id).position));return group;}
 home(){this.focusedGroup='';this.fit(this.data.points.filter(p=>this.visible.has(p.id)).map(p=>p.position),true);}
 resize(){this.insets=null;const r=this.canvas.getBoundingClientRect();this.width=r.width;this.height=r.height;this.ratio=Math.min(devicePixelRatio||1,this.coarse?1.5:2);this.canvas.width=Math.round(r.width*this.ratio);this.canvas.height=Math.round(r.height*this.ratio);}
 wake(){if(!this.active||document.hidden||this.frame)return;this.frame=requestAnimationFrame(this.tick);}
 tick(now){this.frame=0;if(!this.active||document.hidden)return;const interval=this.reduced.matches?100:this.coarse?1000/30:1000/60;if(now-this.last>=interval-.5){const dt=Math.min(.05,(now-this.last)/1000||.016);this.last=now;if(!this.reduced.matches)this.time+=dt;this.focusMix+=(Number(!!this.selected)-this.focusMix)*(this.reduced.matches?1:1-Math.exp(-dt*3));this.draw(this.camera.update(dt,this.reduced.matches));}this.wake();}
 sprite(color,type=0,variant=0){
  const key=color+':'+type+':'+variant;if(this.sprites.has(key))return this.sprites.get(key);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
  const glow=c.createRadialGradient(64,64,0,64,64,62);glow.addColorStop(0,color+'88');glow.addColorStop(.24,color+'26');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(0,0,128,128);c.globalCompositeOperation='screen';
  const core=(x,y,r)=>{const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'#ffffff');g.addColorStop(.12,color+'f0');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);};
  for(let j=0;j<8;j++){c.beginPath();for(let i=0;i<=100;i++){const a=i/100*Math.PI*2,r=13+j*1.6;let x,y;
   if(type===0){const q=r+Math.sin(a*(3+variant)+j*.2)*3;x=Math.cos(a)*q;y=Math.sin(a)*q*.7;}
   else if(type===1){x=Math.cos(a)*r*1.35;y=Math.sin(a*2)*r*.44;}
   else if(type===2){x=Math.cos(a)*r*1.55;y=Math.sin(a)*r*.33;}
   else if(type===3){const q=r*(.35+i/100);x=Math.cos(a*2+j*.7)*q;y=Math.sin(a*2+j*.7)*q;}
   else if(type===4){const q=r/(Math.abs(Math.cos(a))+Math.abs(Math.sin(a)));x=Math.cos(a)*q;y=Math.sin(a)*q*1.3;}
   else if(type===5){const q=r*(.65+.35*Math.cos(a*(4+variant)));x=Math.cos(a)*q;y=Math.sin(a)*q;}
   else if(type===6){x=Math.cos(a)*r*.45;y=Math.sin(a)*r;}
   else{x=Math.cos(a)*r+(1-Math.cos(a))*j*1.8;y=Math.sin(a)*r*.35;}
   if(i)c.lineTo(64+x,64+y);else c.moveTo(64+x,64+y);
  }c.strokeStyle=color+(j%2?'80':'c0');c.lineWidth=.6;c.stroke();}
  for(let i=0;i<45;i++){const a=hash(i+'a'+type)*6.28,r=12+hash(i+'r'+variant)*27;c.fillStyle=color+(i%3?'90':'e0');c.fillRect(64+Math.cos(a)*r,64+Math.sin(a)*r*(type===2?.3:.8),.8,.8);}
  if(type===1){core(48,64,9);core(80,64,7);}else{core(64,64,type===4?6:9);if(type===6){c.strokeStyle=color+'b0';c.lineWidth=.7;c.beginPath();c.moveTo(64,14);c.lineTo(64,114);c.stroke();}}
  this.sprites.set(key,canvas);return canvas;
 }
 draw(pose){
  const c=this.ctx,w=this.width,h=this.height;if(!w||!h)return;const inset=this.viewport(),top=inset.top||0,vh=Math.max(150,h-top-(inset.bottom||0));
  c.setTransform(this.ratio,0,0,this.ratio,0,0);c.clearRect(0,0,w,h);this.hits=[];
  const sceneWidth=w-(inset.right||0)*.65,project=createProjector(pose,sceneWidth,vh,top);
  this.sky.draw(c,w,h,pose,top,vh,this.focusMix);
  // One path per depth layer instead of a paint operation for every star.
  for(let layer=0;layer<3;layer++){c.beginPath();c.globalAlpha=.38+layer*.13;c.fillStyle=layer===2?'#eee8ff':'#b9ccec';for(const star of this.dust){if(star.layer!==layer)continue;const p=project(star.point);if(!p||p.x<0||p.x>w||p.y<0||p.y>h)continue;const r=Math.max(.35,Math.min(2.8,star.size*(.55+p.scale*3)));c.moveTo(p.x+r,p.y);c.arc(p.x,p.y,r,0,Math.PI*2);}c.fill();}c.globalAlpha=1;
  this.atmosphere.drawClouds(c,this.data.groups,project,this.time,w,h);
  const routeSet=new Set(this.route);
  const shown=this.data.points.filter(p=>this.visible.has(p.id)),projected=new Map();
  for(const n of shown){const p=project(flowingPosition(n,this.time));if(p&&p.x>-60&&p.y>-60&&p.x<w+60&&p.y<h+60)projected.set(n.id,{...p,node:n,radius:Math.max(1.1,Math.min(13,4.5*p.scale))});}
  for(const g of this.data.groups){const p=project(g.position);if(!p)continue;const r=Math.min(650,250*p.scale);if(p.x<-r||p.x>w+r||p.y<-r||p.y>h+r)continue;const glow=c.createRadialGradient(p.x,p.y,0,p.x,p.y,Math.max(1,r));glow.addColorStop(0,g.color+'17');glow.addColorStop(.45,g.color+'09');glow.addColorStop(1,g.color+'00');c.fillStyle=glow;c.fillRect(p.x-r,p.y-r,r*2,r*2);}
  const line=([a,b,type],strong=false)=>{const p=projected.get(a),q=projected.get(b);if(!p||!q)return;c.strokeStyle=type==='artist'?'#f5ecffff':type==='route'?'#ffe0a9b8':strong?'#b7d7eb90':p.node.region.color+'18';c.lineWidth=type==='artist'?1.6:strong?.8:.6;c.setLineDash(type==='sound'?[3,6]:[]);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();c.setLineDash([]);};
  for(const link of this.data.links.slice(0,700))line(link);for(const link of this.selectedLinks||[])line(link,true);for(let i=1;i<this.route.length;i++){const a=this.byId.get(this.route[i-1]),b=this.byId.get(this.route[i]);if(!a||!b)continue;const segment=projectSegment(flowingPosition(a,this.time),flowingPosition(b,this.time),pose,sceneWidth,vh);if(segment){segment.a.y+=top;segment.b.y+=top;drawJourneyThread(c,segment,this.time,i,this.reduced.matches);}}
  const linked=this.artistPeers||new Set(),groupArtist=this.focusedGroup.startsWith('artist:')?new Set(this.data.artistGroups.find(g=>g.id===this.focusedGroup)?.ids):null,ordered=[...projected.values()].sort((a,b)=>b.depth-a.depth);
  for(const p of ordered){const {node:n,x,y,radius:r}=p,special=n.id===this.selected||n.id===this.current||n.id===this.hover||routeSet.has(n.id),peer=linked.has(n.id)||groupArtist?.has(n.id),dim=(this.selected||groupArtist)&&!special&&!peer;
   c.globalAlpha=dim?.17:peer||special?1:Math.max(.65,Math.min(1,1500/p.depth));const size=r*(special?7:peer?5.8:4.4),sprite=this.sprite(n.region.color,n.appearance.type,this.coarse?0:n.appearance.variant);
   if(special||r>4){c.save();c.translate(x,y);c.rotate(n.appearance.tilt+this.time*n.appearance.rate);c.drawImage(sprite,-size/2,-size/2,size,size);c.restore();}else c.drawImage(sprite,x-size/2,y-size/2,size,size);
   // Each artist keeps the same satellite count, inclination and orbit style
   // across songs. At distant LOD these become a tiny, quiet halo.
   if(special||r>2.8&&!dim){const opacity=c.globalAlpha;c.globalAlpha*=special?1:Math.min(1,(r-2.8)/1.8);const s=n.signature,orbit=r*(special?2.6:2),count=s.count;c.fillStyle=n.region.color;for(let i=0;i<count;i++){const a=s.phase+i/count*Math.PI*2+this.time*.28,px=Math.cos(a)*orbit,py=Math.sin(a)*orbit*(s.style==='halo'?.45:.8);const xx=x+px*Math.cos(s.tilt)-py*Math.sin(s.tilt),yy=y+px*Math.sin(s.tilt)+py*Math.cos(s.tilt);c.beginPath();c.arc(xx,yy,special?1.5:1,0,Math.PI*2);c.fill();}c.globalAlpha=opacity;}
   if(special||peer){c.strokeStyle=n.id===this.current?'#ffffffc0':n.region.color+'a0';c.lineWidth=1;c.beginPath();c.ellipse(x,y,r*2.1,r*.85,-.45,0,Math.PI*2);c.stroke();}c.globalAlpha=1;if(routeSet.has(n.id)||n.id===this.current)drawStarFlare(c,x,y,r,n.region.color,this.time,n.signature.phase);this.hits.push(p);
  }
  this.atmosphere.drawComets(c,project,this.time,this.reduced.matches);
  // Captions and cluster labels share one collision grid and stay outside chrome.
  const bounds={x:18,y:top,width:Math.max(0,w-(inset.right||0)-36),height:Math.max(0,h-top-(inset.bottom||0))},boxes=[];
  for(const id of new Set([this.hover,this.selected,this.current])){
   const p=projected.get(id);if(!p||p.x<bounds.x||p.x>bounds.x+bounds.width||p.y<top||p.y>top+bounds.height)continue;
   c.font='11px system-ui';const text=p.node.title.slice(0,38),width=Math.min(240,c.measureText(text).width+20),placed=placeMapLabels([{x:p.x,y:p.y+p.radius*3+7,width,height:26}],bounds,boxes,1)[0];
   if(!placed)continue;boxes.push(placed);c.fillStyle='#111727ed';c.beginPath();c.roundRect(placed.x,placed.y,placed.width,placed.height,13);c.fill();c.strokeStyle=p.node.region.color+'88';c.lineWidth=.7;c.stroke();c.fillStyle='#e6dff3';c.textAlign='center';c.fillText(text,placed.x+placed.width/2,placed.y+17,placed.width-14);
  }
  const focused=this.data.groups.find(g=>g.id===this.focusedGroup),memberSet=focused?new Set(focused.ids):null;
  const overview=!this.focusedGroup&&!this.selected,compact=w<750||this.coarse;
  const groups=overview?this.data.groups:this.data.artistGroups.filter(g=>this.selected?g.ids.some(id=>linked.has(id)):g.id===this.focusedGroup||memberSet&&g.ids.some(id=>memberSet.has(id)));
  const candidates=[];
  for(const g of [...groups].sort((a,b)=>b.count-a.count)){
   if(!g.ids.some(id=>this.visible.has(id)))continue;const p=project(g.position);if(!p||p.x<bounds.x||p.x>bounds.x+bounds.width||p.y<top||p.y>top+bounds.height)continue;
   candidates.push({...g,x:p.x,y:p.y-37,width:Math.min(compact?156:205,38+g.name.length*(compact?5.5:6.2)),height:32,anchor:p});
  }
  const markers=placeMapLabels(candidates,bounds,boxes,compact?4:8);
  for(const m of markers)if(Math.hypot(m.x+m.width/2-m.anchor.x,m.y+16-m.anchor.y)>32){c.strokeStyle=m.color+'50';c.lineWidth=.6;c.beginPath();c.moveTo(m.anchor.x,m.anchor.y);c.lineTo(m.x+m.width/2,m.y+16);c.stroke();}
  if(!this.groupsAt||performance.now()-this.groupsAt>32){this.groupsAt=performance.now();this.onGroups?.(markers);}

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
  this.gestureAbort=new AbortController();const signal=this.gestureAbort.signal;
  this.gestureRoot.addEventListener('pointerdown',e=>{if(e.target!==canvas&&e.button===2&&!e.target.closest('input,select,textarea')){e.preventDefault();canvas.onpointerdown(e);}},{capture:true,signal});
  this.gestureRoot.addEventListener('contextmenu',e=>{if(!e.target.closest('input,select,textarea')){e.preventDefault();e.stopPropagation();}},{capture:true,signal});
  this.gestureRoot.addEventListener('wheel',e=>{if(e.target!==canvas&&e.target.closest('.cx-groups'))canvas.onwheel(e);},{capture:true,passive:false,signal});
  canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','=','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='Home'){if(this.onHome)this.onHome();else this.home();}else if(['+','=','-'].includes(e.key))this.camera.scale(this.camera.zoom*(e.key==='-'?.8:1.25));else{const dx=e.key==='ArrowLeft'?-30:e.key==='ArrowRight'?30:0,dy=e.key==='ArrowUp'?-30:e.key==='ArrowDown'?30:0;if(e.shiftKey)pan(dx,dy);else this.camera.drag(dx,dy);}}if(e.key==='Enter'&&this.selected){e.preventDefault();this.onSelect?.(this.selected);}};
 }
 dispose(){this.gestureAbort?.abort();this.atmosphere.dispose();this.active=false;cancelAnimationFrame(this.frame);this.observer.disconnect();document.removeEventListener('visibilitychange',this.visibility);window.removeEventListener('blur',this.blur);this.pointers.clear();this.sprites.clear();this.sky.dispose();this.canvas.width=this.canvas.height=1;}
}
