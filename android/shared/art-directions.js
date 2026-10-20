// Display identities are independent of track identity, playback and saved audio analysis.
export const ART_DIRECTIONS=Object.freeze([
 {id:'resonance',name:'Resonance',note:'The original living ribbon and flowing atmosphere.',index:0},
 {id:'noctiluca',name:'Noctiluca',note:'A luminous deep-sea organism. Bass breathes; notes travel through its tendrils.',index:1},
 {id:'glasshouse',name:'Glasshouse',note:'A cathedral of cut glass. Melody raises the vaults; percussion catches their edges.',index:2},
 {id:'orrery',name:'Orrery',note:'An engraved celestial instrument. Low notes turn the rings; high notes illuminate its scales.',index:3},
 {id:'contour',name:'Contour',note:'A floating landscape printed in ink. Sound lifts the terrain and traces its contours.',index:4}
]);
export const artDirection=value=>ART_DIRECTIONS.find(x=>x.id===value)||ART_DIRECTIONS[0];

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
