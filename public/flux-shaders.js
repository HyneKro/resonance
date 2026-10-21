import {COMMON} from './scene-shaders.js';

const HISTORY=`float history(float lane,float age){
 float x=clamp(lane,0.,1.)*47.,row=max(0.,clamp(age,0.,1.)*126.-u_historyPhase);int i=int(x),r=int(row),head=int(u_historyHead);
 int a=(head-r+128)%128,b=(a+127)%128;
 float young=mix(texelFetch(u_history,ivec2(i,a),0).r,texelFetch(u_history,ivec2(min(i+1,47),a),0).r,smoothstep(0.,1.,fract(x)));
 float old=mix(texelFetch(u_history,ivec2(i,b),0).r,texelFetch(u_history,ivec2(min(i+1,47),b),0).r,smoothstep(0.,1.,fract(x)));
 return mix(young,old,fract(row));
}`;

// Stable seed coordinates weave recent frequency history into a luminous sheet.
// Frequency runs left to right; older samples recede in depth. The small fluid
// perturbation is decorative, while the principal silhouette is measured audio.
export const FLUX_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_kind;
${COMMON}
uniform highp sampler2D u_history;
uniform float u_historyHead,u_historyPhase,u_layer,u_fluxClock,u_spectrumLight[48];
${HISTORY}
void main(){
 float lane=a_seed.x,seed=a_seed.w,t=u_fluxClock,age=pow(a_seed.y,1.8);
 float bass=u_roles.x*u_movement,drums=u_roles.y*u_movement,lead=u_roles.z*u_movement;
 float level=history(lane,age),edge=smoothstep(0.,.045,lane)*(1.-smoothstep(.955,1.,lane));
 float amplitude=pow(level,.78)*edge,crest=amplitude*(1.35+bass*.50);
 float swirl=sin(lane*17.-t*.30+age*9.+sin(lane*6.+t*.17))*.12+sin(lane*43.+age*19.-t*.4)*.024;
 float sheet=sin(a_seed.z*TAU+lane*9.-t*.18)*(.04+amplitude*(.14+lead*.06))*u_movement;
 vec3 p=vec3((lane-.5)*6.6,-.48+crest+swirl*amplitude*u_movement+sheet,-age*4.4);
 p.y+=age*.65;p.x+=sin(age*6.+t*.12)*age*.16*u_movement;
 float fade=pow(1.-age,1.5),bright=.045+amplitude*.18;v_kind=0.;
 // Delicate mirrored undercurrent separates the bright crest from falling dust.
 if(seed<.24){p.y=-.48-crest*.42+sheet-age*.17;p.z-=.18;bright*=.38;}
 if(u_layer<.5){
  float strand=floor(a_seed.z*38.);p.y+=strand/38.*(.025+amplitude*.15);
  float glint=pow(.5+.5*sin(lane*110.+strand*2.-t*.5),18.);
  bright*=.45+glint*.8;bright+=pow(1.-age,28.)*amplitude*.12;
 }else if(u_layer<1.5){
  // Debris follows a smooth local current, with no random replacement per frame.
  float lift=pow(a_seed.z,2.)*(.10+amplitude*(.6+drums*.7));
  p.y+=(seed>.5?1.:-1.)*lift;p.x+=sin(lane*37.+age*9.+t*.45)*lift*.16*u_movement;
  p.z+=(seed-.5)*1.6;bright*=.12+.25*pow(seed,5.);v_kind=step(.88,seed);
 }else{
  // Fine quantized columns: each one samples its own frequency, not loudness.
  lane=floor(lane*192.)/191.;age=floor(a_seed.y*24.)/24.;level=history(lane,age);amplitude=pow(level,.78)*edge;
  p=vec3((lane-.5)*6.6,-.48+amplitude*(1.35+bass*.5)*a_seed.z+age*.65,-age*4.4);
  float light=u_spectrumLight[int(clamp(lane,0.,1.)*47.)];
  bright=(.012+amplitude*.025+light*.10)*(1.-age)*(.4+drums*.5);v_kind=2.;
 }
 vec3 tone=coverTone(lane*.64+.08),cold=mix(vec3(.10,.63,.76),tone,.55);
 cold/=max(.35,max(cold.r,max(cold.g,cold.b)));
 v_color=u_particleStyle<.5?vec3(.75,.87,.92):u_particleStyle>1.5?frequencyColor(lane):cold;
 v_color=mix(v_color,vec3(.80,.95,1.),pow(amplitude,2.)*.6);
 if(u_layer>.5&&u_layer<1.5&&seed>.91)v_color=mix(v_color,vec3(1.,.46,.16),.72);
 p.x*=min(1.,u_resolution.x/u_resolution.y/.95);p*=clamp(u_particle.x,.55,1.45);
 project(p,seed,1.);
 float alive=smoothstep(.002,.045,level);v_alpha=bright*fade*alive*3.5*u_density*cameraVisibility*clamp(.6+u_light.y,.3,2.);
 gl_PointSize=clamp(gl_PointSize*(u_layer>1.5?.65:u_layer>.5?.75:1.),1.,4.);
}`;

export const FLUX_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha,v_kind;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p),a;
 if(v_kind<.5){if(r>1.)discard;a=exp(-r*r*7.)+.25*exp(-r*r*32.);}
 else if(v_kind<1.5){if(max(abs(p.x),abs(p.y))>.82)discard;a=.7;}
 else{a=(1.-smoothstep(.18,.65,abs(p.x)))*(1.-smoothstep(.6,1.,abs(p.y)));}
 fragColor=vec4(v_color*v_alpha*a,v_alpha*a);}`;

