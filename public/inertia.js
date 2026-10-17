// Exact critically damped spring: continuous position and velocity, even at uneven frame rates.
export class Inertia {
  constructor(value=0,seconds=.3){this.value=value;this.velocity=0;this.seconds=seconds;}
  update(target,dt){
    const w=4/this.seconds,t=Math.max(0,Math.min(.1,dt)),offset=this.value-target;
    const impulse=this.velocity+w*offset,decay=Math.exp(-w*t);
    this.value=target+(offset+impulse*t)*decay;
    this.velocity=(this.velocity-w*impulse*t)*decay;
    return this.value;
  }
}
