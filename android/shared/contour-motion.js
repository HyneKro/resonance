// A small sheet of drying ink. Time follows playback, never the camera or wall clock.
export class ContourMotion {
 constructor(){this.events=new Float32Array(8*4);this.reset();}
 reset(){this.time=4.8;this.clock=null;this.next=0;this.emitted=0;this.envelope=0;this.lastHit=-10;this.events.fill(0);}
 suspend(){this.clock=null;this.envelope=0;}
 update(clock,{onset=0,drums=0,energy=0,reduced=false}={}){
  if(!Number.isFinite(clock))return this;
  const level=Math.max(0,Math.min(1,Number(onset)||0));
  const attack=Math.max(level,Math.max(0,Math.min(1,Number(drums)||0))*.8);
  if(this.clock===null){this.clock=clock;this.envelope=attack;return this;}
  const dt=clock-this.clock;this.clock=clock;
  if(reduced||dt<=0||dt>.25){if(dt<0||dt>.25)this.envelope=attack;return this;}
  this.time+=dt;
  // Rising accents only: a held loud note cannot spray a new burst every frame.
  const rise=attack-this.envelope;
  if(energy>.015&&attack>.24&&rise>.09&&this.time-this.lastHit>.24){
   const n=this.emitted++,t=(n*.6180339+.13)%1,a=t*5.75+.25,edition=Math.floor(this.time/17)%3;
   let x=-.28+Math.cos(a)*.53,y=.06+Math.sin(a)*.53;
   if(edition===1){x=(t-.5)*2.05;y=Math.sin(t*Math.PI*2-.25)*.39+Math.sin(t*Math.PI*4)*.035;}
   if(edition===2){const qx=Math.sign(Math.cos(a))*Math.abs(Math.cos(a))**.4*.48,qy=Math.sign(Math.sin(a))*Math.abs(Math.sin(a))**.4*.48;x=.93*qx+.36*qy-.12;y=-.36*qx+.93*qy+.03;}
   this.events.set([x,y,this.time,Math.min(1,attack)],this.next*4);
   this.next=(this.next+1)%8;this.lastHit=this.time;
  }
  this.envelope=attack>this.envelope?attack:this.envelope+(attack-this.envelope)*(1-Math.exp(-dt/.11));
  return this;
 }
}

// Rasterized only on a size/layout change. System fonts, no network or font loading.
export function contourLettering(width,height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d'),portrait=width<height,s=Math.min(width/(portrait?650:1000),height/700);
 const left=width*.09,right=width*.91,top=height*.17,bottom=height*.82;
 ctx.fillStyle='#222321';ctx.textBaseline='alphabetic';
 ctx.font=`${Math.max(6,26*s)}px Georgia, serif`;ctx.fillText('Contour',left,top);
 ctx.font=`${Math.max(4,9*s)}px sans-serif`;ctx.fillStyle='#62625a';
 ctx.fillText(portrait?'SOUND / INK':'S T U D I E S   I N   S O U N D',left,top+21*s);
 ctx.textAlign='right';ctx.fillText('RESONANCE',right,top);ctx.fillText('INK / PAPER',right,top+21*s);
 ctx.textAlign='left';ctx.fillText('FORM  /  FREQUENCY',left,bottom+20*s);
 ctx.textAlign='right';ctx.fillText('A LISTENING STUDY',right,bottom+20*s);
 ctx.strokeStyle='#7d7b6e';ctx.globalAlpha=.34;ctx.lineWidth=Math.max(.5,s*.65);
 ctx.beginPath();ctx.moveTo(left,bottom);ctx.lineTo(right,bottom);ctx.stroke();ctx.globalAlpha=1;
 ctx.fillStyle='#b51f18';ctx.fillRect(right-16*s,top+42*s,16*s,16*s);
 // A simple geometric seal, not invented calligraphy.
 ctx.strokeStyle='#f4efe3';ctx.lineWidth=Math.max(.5,s);ctx.strokeRect(right-12*s,top+46*s,8*s,8*s);
 return canvas;
}
