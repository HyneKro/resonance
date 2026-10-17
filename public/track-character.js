import {SculptureMorph,sculptureFor} from './sculpture-forms.js';
import {Inertia} from './inertia.js';
const clamp=x=>Math.max(0,Math.min(1,x));
export const textKey=text=>String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function hashText(text){let h=2166136261;for(const c of String(text)){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
export const THEME_NAMES=['ocean','cosmic','ember','botanical','nocturne','prism'];
export const FORM_NAMES=['Tidal ribbons','Orbital shell','Solar corona','Branching bloom','Silken bell','Crystal knot'];
// Sharpen the saved evidence at render time, so existing local profiles benefit too.
// With no distinguishing cues, a stable seeded pair supplies a procedural identity.
export function characterThemes(profile,enabled=true,theme='auto'){
 if(!enabled)return Array(6).fill(0);
 const index=THEME_NAMES.indexOf(theme);if(index>=0)return THEME_NAMES.map((_,i)=>i===index?1:0);
 const weights=profile.themes.map(x=>Math.pow(Math.max(0,x),3));
 if(Math.max(...profile.themes)-Math.min(...profile.themes)<.015){const primary=(hashText(profile.seed+'|theme')>>>8)%6,secondary=(primary+1+Math.floor(profile.seed/6)%5)%6;return THEME_NAMES.map((_,i)=>i===primary?.80:i===secondary?.20:0);}
 const sum=weights.reduce((a,b)=>a+b,0),base=weights.map(x=>x/Math.max(sum,1e-9)),primary=base.indexOf(Math.max(...base));
 const companions=[[3,4,1],[4,0,5],[5,1,4],[0,4,1],[1,0,3],[1,2,0]],rand=random(hashText(profile.seed+'|companion'));
 const companion=companions[primary][Math.floor(rand()*3)],blend=.07+rand()*.08;
 return base.map((x,i)=>x*(1-blend)+(i===companion?blend:0));
}
// Eight independent, continuous fluid dimensions. Cached identity seeds reproduce
// the recipe locally; a new listen nudges it without switching its visual character.
export function atmosphereRecipe(profile,session='',amount=0){
 const base=random(hashText(profile.seed+'|fluid-2')),variation=random(hashText(profile.seed+'|'+session+'|fluid-2'));
 return Array.from({length:8},()=>clamp(base()+(variation()*2-1)*amount*.10));
}
const words={ocean:'ocean sea tide wave waves river rain water drowned floating pluie mer vague eau',cosmic:'star stars space moon galaxy universe heaven cosmic astral satellite celestial etoile lune ciel',ember:'fire flame flames burn burning heat sun solar ignite ashes feu soleil flamme',botanical:'flower bloom blossom garden forest roots leaves grow spring rose fleur foret jardin',nocturne:'night midnight shadow shadows darkness dark dream dreams sleep lonely nuit ombre reve',prism:'crystal glass diamond mirror neon electric laser chrome city prism cristal miroir electrique'};
export function themeCues(text){const tokens=new Set(textKey(text).match(/[a-z]+/g)||[]);return THEME_NAMES.map(name=>words[name].split(' ').reduce((sum,w)=>sum+(tokens.has(w)?1:0),0));}

// These are explicit stylistic cues, not a claim to infer a song's literal meaning.
export function createTrackCharacter(track={},lyrics={cues:[],source:''},notes=''){
 const genre=textKey(track.genre),title=themeCues(track.title+' '+track.album),hint=themeCues(notes),source=themeCues((track.sourceTags||[]).join(' ')+' '+(track.description||'').slice(0,5000)),weights=THEME_NAMES.map((_,i)=>.12+Math.min(3,title[i])*.22+Math.min(4,lyrics.cues?.[i]||0)*.18+Math.min(3,hint[i])*.65+Math.min(3,source[i])*.10);
 let pace=.75,edge=.45,space=.65,fold=.5,label='Fluid';
 const add=(i,n)=>weights[i]+=n;
 if(/ambient|chill|downtempo|lo.?fi|acoustic|classical|meditat/.test(genre)){pace=.40;edge=.18;space=.9;fold=.3;add(0,.55);add(1,.4);label='Suspended';}
 if(/trance|techno|house|electro(?!nic|nica)|dance|drum|dnb|breakbeat|garage|\bedm\b/.test(genre)){pace=1.0;edge=.72;space=.55;fold=.7;add(5,.7);label='Kinetic';}
 if(/dubstep|bass|phonk|metal|rock|industrial/.test(genre)){pace=.85;edge=.85;space=.4;fold=.82;add(2,.7);add(4,.35);label='Volcanic';}
 if(/jazz|soul|r.?&.?b|blues|funk/.test(genre)){pace=.65;edge=.3;space=.6;fold=.65;add(3,.65);add(0,.3);label='Organic';}
 if(/cinematic|orchestr|epic|soundtrack|symphon/.test(genre)){pace=.65;edge=.55;space=.92;fold=.72;add(1,.75);label='Expansive';}
 if(/pop|disco|synthwave/.test(genre)){add(5,.45);add(3,.25);pace=.85;label='Luminous';}
 const sum=weights.reduce((a,b)=>a+b,0),themes=weights.map(v=>v/sum),seed=hashText([track.id,track.artist,track.title,track.album].join('|')),rand=random(seed);
 const signature=Array.from({length:4},()=>rand());
 const basis=[track.genre?'Genre cues':'Live sound',title.some(Boolean)?'Title / album cues':'',source.some(Boolean)?'Source tags / description':'',lyrics.source||'',notes?'Your theme hints':''].filter(Boolean);
 return {version:1,seed,signature,themes,pace,edge,space,fold,label,basis,notes,dominant:THEME_NAMES[themes.indexOf(Math.max(...themes))]};
}

export class CharacterMixer{
 constructor(){this.sculpture=new SculptureMorph();this.profile=createTrackCharacter();this.session='';this.springs=null;this.variation=[];}
 select(profile,session=''){this.profile=profile;this.session=session;const r=random(hashText(profile.seed+'|'+session));this.variation=Array.from({length:8},()=>r()*2-1);}
 update(dt,{amount=.35,theme='auto',enabled=true,frozen=false,reduced=false}={}){
  const p=enabled?this.profile:createTrackCharacter(),v=enabled?amount:0,r=this.variation.length?this.variation:Array(8).fill(0);
  const index=THEME_NAMES.indexOf(theme),themes=characterThemes(p,enabled,theme);
  const signature=p.signature.map((x,i)=>clamp(x+r[i]*v*.14));
  const character=[clamp(p.pace+r[4]*v*.10),clamp(p.edge+r[5]*v*.12),clamp(p.space+r[6]*v*.10),clamp(p.fold+r[7]*v*.12)];
  const recipe=enabled?atmosphereRecipe(p,this.session,v):Array(8).fill(.5);
  const targets=[...signature,...character,...themes,...recipe];if(!this.springs)this.springs=targets.map(x=>new Inertia(x,3.5));
  const values=this.springs.map((s,i)=>frozen?s.value:s.update(targets[i],reduced?0:dt));
  // Reduced motion can select a static identity without leaving a transition running.
  if(reduced&&!frozen)this.springs.forEach((s,i)=>{s.value=targets[i];s.velocity=0;values[i]=targets[i];});
  return {backgroundTarget:{signature,character,themes,recipe},sculpture:this.sculpture.update(enabled?sculptureFor(p):-1,dt,{frozen,reduced,signature}),shapeFrom:this.sculpture.fromSignature,shapeTo:this.sculpture.toSignature,signature:values.slice(0,4),character:values.slice(4,8),themes:values.slice(8,14),recipe:values.slice(14,22),label:p.label,dominant:index<0?p.dominant:theme,basis:p.basis};
 }
}
