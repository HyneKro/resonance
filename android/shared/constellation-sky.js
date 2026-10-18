// A baked celestial sphere, projected at display resolution. The lightweight
// texture shader avoids a low-resolution CPU projection while the camera moves.
import {hash} from './constellation-model.js';
import {projectPoint} from './constellation-space.js';
import {skyTexture} from './constellation-sky-texture.js';
export function backdropStars(coarse=false){
 return Array.from({length:12},(_,depth)=>depth).flatMap(depth=>Array.from({length:coarse?65:130},(_,i)=>{
  const key=`volume:${depth}:${i}`,a=hash(key+'az')*Math.PI*2,z=hash(key+'z')*2-1,r=Math.sqrt(1-z*z);
  // Every point has its own distance, with a continuous logarithmic spread.
  // No surface/shell radius is shared; nearby dust gives real travel parallax.
  const distance=650*Math.pow(75,(depth+hash(key+'distance'))/12),layer=depth<4?2:depth<8?1:0;
  return {point:[Math.cos(a)*r*distance,z*distance,Math.sin(a)*r*distance],layer,size:.32+hash(key+'size')*.42,phase:hash(key+'phase')*6.28};
 }));
}
export function projectBackdrop(star,pose,width,height){return projectPoint(star.point,pose,width,height);}
const textureCache=new Map();
const TAU=Math.PI*2,fract=x=>x-Math.floor(x),smooth=x=>x*x*(3-2*x);
const noise=(x,y,z)=>{
 const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=smooth(fract(x)),fy=smooth(fract(y)),fz=smooth(fract(z));
 const h=(a,b,c)=>fract(Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453),mix=(a,b,t)=>a+(b-a)*t;
 return mix(mix(mix(h(ix,iy,iz),h(ix+1,iy,iz),fx),mix(h(ix,iy+1,iz),h(ix+1,iy+1,iz),fx),fy),mix(mix(h(ix,iy,iz+1),h(ix+1,iy,iz+1),fx),mix(h(ix,iy+1,iz+1),h(ix+1,iy+1,iz+1),fx),fy),fz);
};
export function skyDirection(x,y,yaw,pitch){
 const length=Math.hypot(x,y,1),xx=x/length,yy=y/length,zz=1/length;
 const cp=Math.cos(pitch),sp=Math.sin(pitch),cy=Math.cos(yaw),sy=Math.sin(yaw),b=yy*cp+zz*sp,c=-yy*sp+zz*cp;
 return [xx*cy+c*sy,b,-xx*sy+c*cy];
}
export class ConstellationSky {
 constructor(coarse){
  this.coarse=coarse;this.w=coarse?1024:2048;this.h=this.w/2;this.ready=false;this.disposed=false;this.texture=new Uint8ClampedArray(this.w*this.h*3);
  this.whenReady=new Promise(resolve=>{this.resolveReady=resolve;});
  // Tilt the galactic plane so the initial view opens on a diagonal dust river.
  let row=0;const bake=()=>{if(this.disposed)return;const started=performance.now();do{const y=row;for(let x=0;x<this.w;x++){
   const a=x/this.w*TAU,b=(y/this.h-.5)*Math.PI,xx=Math.cos(b)*Math.sin(a),yy=Math.sin(b),zz=Math.cos(b)*Math.cos(a);
   const wx=xx*2.3+(noise(xx*3+8,yy*3+2,zz*3+5)-.5)*1.3,wy=yy*2.3+(noise(xx*3+1,yy*3+9,zz*3+2)-.5)*1.3,wz=zz*2.3+(noise(xx*3+4,yy*3+1,zz*3+8)-.5)*1.3;
   const broad=noise(wx+4,wy+9,wz+1),fine=noise(wx*4+7,wy*4+2,wz*4+5),filament=noise(wx*13+7,wy*13+2,wz*13+5),lace=noise(wx*38+7,wy*38+2,wz*38+5);
   const field=broad*.56+fine*.27+filament*.12+lace*.05,latitude=yy*.75+xx*.52+zz*.2;
   const band=Math.exp(-Math.pow((latitude+(broad-.5)*.9)/.38,2)),hollow=Math.max(0,field-.45),rim=Math.exp(-Math.pow((field-.49)/.026,2));
   const light=band*(Math.pow(hollow*2.5,1.3)*.6+rim*.18)*(1.1+filament*.6),cloud=band*Math.max(0,field-.32)*.09;
   const warm=noise(xx*2+15,yy*2+9,zz*2+1),at=(y*this.w+x)*3;
   const stellar=band*Math.pow(fract(Math.sin(x*127.1+y*311.7)*43758.5453),90)*70;
   this.texture[at]=3+light*(84+warm*75)+cloud*35+stellar;
   this.texture[at+1]=5+light*(142-warm*24)+cloud*55+stellar;
   this.texture[at+2]=11+light*(187+warm*16)+cloud*85+stellar;

  }row++;}while(row<this.h&&performance.now()-started<6);if(row<this.h)this.timer=setTimeout(bake,0);else{this.ready=true;this.stamp='';textureCache.set(this.w,this.texture);this.resolveReady();}};
  if(skyTexture)this.loadPanorama(skyTexture).catch(()=>{if(!this.disposed)this.timer=setTimeout(bake,0);});
  else if(textureCache.has(this.w)){this.texture=textureCache.get(this.w);this.ready=true;this.resolveReady();}else this.timer=setTimeout(bake,0);
  this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});this.stamp='';
  this.gpuCanvas=document.createElement('canvas');this.gl=this.gpuCanvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
  if(this.gl)try{this.initGPU();}catch{this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.gl=null;}
 }
 async loadPanorama(source){
  const cached=textureCache.get(source);if(cached){Object.assign(this,cached);this.ready=true;this.resolveReady();return;}
  const image=new Image();image.src=source;await image.decode();if(this.disposed)return;
  const w=Math.min(image.naturalWidth,this.coarse?2048:4096,this.gl?.getParameter(this.gl.MAX_TEXTURE_SIZE)||4096),h=w/2;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h).data,texture=new Uint8ClampedArray(w*h*3);
  for(let row=0;row<h;row+=32){
   if(this.disposed)return;
   for(let p=row*w,end=Math.min(h,row+32)*w;p<end;p++){texture[p*3]=rgba[p*4];texture[p*3+1]=rgba[p*4+1];texture[p*3+2]=rgba[p*4+2];}
   await new Promise(resolve=>setTimeout(resolve,0));
  }
  canvas.width=canvas.height=1;if(this.disposed)return;
  const result={w,h,texture,art:true};textureCache.set(source,result);Object.assign(this,result);this.ready=true;this.resolveReady();
 }
 initGPU(){
  const gl=this.gl,compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Sky shader unavailable');}return s;};
  const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
  const fragment=compile(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D sky;uniform vec4 view;uniform vec2 angles;uniform float exposure;
void main(){float f=min(view.x,view.w*1.55)*1.12;vec3 r=normalize(vec3((uv.x*view.x-view.x*.5)/f,((1.-uv.y)*view.y-view.z-view.w*.5)/f,1.));float cy=cos(angles.x),sy=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);float b=r.y*cp+r.z*sp,c=-r.y*sp+r.z*cp;vec3 d=vec3(r.x*cy+c*sy,b,-r.x*sy+c*cy);vec2 st=vec2(fract(atan(d.x,d.z)/6.2831853),asin(clamp(d.y,-1.,1.))/3.14159265+.5);gl_FragColor=vec4(texture2D(sky,st).rgb*exposure,1.);}`);
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Sky shader link unavailable');gl.useProgram(this.program);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.uniformExposure=gl.getUniformLocation(this.program,'exposure');this.uniformView=gl.getUniformLocation(this.program,'view');this.uniformAngles=gl.getUniformLocation(this.program,'angles');this.gpuTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.gpuTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 mount(foreground){
  if(!this.gl)return;
  this.layered=true;this.gpuCanvas.className='cx-sky-layer';this.gpuCanvas.setAttribute('aria-hidden','true');
  Object.assign(this.gpuCanvas.style,{position:'absolute',inset:'0',width:'100%',height:'100%',pointerEvents:'none'});
  foreground.before(this.gpuCanvas);
 }
 draw(ctx,width,height,pose,top,viewHeight,focus=0){
  if(!this.ready){const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,'#050813');g.addColorStop(.5,'#15172b');g.addColorStop(1,'#050b13');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);return;}
  const gl=this.gl;pose={...pose,yaw:pose.yaw+(this.art?2.9:0)};
  if(gl&&!gl.isContextLost()){
   const ratio=Math.min(devicePixelRatio||1,this.coarse?1:1.5),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
   if(this.gpuCanvas.width!==w||this.gpuCanvas.height!==h){this.gpuCanvas.width=w;this.gpuCanvas.height=h;}
   if(!this.uploaded){gl.bindTexture(gl.TEXTURE_2D,this.gpuTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,this.w,this.h,0,gl.RGB,gl.UNSIGNED_BYTE,this.texture);this.uploaded=true;}
   gl.viewport(0,0,w,h);gl.uniform1f(this.uniformExposure,this.art?.48:1.2);gl.uniform4f(this.uniformView,width,height,top,viewHeight);gl.uniform2f(this.uniformAngles,pose.yaw,pose.pitch);gl.drawArrays(gl.TRIANGLES,0,6);if(!this.layered)ctx.drawImage(this.gpuCanvas,0,0,width,height);return;
  }
  const yaw=pose.yaw,pitch=pose.pitch,now=performance.now();if(!this.lastPose||Math.abs(yaw-this.lastPose[0])+Math.abs(pitch-this.lastPose[1])>.0003)this.movedAt=now;this.lastPose=[yaw,pitch];
  const moving=now-(this.movedAt||0)<160,w=moving?(this.coarse?352:640):(this.coarse?640:1280),h=Math.min(1000,Math.max(100,Math.round(w*height/width)));
  const stamp=[w,h,Math.round(yaw*2000),Math.round(pitch*2000),Math.round(top),Math.round(viewHeight)].join(':');
  if(stamp!==this.stamp){
   this.stamp=stamp;this.canvas.width=w;this.canvas.height=h;const frame=this.ctx.createImageData(w,h),data=frame.data;
   const f=Math.min(width,viewHeight*1.55)*1.12,cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const rx=(x/w*width-width/2)/f,ry=(y/h*height-top-viewHeight/2)/f,len=Math.hypot(rx,ry,1),xx=rx/len,yy=ry/len,zz=1/len;
    const b=yy*cp+zz*sp,c=-yy*sp+zz*cp,dx=xx*cy+c*sy,dz=-xx*sy+c*cy;
    const u=fract(Math.atan2(dx,dz)/TAU),v=Math.max(0,Math.min(.99999,Math.asin(Math.max(-1,Math.min(1,b)))/Math.PI+.5));
    const tx=u*this.w,ty=v*(this.h-1),ix=Math.floor(tx),iy=Math.floor(ty),fx=tx-ix,fy=ty-iy,out=(y*w+x)*4;
    const aa=(iy*this.w+ix)*3,bb=(iy*this.w+(ix+1)%this.w)*3,cc=(Math.min(this.h-1,iy+1)*this.w+ix)*3,dd=(Math.min(this.h-1,iy+1)*this.w+(ix+1)%this.w)*3;
    for(let channel=0;channel<3;channel++){const upper=this.texture[aa+channel]*(1-fx)+this.texture[bb+channel]*fx,lower=this.texture[cc+channel]*(1-fx)+this.texture[dd+channel]*fx;data[out+channel]=(upper*(1-fy)+lower*fy)*(this.art?.48:1.2);}data[out+3]=255;
   }
   this.ctx.putImageData(frame,0,0);
  }
  ctx.drawImage(this.canvas,0,0,width,height);
 }
 dispose(){this.gpuCanvas.remove();this.disposed=true;clearTimeout(this.timer);this.resolveReady();this.texture=null;if(this.gl){this.gl.deleteTexture(this.gpuTexture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.gl=null;}this.canvas.width=this.canvas.height=this.gpuCanvas.width=this.gpuCanvas.height=1;}
}