export const FLUX_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;uniform vec3 u_colorA;uniform vec4 u_roles;uniform float u_movement;
void main(){vec2 p=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 vec3 tint=mix(vec3(.025,.16,.21),u_colorA*.20,.32);
 float haze=exp(-p.y*p.y*22.-p.x*p.x*.5);
 vec3 color=vec3(.018,.023,.032)+tint*haze*(.12+u_roles.z*.035*u_movement);
 // Quiet measuring ticks stay beneath the spectral material.
 vec2 cell=abs(fract(p*vec2(22.,28.))-.5);
 float marks=(1.-smoothstep(.025,.06,cell.x))*(1.-smoothstep(.06,.12,cell.y));
 color+=tint*marks*.032*haze;
 fragColor=vec4(color,1.);}`;


export const FLUX_TRACE_VERTEX=`#version 300 es
precision highp float;
${COMMON}
uniform highp sampler2D u_history;uniform float u_historyHead,u_historyPhase,u_fluxClock,u_traceRows;
out vec3 v_color;out float v_alpha,v_edge;
${HISTORY}
void main(){
 int cell=gl_VertexID/6,corner=gl_VertexID%6;
 vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 float strand=float(cell/256),lane=(float(cell%256)+o.x)/256.,side=o.y*2.-1.;
 float age=pow(strand/u_traceRows,1.65),t=u_fluxClock,level=history(lane,age);
 float edge=smoothstep(0.,.045,lane)*(1.-smoothstep(.955,1.,lane)),amplitude=pow(level,.78)*edge;
 float crest=amplitude*(1.35+u_roles.x*u_movement*.50);
 float swirl=sin(lane*17.-t*.30+age*9.+sin(lane*6.+t*.17))*.12+sin(lane*43.+age*19.-t*.4)*.024;
 float twist=sin(lane*15.+strand*.37-t*.18)*(.015+amplitude*(.08+u_roles.z*.035))*u_movement;
 vec3 p=vec3((lane-.5)*6.6,-.48+crest+swirl*amplitude*u_movement+twist,-age*4.4);
 p.y+=age*.65;p.x+=sin(age*6.+t*.12)*age*.16*u_movement;
 if(mod(strand,7.)<.5&&strand>2.){p.y=-.48-crest*.42+twist-age*.17;}
 p.y+=side*(.0015+(1.-age)*.0015)*(5.4-p.z)*900./max(400.,u_resolution.y);
 p.x*=min(1.,u_resolution.x/u_resolution.y/.95);p*=clamp(u_particle.x,.55,1.45);project(p,0.,1.);
 vec3 tone=mix(vec3(.10,.63,.76),coverTone(lane*.64+.08),.55);tone/=max(.35,max(tone.r,max(tone.g,tone.b)));
 v_color=u_particleStyle<.5?vec3(.75,.87,.92):u_particleStyle>1.5?frequencyColor(lane):tone;
 v_color=mix(v_color,vec3(.80,.95,1.),pow(amplitude,2.)*.6);
 v_alpha=(.06+amplitude*.3)*pow(1.-age,2.)*smoothstep(.002,.04,level)*cameraVisibility;
 v_alpha*=strand<2.?2.:.6+.4*pow(.5+.5*sin(lane*60.+strand-t*.3),8.);
 v_edge=side;
}`;
export const FLUX_TRACE_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha,v_edge;out vec4 fragColor;
void main(){float a=v_alpha*exp(-v_edge*v_edge*6.);fragColor=vec4(v_color*a,a);}`;
