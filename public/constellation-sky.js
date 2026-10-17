// A baked celestial sphere, projected at display resolution. The lightweight
// texture shader avoids a low-resolution CPU projection while the camera moves.
import {hash} from './constellation-model.js';
import {projectPoint} from './constellation-space.js';
export function backdropStars(coarse=false){
 return [34000,13000,5200].flatMap((distance,layer)=>Array.from({length:(coarse?[440,250,110]:[850,500,220])[layer]},(_,i)=>{
  const key=`backdrop:${layer}:${i}`,a=hash(key+'az')*Math.PI*2,z=hash(key+'z')*2-1,r=Math.sqrt(1-z*z);
  return {point:[Math.cos(a)*r*distance,z*distance,Math.sin(a)*r*distance],layer,size:.45+layer*.24+hash(key+'size')*.5,phase:hash(key+'phase')*6.28};
 }));
}
export function projectBackdrop(star,pose,width,height){return projectPoint(star.point,{...pose,zoom:1},width,height);}
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
   const n=noise(xx*4+7,yy*4+2,zz*4+5),fine=noise(xx*19+7,yy*19+2,zz*19+5),filament=noise(xx*46+7,yy*46+2,zz*46+5);
   const latitude=yy*.85+xx*.48+zz*.18,band=Math.exp(-Math.pow((latitude+(n-.5)*.14)/.14,2)),halo=Math.exp(-Math.pow(latitude/.35,2));
   const dust=Math.pow(Math.max(0,n*.65+fine*.35-.29),1.3),lane=1-.82*Math.exp(-Math.pow((latitude+(n-.5)*.22)/.028,2));
   const lace=noise(xx*115+7,yy*115+2,zz*115+5),light=band*dust*lane,grain=.25+Math.pow(filament,2)*1.7+lace*.85,core=Math.exp(-((xx-.25)**2+(zz-.85)**2)*2);
   const at=(y*this.w+x)*3;
   const stellar=band*lane*Math.pow(fract(Math.sin(x*127.1+y*311.7)*43758.5453),50)*95;
   this.texture[at]=3+halo*3+light*(145+core*45)*grain+stellar;
   this.texture[at+1]=5+halo*4+light*(122+core*32)*grain+stellar;
   this.texture[at+2]=12+halo*7+light*190*grain+stellar;
  }row++;}while(row<this.h&&performance.now()-started<6);if(row<this.h)this.timer=setTimeout(bake,0);else{this.ready=true;this.stamp='';textureCache.set(this.w,this.texture);this.resolveReady();}};
  if(textureCache.has(this.w)){this.texture=textureCache.get(this.w);this.ready=true;this.resolveReady();}else this.timer=setTimeout(bake,0);
  this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});this.stamp='';
  this.gpuCanvas=document.createElement('canvas');this.gl=this.gpuCanvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,preserveDrawingBuffer:false});
  if(this.gl)try{this.initGPU();}catch{this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.gl=null;}
 }
 initGPU(){
  const gl=this.gl,compile=(kind,source)=>{const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw Error('Sky shader unavailable');}return s;};
  const vertex=compile(gl.VERTEX_SHADER,'attribute vec2 p;varying vec2 uv;void main(){uv=p*.5+.5;gl_Position=vec4(p,0.,1.);}');
  const fragment=compile(gl.FRAGMENT_SHADER,`precision highp float;varying vec2 uv;uniform sampler2D sky;uniform vec4 view;uniform vec2 angles;
void main(){float f=min(view.x,view.w*1.55)*1.12;vec3 r=normalize(vec3((uv.x*view.x-view.x*.5)/f,((1.-uv.y)*view.y-view.z-view.w*.5)/f,1.));float cy=cos(angles.x),sy=sin(angles.x),cp=cos(angles.y),sp=sin(angles.y);float b=r.y*cp+r.z*sp,c=-r.y*sp+r.z*cp;vec3 d=vec3(r.x*cy+c*sy,b,-r.x*sy+c*cy);vec2 st=vec2(fract(atan(d.x,d.z)/6.2831853),asin(clamp(d.y,-1.,1.))/3.14159265+.5);gl_FragColor=vec4(texture2D(sky,st).rgb*1.2,1.);}`);
  this.program=gl.createProgram();gl.attachShader(this.program,vertex);gl.attachShader(this.program,fragment);gl.linkProgram(this.program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Sky shader link unavailable');gl.useProgram(this.program);
  this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const p=gl.getAttribLocation(this.program,'p');gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,2,gl.FLOAT,false,0,0);
  this.uniformView=gl.getUniformLocation(this.program,'view');this.uniformAngles=gl.getUniformLocation(this.program,'angles');this.gpuTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.gpuTexture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 }
 draw(ctx,width,height,pose,top,viewHeight,focus=0){
  if(!this.ready){const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,'#050813');g.addColorStop(.5,'#15172b');g.addColorStop(1,'#050b13');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);return;}
  const gl=this.gl;
  if(gl&&!gl.isContextLost()){
   const ratio=Math.min(devicePixelRatio||1,this.coarse?1:1.5),w=Math.max(1,Math.round(width*ratio)),h=Math.max(1,Math.round(height*ratio));
   if(this.gpuCanvas.width!==w||this.gpuCanvas.height!==h){this.gpuCanvas.width=w;this.gpuCanvas.height=h;}
   if(!this.uploaded){gl.bindTexture(gl.TEXTURE_2D,this.gpuTexture);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,this.w,this.h,0,gl.RGB,gl.UNSIGNED_BYTE,this.texture);this.uploaded=true;}
   gl.viewport(0,0,w,h);gl.uniform4f(this.uniformView,width,height,top,viewHeight);gl.uniform2f(this.uniformAngles,pose.yaw,pose.pitch);gl.drawArrays(gl.TRIANGLES,0,6);ctx.drawImage(this.gpuCanvas,0,0,width,height);return;
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
    for(let channel=0;channel<3;channel++){const upper=this.texture[aa+channel]*(1-fx)+this.texture[bb+channel]*fx,lower=this.texture[cc+channel]*(1-fx)+this.texture[dd+channel]*fx;data[out+channel]=(upper*(1-fy)+lower*fy)*1.2;}data[out+3]=255;
   }
   this.ctx.putImageData(frame,0,0);
  }
  ctx.drawImage(this.canvas,0,0,width,height);
 }
 dispose(){this.disposed=true;clearTimeout(this.timer);this.resolveReady();this.texture=null;if(this.gl){this.gl.deleteTexture(this.gpuTexture);this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);this.gl.getExtension('WEBGL_lose_context')?.loseContext();this.gl=null;}this.canvas.width=this.canvas.height=this.gpuCanvas.width=this.gpuCanvas.height=1;}
}
