// A fixed pool of musical events. The supplied clock stops with playback;
// gaps, scene switches and held tones never manufacture new attacks.
const unit=x=>Number.isFinite(x)?Math.max(0,Math.min(1,x)):0;
export class AstraMotion {
 constructor(){this.bands=new Float32Array(48*4);this.orbits=new Float32Array(48*4);this.events=new Float32Array(12*4);this.envelopes=new Float32Array(48);this.reset();}
 reset(){this.bands.fill(0);this.orbits.fill(0);this.events.fill(0);this.envelopes.fill(0);this.clock=null;this.time=0;this.next=0;this.emitted=0;this.lastHit=-10;this.envelope=0;return this;}
 suspend(){this.clock=null;}
 update(clock,spectrum,{onset=0,drums=0,energy=0,reduced=false,movement=1}={}){
  if(!Number.isFinite(clock))return this;
  const level=unit(Math.max(onset,drums*.85));
  const entry=this.clock===null,dt=entry?0:clock-this.clock;this.clock=clock;
  if(dt<=0||dt>.25||reduced||movement<=0){
   // Prime only on entry/discontinuity. Repeated frozen renders are immutable.
   if(entry||dt!==0||this.time===0){for(let i=0;i<48;i++){const a=unit(spectrum?.[i]);this.envelopes[i]=a;this.bands[i*4]=a;}this.envelope=level;}
   return this;
  }
  this.time+=dt;
  for(let i=0;i<48;i++){
   const at=i*4,a=unit(spectrum?.[i]),previous=this.envelopes[i];
   this.bands[at]+=(a-this.bands[at])*(1-Math.exp(-dt/(a>this.bands[at] ? .045 : .17)));
   const speed=energy>.015?unit(a*.85+level*.25):0;
   this.orbits[at+1]+=(speed-this.orbits[at+1])*(1-Math.exp(-dt/(speed>this.orbits[at+1] ? .18 : .8)));
   // Integrate velocity instead of multiplying an absolute phase by loudness.
   this.orbits[at]+=dt*this.orbits[at+1]*(.30+.8/(1+i*.10))*Math.min(3.5,movement);
   if(energy>.015&&a>.12&&a-previous>.09&&(this.bands[at+2]===0||this.time-this.bands[at+1]>.30)){
    this.bands[at+1]=this.time;this.bands[at+2]=a;this.bands[at+3]=a-previous;
   }
   this.envelopes[i]=Math.max(a,previous*Math.exp(-dt/.16));
  }
  if(energy>.015&&level>.24&&level-this.envelope>.10&&this.time-this.lastHit>.32){
   // Birth, strength, reproducible direction seed, comet flag (every third hit).
   this.events.set([this.time,level,(this.emitted*.61803398875)%1,this.emitted%3===0?1:0],this.next*4);
   this.next=(this.next+1)%12;this.emitted++;this.lastHit=this.time;
  }
  this.envelope=Math.max(level,this.envelope*Math.exp(-dt/.14));
  return this;
 }
}
