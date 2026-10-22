// A continuous ink gesture with a bounded rain of falling drops and drying marks.
// Time follows playback, never the camera or wall clock.
const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
const hash=n=>{const v=Math.sin(n*127.1+19.3)*43758.5453;return v-Math.floor(v);};
export const CONTOUR_RAIN_COUNT=64,CONTOUR_DROP_LIFE=6.4;
export class ContourMotion {
 constructor(){this.drops=new Float32Array(CONTOUR_RAIN_COUNT*4);this.accent=new Float32Array([1,.055,.025]);this.reset();}
 reset(){this.time=0;this.clock=null;this.next=0;this.emitted=0;this.envelope=0;this.lastHit=-10;this.credit=0;this.rainEnergy=0;this.drops.fill(0);}
 suspend(){this.clock=null;this.envelope=0;}
 update(clock,{onset=0,drums=0,bass=0,texture=0,energy=0,reduced=false,colors,spectrum}={}){
  if(!Number.isFinite(clock))return this;
  const attack=Math.max(unit(onset),unit(drums)*.8);energy=unit(energy);
  if(this.clock===null){this.clock=clock;this.envelope=attack;return this;}
  const dt=clock-this.clock;this.clock=clock;
  if(reduced||dt<=0||dt>.25){if(dt<0||dt>.25)this.envelope=attack;return this;}
  this.time+=dt;
  // Track colors and spectral balance tint wet ink gradually. A held clock
  // or seek cannot jump the palette; a track reset retains the previous tint.
  if(colors?.length>=3){
   let total=0,weighted=0;for(let i=0;i<48;i++){const v=Math.max(0,Number(spectrum?.[i])||0);total+=v;weighted+=v*i/47;}
   const balance=total>0?weighted/total:.3,mix=Math.min(1,Math.max(0,energy))*.85;
   const palette=colors[0].map((v,i)=>v*(1-balance)+colors[2][i]*balance);
   const lo=Math.min(...palette),hi=Math.max(...palette),response=1-Math.exp(-dt/1.4);
   for(let i=0;i<3;i++){const rest=[1,.055,.025][i],tint=hi-lo>.01?.035+.965*(palette[i]-lo)/(hi-lo):rest;const target=rest*(1-mix)+tint*mix;this.accent[i]+=(target-this.accent[i])*response;}
  }
  // Audible sustained sound feeds rain; accents briefly feed extra drops. A dry
  // slot is reused only after its mark has disappeared, never by replacing ink.
  this.rainEnergy+=(energy-this.rainEnergy)*(1-Math.exp(-dt/.28));
  this.credit+=energy>.015?dt*(.7+this.rainEnergy*6.5+unit(texture)*1.8):0;
  const rise=attack-this.envelope;
  if(energy>.015&&attack>.24&&rise>.09&&this.time-this.lastHit>.24){
   this.credit+=.7+attack*1.8;this.lastHit=this.time;
  }
  this.credit=Math.min(3,this.credit);
  if(energy>.015)while(this.credit>=1){
   let slot=-1;
   for(let j=0;j<CONTOUR_RAIN_COUNT;j++){const k=(this.next+j)%CONTOUR_RAIN_COUNT,at=k*4;if(!this.drops[at+3]||this.time-this.drops[at+2]>=CONTOUR_DROP_LIFE){slot=k;break;}}
   if(slot<0){this.credit=Math.min(1,this.credit);break;}
   const n=this.emitted++,strength=unit(.16+energy*.46+unit(bass)*.22+attack*.24);
   // Low-discrepancy placement covers the sheet, independently of the gesture.
   this.drops.set([((n*.61803398875+.17)%1)*1.8-.9,((n*.754877666+.31)%1)*1.35-.68,this.time,strength*(.65+hash(n+11)*.35)],slot*4);
   this.next=(slot+1)%CONTOUR_RAIN_COUNT;this.credit--;
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
