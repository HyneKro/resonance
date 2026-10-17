const clamp=x=>Math.max(0,Math.min(1,x));
// Interval voting tolerates missed beats; confidence prevents arbitrary pulses in unmetered sound.
export class TempoTracker{
 constructor(){this.reset();}
 reset(){this.events=[];this.bpm=0;this.targetBpm=0;this.proposal=0;this.proposalAt=0;this.confidence=0;this.targetConfidence=0;this.phase=0;this.correction=0;this.pulse=0;this.lastHit=-Infinity;this.time=0;this.output={bpm:0,confidence:0,phase:0,pulse:0};}
 estimate(){
  const votes=new Float32Array(171),events=this.events;
  for(let i=1;i<events.length;i++)for(let j=Math.max(0,i-8);j<i;j++){
   const interval=events[i].time-events[j].time;if(interval<.26||interval>8)continue;
   for(let beats=1;beats<=8;beats++){
    const bpm=60*beats/interval;if(bpm<50||bpm>220)continue;
    const weight=Math.sqrt(events[i].strength*events[j].strength)*Math.exp(-(this.time-events[i].time)/8)*(i-j===1?2.5:1)/Math.pow(beats,1.5),width=Math.max(1.5,bpm*.014);
    for(let k=Math.max(0,Math.floor(bpm-50)-6);k<=Math.min(170,Math.ceil(bpm-50)+6);k++)votes[k]+=weight*Math.exp(-.5*((k+50-bpm)/width)**2);
   }
  }
  const adjusted=Array.from(votes,(v,i)=>v/(1+Math.abs(Math.log2((i+50)/(this.bpm||120)))*.15));
  const winner=adjusted.indexOf(Math.max(...adjusted)),score=adjusted[winner];if(score<=0)return;
  const rival=Math.max(...adjusted.filter((_,i)=>Math.abs(i-winner)>7));
  const clarity=clamp((score-rival)/Math.max(score,.001)*2.5),evidence=clamp((events.length-3)/7);
  const candidate=winner+50;
  let real=0,imaginary=0,weight=0;
  for(const e of events){const w=e.strength*Math.exp(-(this.time-e.time)/6),angle=e.time*candidate/60*Math.PI*2;real+=Math.cos(angle)*w;imaginary+=Math.sin(angle)*w;weight+=w;}
  const coherence=Math.hypot(real,imaginary)/Math.max(weight,.001);
  this.targetConfidence=evidence*(.4+.6*clarity)*clamp((coherence-.35)/.55);
  if(this.targetConfidence>.52){
   if(!this.bpm){this.bpm=this.targetBpm=candidate;this.phase=this.time*candidate/60-Math.atan2(imaginary,real)/(Math.PI*2);}
   else if(Math.abs(candidate-this.targetBpm)<5)this.targetBpm=this.targetBpm*.8+candidate*.2;
   else if(Math.abs(candidate-this.proposal)>4){this.proposal=candidate;this.proposalAt=this.time;}
   else if(this.time-this.proposalAt>3){this.targetBpm=candidate;this.proposal=0;}
  }else this.proposal=0;
 }
 update(dt,hits=[0,0,0],{active=true,frozen=false,reduced=false}={}){
  if(frozen)return this.output;dt=Math.max(0,Math.min(.1,dt));this.time+=dt;
  const strength=Math.max(hits[0]||0,(hits[1]||0)*.65,(hits[2]||0)*.3);
  if(active&&strength>.12&&this.time-this.lastHit>.24){
   this.lastHit=this.time;this.events.push({time:this.time,strength});this.events=this.events.filter(e=>this.time-e.time<18).slice(-36);this.estimate();
   if(this.bpm&&this.confidence>.55){const fraction=this.phase-Math.floor(this.phase),error=(fraction>.5?1:0)-fraction;if(Math.abs(error)<.14)this.correction=Math.max(-.04,Math.min(.04,this.correction+error*.10));}
  }
  const target=active?this.targetConfidence*Math.exp(-Math.max(0,this.time-this.lastHit-1.5)/1.2):0;
  this.confidence+=(target-this.confidence)*(1-Math.exp(-dt/(target>this.confidence?1.5:.65)));
  this.bpm+=Math.max(-3*dt,Math.min(3*dt,this.targetBpm-this.bpm));
  if(!reduced){const correction=Math.max(-.06*dt,Math.min(.06*dt,this.correction*(1-Math.exp(-dt/.7))));this.correction-=correction;this.phase+=dt*(this.bpm||120)/60+correction;}
  const trust=clamp((this.confidence-.5)/.35),wanted=active&&!reduced?Math.pow(.5+.5*Math.cos(this.phase*Math.PI*2),3)*trust*trust:0;
  this.pulse+=(wanted-this.pulse)*(1-Math.exp(-dt/(wanted>this.pulse?.045:.12)));
  this.output={bpm:this.bpm,confidence:this.confidence,phase:this.phase,pulse:reduced?0:this.pulse};return this.output;
 }
}
