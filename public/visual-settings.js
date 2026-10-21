import {SPECTRUM_SETTINGS} from './spectrum-settings.js';
import {DEFAULT_PREFERENCES} from './default-preferences.js';
// Shared by the settings UI and server validation; saved values never bypass these limits.
export const VISUAL_SETTINGS={
 ...SPECTRUM_SETTINGS,
 schoolOpening:{label:'School opening',min:0,max:1,value:.65},oceanRays:{label:'Sun shafts',min:0,max:2,value:1},
 aerialFluid:{label:'Liquid merging',min:0,max:1,value:.8},aerialShade:{label:'Studio darkness',min:0,max:1,value:0},
 bloom:{label:'Bloom',min:0,max:2.5,value:.35},glow:{label:'Glow radius',min:0,max:2,value:.45},flash:{label:'Musical flashes',min:0,max:2,value:.10},contrast:{label:'Contrast',min:.7,max:1.8,value:1.12},
 bgScale:{label:'Cloud scale',min:.5,max:1.8,value:1},bgSpeed:{label:'Current speed',min:.2,max:2,value:1},turbulence:{label:'Turbulence',min:0,max:2,value:1},textureDetail:{label:'Fine texture',min:0,max:1.5,value:1},
 particleSpread:{label:'Sculpture scale',min:.6,max:1.6,value:1},particleSize:{label:'Particle size',min:.5,max:2,value:1},filigree:{label:'Living detail',min:0,max:2,value:1},orbit:{label:'Orbiting dust',min:0,max:2,value:1},beatMotion:{label:'Beat motion',min:0,max:2,value:.55},motionAmount:{label:'Movement',min:.25,max:3.5,value:1},
 pointerForce:{label:'Mouse interaction',min:0,max:2,value:1},galaxyDensity:{label:'Galaxy stars',min:0,max:2,value:1},comets:{label:'Comet trails',min:0,max:2,value:.65},gravity:{label:'Gravitational core',min:0,max:1.5,value:.55},starDepth:{label:'Star field depth',min:.2,max:2,value:1},
 variation:{label:'New listen variation',min:0,max:1,value:.35},glassOpacity:{label:'Panel opacity',min:.18,max:.9,value:.42},wallpaperDim:{label:'Wallpaper shade',min:.25,max:.85,value:.56}
};
for(const [key,s]of Object.entries(VISUAL_SETTINGS))if(Number.isFinite(DEFAULT_PREFERENCES[key]))s.value=DEFAULT_PREFERENCES[key];
export const visualDefaults=()=>Object.fromEntries(Object.entries(VISUAL_SETTINGS).map(([key,s])=>[key,s.value]));
export const visualNumber=(key,value)=>{const s=VISUAL_SETTINGS[key];return Number.isFinite(value)?Math.max(s.min,Math.min(s.max,value)):s.value;};
export const THEMES={auto:'Follow the track',ocean:'Tidal nebula',cosmic:'Astral spirals',ember:'Solar corona',botanical:'Bioluminescent cloud',nocturne:'Midnight void',prism:'Prismatic stardust'};
