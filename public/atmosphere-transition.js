import {Inertia} from './inertia.js';
// Integrate changes of current speed from the present position. Multiplying the
// whole session clock by each new recipe made track changes travel farther and
// farther as the app stayed open. Keep this on the reactor, across GPU rebuilds.
export class AtmosphereDrift {
 constructor(){this.time=undefined;this.position=0;this.speed=0;}
 update(time,recipe=.5){
  const speed=.55+recipe*.85;
  if(this.time===undefined)this.position=time*speed;
  else this.position+=Math.max(0,time-this.time)*(this.speed+speed)*.5;
  this.time=time;this.speed=speed;
  return this.position;
 }
}
// Keep all songs in a tiny neighbourhood of the same fluid: travel without a sweep.
export function nearbyAtmosphere(identity){
 const t=identity.backgroundTarget||identity;
 return {signature:t.signature.map(x=>.5+(x-.5)*.018),character:t.character.map(x=>.5+(x-.5)*.12),themes:t.themes.map(x=>1/6+(x-1/6)*.12),recipe:(t.recipe||Array(8).fill(.5)).map(x=>.5+(x-.5)*.018)};
}
export class AtmosphereTransition {
 constructor(){this.springs=null;}
 update(identity,colors,dt,{frozen=false,reduced=false}={}){
  if(frozen&&this.output)return this.output;
  const t=nearbyAtmosphere(identity),target=[...t.signature,...t.character,...t.themes,...t.recipe];
  this.springs??=target.map(x=>new Inertia(x,.8));
  const v=this.springs.map((s,i)=>{if(reduced){s.value=target[i];s.velocity=0;return s.value;}return s.update(target[i],Math.max(0,Math.min(.1,dt)));});
  this.output={identity:{signature:v.slice(0,4),character:v.slice(4,8),themes:v.slice(8,14),recipe:v.slice(14)},colors};
  return this.output;
 }
}
