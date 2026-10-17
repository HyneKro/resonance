export const SCENES=[{id:'resonance',name:'Resonance',subtitle:'one living universe',note:'A musical galaxy · bass bends the core · percussion lights the stars'}];
const previous=new Set(['eclipse','nebula','vortex','relic','collapse','tidal','attractor','aether','loom','aurora','tunnel','prism','bloom','flux','orbit','ribbons','spectrum']);
export const isVisualMode=id=>id==='resonance'||previous.has(id);
export const visualMode=()=> 'resonance';
