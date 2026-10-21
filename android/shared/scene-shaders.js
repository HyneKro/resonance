import {KALEIDOSCOPE_MODES} from './kaleidoscope.js';
import {EXTRA_SCULPTURES} from './sculpture-forms.js';
// Particle studies: continuous surfaces sampled with seeded points, plus a persistent flow simulation.
export const COMMON = `
uniform float u_time,u_mode,u_energy,u_intensity,u_evolve,u_pixel,u_density,u_weight,u_drive;
uniform vec2 u_resolution;
uniform vec4 u_low,u_high,u_form,u_morph,u_story;
uniform vec4 u_signature,u_character,u_roles,u_rhythm,u_particle,u_light,u_sculpture,u_shapeFrom,u_shapeTo;
uniform float u_rotation,u_storyMix;
uniform vec4 u_camera;
uniform float u_focalLength;
uniform float u_shimmer,u_themes[6],u_movement;
uniform float u_particleStyle,u_spectrum[48];
uniform vec4 u_harmonic[12],u_percussive[12];
float harmonicAt(int i){return u_harmonic[i/4][i%4];}
float percussiveAt(int i){return u_percussive[i/4][i%4];}
float spectral(float lane){float x=clamp(lane,0.,1.)*47.;int i=int(floor(x));return mix(u_spectrum[i],u_spectrum[min(47,i+1)],fract(x));}
uniform vec3 u_accents,u_transients,u_colorA,u_colorB,u_colorC,u_palette[6];
const float PI=3.14159265359;
const float TAU=6.28318530718;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n)*43758.5453123);}
vec3 field(vec3 p,float t){return vec3(sin(p.y*1.7+t)*cos(p.z*1.3-t*.7),sin(p.z*1.5+t*.8)*cos(p.x*1.6+t*.5),sin(p.x*1.4-t*.6)*cos(p.y*1.8+t*.3));}
vec3 coverTone(float phase){
 float x=fract(phase)*6.;int i=int(floor(x));return mix(u_palette[i],u_palette[(i+1)%6],smoothstep(0.,1.,fract(x)));
}
vec3 tint(float phase){return coverTone(phase)*.84;}
vec3 frequencyColor(float frequency){
 if(frequency<0.)return vec3(.78,.82,.92);
 float hue=.04+clamp(frequency,0.,1.)*.72;
 vec3 color=clamp(abs(mod(hue*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);
 return mix(vec3(1.),color,.88);
}
vec3 particleTint(float shade,float lane,vec4 birth){
 if(u_particleStyle<.5)return vec3(.83,.86,.94);
 if(u_particleStyle<1.5)return tint(lane*.82+shade*.18);
 if(u_particleStyle<2.5)return frequencyColor(lane)*(.65+shade*.35);
 return frequencyColor(birth.z)*(.65+birth.w*.35);
}
${EXTRA_SCULPTURES}
vec3 tissueShape(float u,float v,float resonance,float id,vec4 signature){
 float t=u_time,opening=u_morph.x,torsion=u_morph.y,pleats=u_morph.z,lace=u_morph.w;
 float winding=u+.28*sin(u*2.+t*.047)*(torsion+.2)+signature.x*.6;
 // Keep the membrane winding fixed; timbre bends it without adding whole turns.
 float twist=u*1.5+.22*sin(t*.075)+sin(u*2.+t*.04)*(torsion-.5)*.30+v*opening*.45;
 float petal=sin(u*(3.+signature.y*4.)+v*1.7);
 float lip=.15+.48*opening+u_character.w*.19+u_themes[3]*petal*.20;
 float radius=1.08+v*cos(twist)*lip+.19*sin(u*3.-t*.06)*(torsion+.2);
 float rib=sin(v*(18.+pleats*14.+signature.y*7.)+u*5.+sin(u*3.)*2.-t*.12);
 float fold=sin(u*3.+v*4.-t*.08)*sin(v*3.+u*2.+t*.05);
 radius+=fold*(.05+pleats*(.09+u_character.w*.19))+rib*(.007+resonance*(.012+u_character.y*.018));
 radius+=sin(u*5.+v*3.)*u_themes[3]*.22+sin(u*8.+v*7.)*u_themes[5]*.11;
 radius+=sin(u*3.+v*2.-t*.12)*u_themes[0]*.20;
 vec3 p=vec3(cos(winding)*radius,sin(winding)*radius,v*sin(twist)*(.46+opening*.48));
 p.z+=sin(u*2.+t*.057)*(.20+torsion*.38)+fold*(.08+pleats*.15);
 p.z+=sin(v*53.+u*17.+sin(u*7.)*3.)*(.003+resonance*.008);
 p.y+=sin(u*2.+v+t*.06)*v*v*opening*.22;
 p.z+=sin(u*(2.+signature.z*3.)+v*6.-t*.07)*u_themes[1]*.32;
 p.z+=sin(u*11.+v*19.)*u_themes[2]*(.035+resonance*.08);
 p.x+=sin(v*4.+u*2.+t*.05)*u_themes[4]*.20;
 // Each saved character changes the entire silhouette, on one continuous seed map.
 // Theme weights are smoothed on the CPU; turning character off restores the membrane.
 float breath=(u_roles.x*.12+u_rhythm.z*u_particle.z*.08)*u_movement;
 float wave=sin(u*3.-t*.13)+sin(v*4.+u*2.+t*.09)*.4;
 vec3 tidal=vec3(sin(u)*(1.35+signature.x*.24+v*.28),cos(u)*.36+sin(u*2.-t*.065)*.48+v*.34,cos(u)*.66+wave*v*(.20+signature.w*.20));
 float shell=.94+cos(v*PI)*.35+breath;
 vec3 cosmic=vec3(cos(u)*shell,sin(u)*shell,sin(u*2.+t*.045)*(.50+signature.z*.40)+v*.43);
 float corona=1.02+sin(u*7.+t*.055)*(.17+signature.x*.15+resonance*.12)+v*.28;
 vec3 ember=vec3(cos(u)*corona,sin(u)*corona,v*.46+sin(u*5.+v*3.-t*.09)*.38);
 float petals=.88+cos(u*5.+t*.035)*(.27+signature.y*.20+u_roles.z*.12)+v*(.28+breath);
 vec3 bloom=vec3(cos(u)*petals,sin(u)*petals,cos(u*5.+v*2.)*.37+v*.34);
 float bell=.36+(1.-v)*(.38+signature.w*.16)+sin(u*9.-t*.10)*(.035+resonance*.10);
 vec3 silk=vec3(cos(u)*bell,v*.99+cos(u*3.+t*.06)*.13,sin(u)*bell*.62+sin(v*4.+u*2.-t*.09)*.24);
 float facet=1.02+(.20+signature.y*.18)*cos(u*4.+t*.028)+v*.18;
 vec3 crystal=vec3(cos(u)*facet,sin(u)*facet,sin(u*3.)*.70+v*cos(u*2.)*.45);
 float identity=id<-.5?0.:1.;
 vec3 base=id<.5?tidal:id<1.5?cosmic:id<2.5?ember:id<3.5?bloom:id<4.5?silk:crystal;
 if(identity>.5)p=extraSculpture(id,u,v,t,resonance,base,signature);
 // Saved song structure opens and gathers the surface; live spectral lanes still supply the accents.
 if(identity>.5){vec3 original=p;float fullness=u_story.x,tension=u_story.w,grain=u_story.y;float petalLift=sin(u*(2.+signature.y*4.)+v*3.);p.xy*=1.+(.18*fullness-.10*tension)*(.4+v*v);p.z+=petalLift*(fullness-.35)*(.20+signature.z*.28);p.xz=rot((grain-.5)*.35*v)*p.xz;p+=normalize(p+vec3(.001))*sin(v*PI)*tension*.12;p=mix(original,p,u_storyMix);}
 // The owning spectral lane opens its tissue; leads ripple its skin, bass inflates it.
 p+=normalize(p+vec3(.001))*resonance*(.025+u_character.y*.065)*u_movement;
 p.z+=sin(u*(4.+u_character.w*6.)+v*7.-t*.14)*(.025+u_roles.z*.07)*identity*u_movement;
 vec3 weave=field(p*5.8,t*.06);
 p+=weave*(.019+(u_low.w+u_high.x)*.016)+field(p*15.+weave,t*.035)*(.005+lace*.009);
 return p;
}
// Reweave incompatible surfaces particle by particle. Each seed goes dark
// before changing topology, so no bright strand sweeps through the sculpture.
float tissueVisibility=1.;
vec3 tissue(float u,float v,float resonance,float seed){
 float progress=u_sculpture.z,threshold=.14+hash(seed*8191.)*.72;
 if(u_sculpture.w<.5)return tissueShape(u,v,resonance,-1.,u_signature);
 bool arriving=progress>=threshold;
 tissueVisibility=smoothstep(0.,.10,abs(progress-threshold));
 return tissueShape(u,v,resonance,arriving?u_sculpture.y:u_sculpture.x,arriving?u_shapeTo:u_shapeFrom);
}
vec3 organismPose(vec3 p){
 p*=u_particle.x*(1.+((u_low.x*.4+u_low.y*.6)*.13+u_roles.x*.055+u_accents.x*.055+u_rhythm.z*.03*u_particle.z)*u_drive*u_movement);
 p+=field(p*2.7,u_time*.16)*u_accents.y*.055*u_drive*u_movement;
 p.yz=rot(.55)*p.yz;p.xy=rot(-.2)*p.xy;
 vec3 axis=normalize(vec3(.34,.79,.51));float angle=u_rotation*.024;
 return p*cos(angle)+cross(axis,p)*sin(angle)+axis*dot(axis,p)*(1.-cos(angle));
}
float cameraVisibility=1.;
void project(vec3 p,float seed,float alpha){

 p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;
 float depth=5.4+u_camera.z-p.z;
 cameraVisibility=smoothstep(.12,.55,depth);
 gl_Position=vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,depth*1.002002-.2002002,depth);
 gl_PointSize=clamp((1.3+pow(seed,16.)*1.6+u_accents.z*.35)*u_pixel*4.8*u_particle.y/max(depth,1.),1.,7.);
}
`;
export const QUAD=`#version 300 es
in vec2 a_position;out vec2 v_uv;
void main(){v_uv=a_position*.5+.5;gl_Position=vec4(a_position,0.,1.);}`;

