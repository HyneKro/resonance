// Causal harmonic/percussive masks for visual choreography, not isolated audio
// stems or instrument recognition. Nothing here changes the playback samples.
const LANES=48,HISTORY=13,STEP=.02;
function median(values,n){
 for(let i=1;i<n;i++){const v=values[i];let j=i-1;while(j>=0&&values[j]>v){values[j+1]=values[j];j--;}values[j+1]=v;}
 return values[n>>1];
}
export class MusicalLayers{
 constructor(){this.history=new Float32Array(LANES*HISTORY);this.scratch=new Float32Array(HISTORY);this.harmonic=new Float32Array(LANES);this.percussive=new Float32Array(LANES);this.input=new Float32Array(LANES);this.head=0;this.count=0;this.elapsed=STEP;}
 update(input,dt,active=true){
  dt=Math.max(0,Math.min(.1,dt));this.elapsed+=dt;
  for(let i=0;i<LANES;i++)this.input[i]=active&&Number.isFinite(input[i])?Math.max(0,input[i]):0;
  // Fixed time sampling makes the masks independent of display refresh rate.
  while(this.elapsed>=STEP){this.elapsed-=STEP;this.history.set(this.input,this.head*LANES);this.head=(this.head+1)%HISTORY;this.count=Math.min(HISTORY,this.count+1);}
  for(let i=0;i<LANES;i++){
   for(let t=0;t<this.count;t++)this.scratch[t]=this.history[t*LANES+i];
   const sustained=this.count?median(this.scratch,this.count):0;
   let n=0;for(let j=Math.max(0,i-3);j<=Math.min(LANES-1,i+3);j++)this.scratch[n++]=this.input[j];
   const broad=median(this.scratch,n),rise=Math.max(0,this.input[i]-sustained);
   // Narrow stationary peaks remain melodic; broad, newly arriving energy is
   // percussive. Keep a residual share instead of claiming a certain source.
   const h=sustained*sustained,p=(broad*.65+rise*1.4)**2;
   const mask=h+p>1e-12?h/(h+p):0,value=this.input[i];
   this.harmonic[i]=value*mask;this.percussive[i]=value*(1-mask);
  }
  return this;
 }
}
