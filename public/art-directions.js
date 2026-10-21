// Display identities are independent of track identity, playback and saved audio analysis.
export const ART_DIRECTIONS=Object.freeze([
 {id:'resonance',name:'Resonance',note:'The original living ribbon and flowing atmosphere.',index:0},
 {id:'noctiluca',name:'Noctiluca',note:'A living aquarium. Schools gather, mantas glide and jellyfish glow with the music.',index:1},
 {id:'afterglow',name:'Afterglow',note:'An endless neon drive. Bass sculpts the terrain; the city lights follow the spectrum.',index:2},
 {id:'orrery',name:'Orrery',note:'An astral clockwork. Gears turn behind moving orbits, planets and comet trails.',index:3},
 {id:'contour',name:'Contour',note:'Geometric ink on textured paper. Intersecting circles breathe with bass; melody traces their contours.',index:4},
 {id:'flux',name:'Flux',note:'A flowing spectrogram. Luminous frequency ridges leave trails of plasma, dust and digital traces.',index:5}
]);
export const artDirection=value=>ART_DIRECTIONS.find(x=>x.id===(value==='glasshouse'?'afterglow':value))||ART_DIRECTIONS[0];

// Fade through a common quiet ground, never stretch one topology into another.
// A newer selection replaces the pending destination, including during exit.
export class ArtDirectionTransition{
 constructor(){this.current='resonance';this.target='resonance';this.opacity=1;this.initialized=false;}
 update(value,dt,{reduced=false}={}){
  const next=artDirection(value).id;
  if(!this.initialized||reduced){this.current=this.target=next;this.opacity=1;this.initialized=true;}
  this.target=next;
  const step=Math.max(0,Math.min(.1,dt))/.48;
  if(this.current!==this.target){this.opacity=Math.max(0,this.opacity-step);if(this.opacity===0)this.current=this.target;}
  else this.opacity=Math.min(1,this.opacity+step);
  this.active=this.current!==this.target||this.opacity<1;
  return {id:this.current,index:artDirection(this.current).index,opacity:this.opacity*this.opacity*(3-2*this.opacity)};
 }
}

// Integrate speed rather than multiplying absolute time by a changing envelope.
// This keeps swimming, driving and orbital paths continuous through attacks.
export class ArtWorldMotion{
 constructor(){this.clocks=[0,0,0,0];this.energy=0;}
 update(dt,roles={}, {frozen=false,reduced=false,movement=1}={}){
  if(frozen||reduced)return [...this.clocks];
  dt=Math.max(0,Math.min(.1,Number(dt)||0));
  const target=Math.min(1,Math.max(0,(roles.bass||0)*.45+(roles.drums||0)*.3+(roles.lead||0)*.25));
  this.energy+=(target-this.energy)*(1-Math.exp(-dt/.7));
  const speed=Math.max(0,Math.min(3.5,Number(movement)||0)),e=this.energy;
  const rates=[.45+e*.55,1.4+e*3.2,.15+e*.35,.16+e*.2];
  this.clocks=this.clocks.map((x,i)=>x+dt*rates[i]*speed);return [...this.clocks];
 }
}
