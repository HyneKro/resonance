// A procedural celestial sphere: no downloads, image licences or extra GPU
// context. Its texture is made once, and reprojection is cached while at rest.
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
  this.coarse=coarse;this.w=coarse?768:1024;this.h=this.w/2;this.ready=false;this.disposed=false;this.texture=new Uint8ClampedArray(this.w*this.h*3);
  // Tilt the galactic plane so the initial view opens on a diagonal dust river.
  let row=0;const bake=()=>{if(this.disposed)return;const until=Math.min(this.h,row+10);for(let y=row;y<until;y++)for(let x=0;x<this.w;x++){
   const a=x/this.w*TAU,b=(y/this.h-.5)*Math.PI,xx=Math.cos(b)*Math.sin(a),yy=Math.sin(b),zz=Math.cos(b)*Math.cos(a);
   const n=noise(xx*4+7,yy*4+2,zz*4+5),fine=noise(xx*19+7,yy*19+2,zz*19+5),filament=noise(xx*46+7,yy*46+2,zz*46+5);
   const latitude=yy*.85+xx*.48+zz*.18,band=Math.exp(-Math.pow((latitude+(n-.5)*.14)/.14,2)),halo=Math.exp(-Math.pow(latitude/.35,2));
   const dust=Math.pow(Math.max(0,n*.65+fine*.35-.29),1.3),lane=1-.82*Math.exp(-Math.pow((latitude+(n-.5)*.22)/.028,2));
   const lace=noise(xx*115+7,yy*115+2,zz*115+5),light=band*dust*lane,grain=.35+Math.pow(filament,2)*1.8+lace*.5,core=Math.exp(-((xx-.25)**2+(zz-.85)**2)*2);
   const at=(y*this.w+x)*3;
   this.texture[at]=3+halo*3+light*(145+core*45)*grain;
   this.texture[at+1]=5+halo*4+light*(122+core*32)*grain;
   this.texture[at+2]=12+halo*7+light*190*grain;
  }row=until;if(row<this.h)this.timer=setTimeout(bake,0);else{this.ready=true;this.stamp='';}};this.timer=setTimeout(bake,0);
  this.blur=document.createElement('canvas');this.blurCtx=this.blur.getContext('2d');
  this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d',{alpha:false});this.stamp='';
 }
 draw(ctx,width,height,pose,top,viewHeight,focus=0){
  if(!this.ready){const g=ctx.createLinearGradient(0,0,width,height);g.addColorStop(0,'#050813');g.addColorStop(.5,'#15172b');g.addColorStop(1,'#050b13');ctx.fillStyle=g;ctx.fillRect(0,0,width,height);return;}
  const yaw=pose.yaw,pitch=pose.pitch,now=performance.now();if(!this.lastPose||Math.abs(yaw-this.lastPose[0])+Math.abs(pitch-this.lastPose[1])>.0003)this.movedAt=now;this.lastPose=[yaw,pitch];
  const moving=now-(this.movedAt||0)<160,w=moving?(this.coarse?224:352):(this.coarse?512:896),h=Math.min(820,Math.max(100,Math.round(w*height/width)));
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
   this.blur.width=w;this.blur.height=h;this.blurCtx.filter='blur(4px)';this.blurCtx.drawImage(this.canvas,0,0);
  }
  ctx.drawImage(this.canvas,0,0,width,height);if(focus>.001){ctx.globalAlpha=focus*.92;ctx.drawImage(this.blur,0,0,width,height);ctx.globalAlpha=1;}
 }
 dispose(){this.disposed=true;clearTimeout(this.timer);this.texture=null;this.canvas.width=this.canvas.height=this.blur.width=this.blur.height=1;}
}