// One seed map throughout: musical deformation never resamples or teleports the points.
export const PARTICLE_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;in vec4 a_birth;out vec3 v_color;out float v_alpha;
${COMMON}
void main(){
 float t=u_time,u=a_seed.x*TAU,thread=(floor(a_seed.y*256.)+.5)/256.;
 float v=(thread-.5)*2.,opening=u_morph.x,torsion=u_morph.y,pleats=u_morph.z,lace=u_morph.w;
 float lane=floor(a_seed.y*48.)/47.;
 float frequency=u_particleStyle>2.5?max(0.,a_birth.z):lane;
 int musicalLane=int(clamp(floor(frequency*47.+.5),0.,47.));
 float role=step(.68,a_seed.z);
 float resonance=mix(harmonicAt(musicalLane)*1.15,percussiveAt(musicalLane)*1.25,role);
 float bass=u_low.x*.4+u_low.y*.6,mid=u_low.z*.25+u_low.w*.35+u_high.x*.4;
 // Shared smooth displacement keeps neighbouring threads joined. Separated
 // notes articulate light and fine filaments, never random chunks of mass.
 vec3 p=tissue(u,v,spectral(frequency),a_seed.w),weave=field(p*5.8,t*.06);
 float twist=u*(1.+torsion*1.8)+.22*sin(t*.075)+v*opening;
 p=organismPose(p);
 float vein=pow(.5+.5*sin(v*(35.+lace*9.)+u*9.+weave.z*2.),14.);
 float capillary=pow(.5+.5*sin(v*83.-u*23.+sin(u*5.)*2.),22.);
 float edge=pow(abs(v),12.),shade=.2+.8*abs(sin(twist+v));
 float age=max(0.,u_time-a_birth.x),fade=smoothstep(0.,.8,age)*(1.-smoothstep(a_birth.y-1.2,a_birth.y,age));
 float alpha=(.055+vein*(.08+lace*.10)+capillary*.045+edge*.14)*fade;
 project(p,a_seed.w,alpha);v_color=particleTint(shade,lane,a_birth);
 v_alpha=cameraVisibility*tissueVisibility*alpha*clamp(.85+p.z*.12,.45,1.2)*u_density*u_intensity*u_weight*(.52+u_energy*.38+resonance*.70+u_transients.y*vein*(.75+u_light.z*3.));
}`;

// Cilia, travelling vein beads and translucent cells belong to the same living membrane.
export const CELL_VERTEX=`#version 300 es
precision highp float;in vec4 a_seed;in vec4 a_birth;out vec3 v_color;out float v_alpha;out float v_kind;out float v_angle;
${COMMON}
void main(){
 float t=u_time,branch=floor(a_seed.x*192.),u=(branch+.5)/192.*TAU;
 float lane=floor(a_seed.x*48.)/47.,response=percussiveAt(int(floor(lane*47.+.5)))*1.15;
 float side=a_seed.z<.5?-1.:1.,s=a_seed.y;
 vec3 p;float alpha,size;
 if(a_seed.w<.63){
   // A narrow seeded spine with paired wisps: continuous growth, never random relocation.
   vec3 root=tissue(u,side*.88,spectral(lane),a_seed.w),outward=normalize(root+vec3(.001));
   vec3 tangent=vec3(-sin(u),cos(u),cos(u*2.)*.3);
   float length=.12+.32*u_morph.w+response*(.20+u_character.y*.23)+u_themes[3]*.28;
   float bend=sin(s*PI)*(sin(u*7.+t*.13)*.10+u_morph.y*.16);
   p=root+outward*s*length+tangent*bend;
   p+=vec3(0.,0.,sin(s*4.+u*3.-t*.12)*s*.12);
   float fork=sin(s*34.+a_seed.z*TAU)*pow(sin(s*PI),2.)*(.004+u_morph.w*.017);
   p+=tangent*fork*(1.+u_themes[3]*4.)+outward*sin(s*12.)*u_themes[5]*.025;
   float signal=pow(.5+.5*cos(s*21.-t*.85+u*4.),14.);
   alpha=(.018+response*.16+signal*.09)*(1.-s*s);size=1.15+signal*.45;v_kind=0.;
 }else if(a_seed.w<.90){
   float travel=fract(s+t*.007),v=sin(travel*TAU+u*.5)*.82;
   p=tissue(u+sin(travel*TAU)*.06,v,response,a_seed.w);
   p+=normalize(p)*.008;
   alpha=(.07+response*.26+u_transients.y*.18)*pow(sin(travel*PI),.4);size=1.6+response*.9;v_kind=1.;
 }else{
   float v=(s-.5)*1.7;p=tissue(u,v,response,a_seed.w);
   p+=normalize(p)*(.025+a_seed.z*.14)+field(p*3.,t*.09)*.025;
   alpha=.07+response*.10+u_transients.z*.10;size=3.+a_seed.z*4.;v_kind=2.;
 }
 float age=max(0.,t-a_birth.x),fade=smoothstep(0.,.8,age)*(1.-smoothstep(a_birth.y-1.2,a_birth.y,age));
 p=organismPose(p);project(p,a_seed.z,alpha);gl_PointSize=clamp(gl_PointSize*size,1.,9.);
 v_color=particleTint(a_seed.z,lane,a_birth);v_alpha=cameraVisibility*tissueVisibility*alpha*fade*u_density*u_intensity*u_weight*u_particle.w*(1.+u_transients.z*u_light.z*2.);
 v_angle=u+t*.018;
}`;
export const CELL_FRAGMENT=`#version 300 es
precision mediump float;in vec3 v_color;in float v_alpha,v_kind,v_angle;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float shape=exp(-r*r*4.)*(1.-smoothstep(.7,1.,r));
 if(v_kind>1.5){float ring=exp(-pow((r-.65)*9.,2.));shape=ring*.55+shape*.13;}
 else if(v_kind>.5){float c=cos(v_angle),s=sin(v_angle);p=mat2(c,-s,s,c)*p;shape*=exp(-p.x*p.x*3.);}
 fragColor=vec4(v_color*shape*v_alpha,0.);}`;

// Frequency is sampled at each birth and retained for that particle's lifetime.
const BIRTH_SAMPLE=`
uniform float u_birthCDF[48],u_birthTotal;
vec2 birthFrequency(float random){
 if(u_birthTotal<.0001)return vec2(-1.,0.);
 int index=47;for(int i=0;i<48;i++){if(random<u_birthCDF[i]){index=i;break;}}
 return vec2(float(index)/47.,u_spectrum[index]);
}`;
export const BIRTH_UPDATE=`#version 300 es
precision highp float;
in vec4 a_seed;in vec4 a_birth;out vec4 nextBirth;
${COMMON}
${BIRTH_SAMPLE}
void main(){
 nextBirth=a_birth;
 if(a_birth.y<=0.||u_time-a_birth.x>=a_birth.y){
   float life=7.+a_seed.w*11.,start=u_time;
   if(a_birth.y<=0.)start-=a_seed.z*life*.85;
   vec2 frequency=birthFrequency(hash(a_seed.x*7919.+a_seed.y*1123.+floor(u_time*13.)));
   nextBirth=vec4(start,life,frequency);
 }
 gl_Position=vec4(0.);
}`;

export const PARTICLE_FRAGMENT=`#version 300 es
precision mediump float;in vec3 v_color;in float v_alpha;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
 float core=exp(-r*3.5)*(1.-smoothstep(.65,1.,r));
 fragColor=vec4(v_color*core*v_alpha,0.);
}`;

// Two mirrored spectrum runs share the membrane's seed map. Their low ends
// meet at 0/1 and their high ends at .5. Neither geometry nor color resamples
// with loudness: only emissive light changes, with no lifetime flicker.
export const RIBBON_SPECTRUM_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;in vec4 a_birth;out vec3 v_color;out float v_alpha;
uniform float u_spectrumLight[48];
${COMMON}
void main(){
 float phase=a_seed.x,frequency=1.-abs(2.*phase-1.);
 float x=frequency*47.;int band=int(floor(x));
 float light=mix(u_spectrumLight[band],u_spectrumLight[min(47,band+1)],fract(x));
 float thread=(floor(a_seed.y*256.)+.5)/256.,lane=floor(a_seed.y*48.)/47.;
 // Exactly the ribbon's displacement, including its birth-color option.
 float geometryLane=u_particleStyle>2.5?max(0.,a_birth.z):lane;
 vec3 p=organismPose(tissue(phase*TAU,(thread-.5)*2.,spectral(geometryLane),a_seed.w));
 project(p,a_seed.w,light);
 gl_PointSize=clamp((3.2+a_seed.z*1.2)*u_pixel*4.8*u_particle.y/max(gl_Position.w,1.),1.5,10.);
 // Walk all six sampled background colors, then retrace them on the other
 // half. Unlike a cyclic palette, the treble end keeps the last color.
 float shade=frequency*5.;int colorIndex=int(floor(shade));
 v_color=mix(u_palette[colorIndex],u_palette[min(5,colorIndex+1)],smoothstep(0.,1.,fract(shade)))*2.8;
 v_alpha=cameraVisibility*tissueVisibility*light*u_density*u_intensity*.72;
}`;
export const RIBBON_SPECTRUM_FRAGMENT=`#version 300 es
precision mediump float;in vec3 v_color;in float v_alpha;out vec4 fragColor;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.||v_alpha<=0.)discard;
 float light=(exp(-r*18.)+.24*exp(-r*3.))*(1.-smoothstep(.65,1.,r));
 fragColor=vec4(v_color*light*v_alpha,0.);
}`;

