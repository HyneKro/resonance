import {hash} from './constellation-model.js';

// Small, reusable cloud sprites. Their anchors live in world space; neither
// camera travel nor long listening sessions accumulate motion into the map.
export class StarAtmosphere{
 constructor(coarse=false){this.coarse=coarse;this.sprites=new Map();}
 cloud(color){
  if(this.sprites.has(color))return this.sprites.get(color);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  for(let i=0;i<65;i++){
   const a=hash('cloud-angle'+i)*6.28,r=hash('cloud-radius'+i)*82,x=128+Math.cos(a)*r,y=128+Math.sin(a)*r*.46,size=13+hash('cloud-puff'+i)*34;
   const g=c.createRadialGradient(x,y,0,x,y,size);g.addColorStop(0,color+'15');g.addColorStop(.4,color+'09');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-size,y-size,size*2,size*2);
  }
  this.sprites.set(color,canvas);return canvas;
 }
 drawClouds(c,groups,project,time){
  c.save();c.globalCompositeOperation='screen';
  for(const group of groups)for(let layer=0;layer<(this.coarse?2:3);layer++){
   const seed=group.id+layer,p=project(group.position.map((v,i)=>v+(hash(seed+i)-.5)*650));if(!p)continue;
   const size=Math.min(1600,(560+hash(seed)*240)*p.scale);if(size<8)continue;
   c.save();c.translate(p.x,p.y);c.rotate(hash(seed+'tilt')*6.28+Math.sin(time*.025+layer)*.04);c.globalAlpha=.2;
   c.drawImage(this.cloud(group.color),-size/2,-size/2,size,size);c.restore();
  }c.restore();
 }
 drawComets(c,project,time,reduced=false){
  if(reduced)return;c.save();c.globalCompositeOperation='screen';
  for(let i=0;i<(this.coarse?2:3);i++){
   const phase=time*.075+i*2.16,r=1750+i*230;
   const position=a=>[Math.cos(a)*r,Math.sin(a*1.12+i)*520,Math.sin(a)*r*.7];
   let previous;for(let j=22;j>=0;j--){const p=project(position(phase-j*.0045));if(!p){previous=null;continue;}
    if(previous){c.strokeStyle=`rgba(197,222,255,${(1-j/23)*.3})`;c.lineWidth=(1-j/23)*1.5+.2;c.beginPath();c.moveTo(previous.x,previous.y);c.lineTo(p.x,p.y);c.stroke();}previous=p;
    if(j===0){c.fillStyle='#e8f3ff';c.beginPath();c.arc(p.x,p.y,1.4,0,6.28);c.fill();}
   }
  }c.restore();
 }
 dispose(){for(const s of this.sprites.values())s.width=s.height=1;this.sprites.clear();}
}

export function drawJourneyThread(c,segment,time,index,reduced=false){
 const {a,b}=segment;c.save();c.globalCompositeOperation='screen';c.setLineDash([]);
 for(const [width,alpha] of [[10,.035],[5,.09],[1.5,.55],[.55,.9]]){
  c.strokeStyle=`rgba(210,208,255,${alpha})`;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
 }
 if(!reduced){const t=(time*.13+index*.173)%1,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;const g=c.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,'#eaf5ffb0');g.addColorStop(1,'#b9cfff00');c.fillStyle=g;c.fillRect(x-7,y-7,14,14);}
 c.restore();
}

export function drawStarFlare(c,x,y,r,color,time,seed=0){
 const size=Math.max(7,Math.min(30,r*3.7)),pulse=.85+Math.sin(time*.5+seed)*.15;
 c.save();c.translate(x,y);c.rotate(.25+seed);c.globalCompositeOperation='screen';c.globalAlpha=pulse;
 const glow=c.createRadialGradient(0,0,0,0,0,size);glow.addColorStop(0,'#ffffffc0');glow.addColorStop(.13,color+'a0');glow.addColorStop(1,color+'00');c.fillStyle=glow;c.fillRect(-size,-size,size*2,size*2);
 c.fillStyle='#e7f1ffb0';c.beginPath();c.moveTo(-size,0);c.quadraticCurveTo(-1,-1,0,-size*.8);c.quadraticCurveTo(1,-1,size,0);c.quadraticCurveTo(1,1,0,size*.8);c.quadraticCurveTo(-1,1,-size,0);c.fill();c.restore();
}