export const SPECTRAL_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;out vec3 v_color;out float v_alpha;
${COMMON}
void main(){
 float lane=floor(a_seed.x*48.),phase=lane/48.,s=a_seed.y,t=u_time;
 // A whole filament follows one envelope; switching roles partway down it
 // introduces a visible kink when a percussive note arrives.
 float response=harmonicAt(int(lane))*.85+percussiveAt(int(lane))*.35,theta=phase*TAU+t*.025;
 vec3 p;float alpha,shade;
 if(a_seed.w<.8){
   // Each stable petal has its own fixed frequency window: 40 Hz through 16 kHz.
   // Only that window opens and lights its filament; global energy does not impersonate it.
   vec3 root=tissue(phase*TAU,.92,spectral(phase),a_seed.w),normal=normalize(root+vec3(.001));
   float reach=.18+s*(.25+response*.58),curl=sin(s*PI)*(.08+response*.20);
   p=root+normal*reach+vec3(-normal.y,normal.x,0.)*curl;
   p.z+=sin(s*7.+phase*TAU+t*.07)*s*.09;
   p+=vec3(-normal.y,normal.x,1.)*(a_seed.z-.5)*(.008+sin(s*PI)*.022);
   p=organismPose(p);
   float bead=pow(.5+.5*cos(s*38.-t*.65+phase*TAU),18.);
   alpha=(.003+pow(response,1.5)*(.12+bead*.30))*sin(s*PI);
   shade=phase;
 }else{
   // A separate population of orbiting dust follows RMS loudness, with gentle idle drift.
   float radius=1.80+pow(s,.7)*1.25+u_energy*.18;
   float latitude=(a_seed.z-.5)*1.8;
   theta+=s*.4;
   p=vec3(cos(theta)*radius*cos(latitude),sin(theta)*radius*cos(latitude),sin(latitude)*radius);
   p.xz=rot(.18)*p.xz;
   alpha=.006+pow(u_energy,1.7)*(.025+pow(a_seed.z,8.)*.09);
   shade=.65;
 }
 project(p,a_seed.z,alpha);v_color=particleTint(shade,lane/47.,vec4(0.,0.,lane/47.,response));v_alpha=cameraVisibility*tissueVisibility*alpha*u_weight*u_intensity*u_density;
}`;

// Analytic curl of a smooth vector potential, integrated on the GPU with persistent positions.
export const FLOW_UPDATE=`#version 300 es
precision highp float;
in vec4 a_positionAge;in vec4 a_velocitySeed;in vec4 a_birth;
out vec4 nextPosition;out vec4 nextVelocity;out vec4 nextBirth;
uniform float u_dt;
${COMMON}
${BIRTH_SAMPLE}
vec3 curl(vec3 p,float t){
 return vec3(-1.7*sin(p.y*1.7+t)*sin(p.x*1.4)-1.5*cos(p.z*1.5-t*.8)*cos(p.x*1.6),
 -1.3*sin(p.z*1.3+t*.7)*sin(p.y*1.8)-1.4*cos(p.x*1.4)*cos(p.y*1.7+t),
 -1.6*sin(p.x*1.6)*sin(p.z*1.5-t*.8)-1.8*cos(p.y*1.8)*cos(p.z*1.3+t*.7));
}
void main(){
 vec3 p=a_positionAge.xyz,v=a_velocitySeed.xyz;float seed=a_velocitySeed.w,age=a_positionAge.w+u_dt;
 float lifetime=9.+hash(seed*192.7)*10.;nextBirth=a_birth;
 if(a_birth.y<=0.)nextBirth=vec4(u_time,lifetime,birthFrequency(hash(seed*987.1)));
 if(age>lifetime||length(p)>4.){
   float a=hash(seed*917.+floor(u_time*.08))*TAU;
   float r=.68+hash(seed*374.)*.55;
   p=vec3(cos(a)*r,(hash(seed*631.)-.5)*.02,sin(a)*r*.7);v=vec3(0.);age=0.;nextBirth=vec4(u_time,lifetime,birthFrequency(hash(seed*987.1+floor(u_time*13.))));
 }
 float bass=u_low.x*.4+u_low.y*.6;
 vec3 force=curl(p*(1.+u_form.y*u_evolve*.35+u_themes[2]*.55),u_time*.11)*(.32+u_themes[0]*.18);
 force+=vec3(-p.y,p.x,0.)*(u_themes[1]*.30+u_themes[5]*.18);
 force.y+=sin(p.x*2.+p.z+u_time*.09)*(u_themes[3]*.36+u_themes[4]*.22);
 force+=vec3(-p.z*.3,sin(p.x*1.7+u_time*.1)*.16,p.x*.3);
 force-=p*(.13+max(0.,length(p)-1.8)*.8);
 force+=normalize(p+vec3(.001))*u_accents.x*.60*u_drive;
 v=mix(v,force*(.8+bass*.5),1.-exp(-u_dt*1.8));
 p+=v*u_dt;
 nextPosition=vec4(p,age);nextVelocity=vec4(v,seed);gl_Position=vec4(0.);
}`;
export const FLOW_FRAGMENT=`#version 300 es
precision mediump float;out vec4 fragColor;void main(){fragColor=vec4(0.);}`;
export const FLOW_VERTEX=`#version 300 es
precision highp float;
in vec4 a_positionAge;in vec4 a_velocitySeed;in vec4 a_birth;out vec3 v_color;out float v_alpha;
${COMMON}
void main(){
 float seed=a_velocitySeed.w,age=a_positionAge.w,life=9.+hash(seed*192.7)*10.;
 vec3 p=a_positionAge.xyz*(1.55+u_low.y*.22*u_drive);p.xz=rot(.3)*p.xz;p.xy=rot(.18)*p.xy;
 project(p,seed,.2);
 float fade=smoothstep(0.,1.,age)*(1.-smoothstep(life-2.,life,age))*(1.-smoothstep(3.3,4.,length(a_positionAge.xyz)));
 v_color=particleTint(clamp(.35+length(a_velocitySeed.xyz)*.55,0.,1.),seed,a_birth);
 v_alpha=cameraVisibility*(.10+seed*.05)*fade*u_density*u_intensity*u_weight*(.8+u_high.z*.5+u_accents.z*.7);
}`;

export const BLOOM=`#version 300 es
precision mediump float;in vec2 v_uv;out vec4 fragColor;
uniform sampler2D u_image;uniform vec2 u_direction;uniform float u_extract;
void main(){vec3 color=texture(u_image,v_uv).rgb*.227027;
color+=(texture(u_image,v_uv+u_direction*1.384615).rgb+texture(u_image,v_uv-u_direction*1.384615).rgb)*.316216;
color+=(texture(u_image,v_uv+u_direction*3.230769).rgb+texture(u_image,v_uv-u_direction*3.230769).rgb)*.070270;
if(u_extract>.5)color*=smoothstep(.12,.65,max(color.r,max(color.g,color.b)));
fragColor=vec4(color,1.);}`;
export const FINISH=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
uniform sampler2D u_image,u_bloom,u_nebula;uniform vec4 u_light;uniform vec2 u_resolution;uniform float u_kaleidoWeights[${KALEIDOSCOPE_MODES.length+1}],u_kaleidoMotion,u_hdrOutput,u_artDirection,u_styleOpacity;
vec3 film(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 composite(vec2 uv){vec3 color=texture(u_image,uv).rgb+texture(u_bloom,uv).rgb*u_light.x;
vec3 highlights=min(max(color-vec3(.9),vec3(0.))*.22,vec3(.8))*u_hdrOutput;
color=pow(film(color),vec3(.454545));
vec3 cloud=texture(u_nebula,uv).rgb;
if(u_artDirection>5.5){vec4 surface=texture(u_image,uv);return pow(film(mix(cloud,surface.rgb,surface.a)+texture(u_bloom,uv).rgb*u_light.x*.015),vec3(.454545));}
if(u_artDirection>3.5&&u_artDirection<4.5)return cloud*exp(-texture(u_image,uv).rgb*3.4);
if(u_artDirection>.5&&u_artDirection<3.5){float coverage=clamp(texture(u_image,uv).a,0.,1.);vec3 halo=pow(film(texture(u_bloom,uv).rgb*u_light.x),vec3(.454545));return mix(cloud,color,coverage)+halo*(1.-coverage)+highlights;}
return 1.-(1.-cloud)*(1.-color)+highlights;}
vec2 patternUV(float mode){
 vec2 aspect=vec2(u_resolution.x/u_resolution.y,1.);vec2 p=(v_uv-.5)*aspect;float r=length(p),theta=atan(p.y,p.x);vec2 folded;
 if(mode>10.5){
   float sector=6.28318530718/16.;float angle=abs(mod(theta+sector*.5,sector)-sector*.5);
   r*=.76+.24*cos(r*9.);folded=r*vec2(cos(angle),sin(angle));
 }else if(mode>9.5){
   vec2 q=vec2(abs(p.x)-.32,p.y);float radius=length(q),a=atan(q.y,q.x);float sector=6.28318530718/7.;a=abs(mod(a+sector*.5,sector)-sector*.5);
   folded=radius*vec2(cos(a),sin(a))*.85;
 }else if(mode>8.5){
   float radius=.12+abs(mod(r*1.5,.44)-.22);float sector=6.28318530718/9.;float a=abs(mod(theta+sin(r*8.)*.28+sector*.5,sector)-sector*.5);
   folded=radius*vec2(cos(a),sin(a));
 }else if(mode>7.5){
   vec2 q=p*3.2,cell=vec2(1.7320508,3.);vec2 a=mod(q,cell)-cell*.5,b=mod(q-cell*.5,cell)-cell*.5;q=dot(a,a)<dot(b,b)?a:b;
   float radius=length(q)*.38,sector=6.28318530718/6.;float angle=abs(mod(atan(q.y,q.x)+sector*.5,sector)-sector*.5);
   folded=radius*vec2(cos(angle),sin(angle));
 }else if(mode>6.5){
   vec2 q=mat2(.7071068,-.7071068,.7071068,.7071068)*p*2.4;
   q=abs(fract(q+.5)*2.-1.);if(q.y>q.x)q=q.yx;folded=(q-.35)*.6;
 }else if(mode>5.5){
   float sector=6.28318530718/5.;float a=abs(mod(theta+r*.65+sin(u_kaleidoMotion)*.08+sector*.5,sector)-sector*.5);
   r*=.72+.28*cos(a*5.);folded=r*vec2(cos(a),sin(a));
 }else if(mode>4.5){
   vec2 tile=p*1.8+vec2(sin(u_kaleidoMotion)*.05,cos(u_kaleidoMotion*.7)*.05);
   folded=(abs(fract(tile+.5)*2.-1.)-.5)*.85;
 }else{
   float count=mode<.5?6.:mode<1.5?8.:mode<2.5?12.:mode<3.5?7.:10.;
   if(mode>2.5&&mode<3.5)theta+=r*2.8+sin(u_kaleidoMotion)*.2;
   if(mode>3.5){r=.36*(.5-.5*cos(r*15.-u_kaleidoMotion));theta+=.18*sin(u_kaleidoMotion);}
   if(mode>1.5&&mode<2.5)r*=.82+.16*cos(r*10.);
   float sector=6.28318530718/count;float angle=abs(mod(theta+sector*.5,sector)-sector*.5);
   if(mode>.5&&mode<1.5)r*=.88+.12*cos(angle*count);
   folded=r*vec2(cos(angle),sin(angle));
 }
 vec2 uv=.5+folded/aspect;
 return clamp(uv,.001,.999);
}
void main(){
 vec3 color=vec3(0.);
 // Sample the same scene once per visible pattern; never rerender particles.
 if(u_artDirection>3.5&&u_artDirection<4.5)color=composite(v_uv);
 else {
 if(u_kaleidoWeights[0]>0.)color=composite(v_uv)*u_kaleidoWeights[0];
 for(int i=1;i<${KALEIDOSCOPE_MODES.length+1};i++){
  if(u_kaleidoWeights[i]>0.)color+=composite(patternUV(float(i-1)))*u_kaleidoWeights[i];
 }
}
vec2 uv=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);float r=length(uv);
 color*=1.-smoothstep(.4,.85,length(v_uv-.5))*((u_artDirection>3.5&&u_artDirection<4.5)||u_artDirection>5.5?.08:.4);
 float contrast=u_artDirection>.5?1.+(u_light.w-1.)*.20:u_light.w;
 color=clamp((color-.18)*contrast+.18,0.,mix(1.,1.8,u_hdrOutput));
 color=mix(vec3(.015,.019,.028),color,u_styleOpacity);
 if(u_hdrOutput>.5){vec3 linear=mix(color/12.92,pow((color+.055)/1.055,vec3(2.4)),step(vec3(.04045),color));color=log2(1.+linear)/log2(5.);}
fragColor=vec4(color,1.);}`;

