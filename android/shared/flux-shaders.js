import {COMMON} from './scene-shaders.js';

const HISTORY=`float history(float lane,float age){
 int height=textureSize(u_history,0).y;
 float x=clamp(lane,0.,1.)*47.,row=max(0.,clamp(age,0.,1.)*float(height-2)-u_historyPhase);int i=int(x),r=int(row),head=int(u_historyHead);
 int a=(head-r+height)%height,b=(a+height-1)%height;
 float young=mix(texelFetch(u_history,ivec2(i,a),0).r,texelFetch(u_history,ivec2(min(i+1,47),a),0).r,smoothstep(0.,1.,fract(x)));
 float old=mix(texelFetch(u_history,ivec2(i,b),0).r,texelFetch(u_history,ivec2(min(i+1,47),b),0).r,smoothstep(0.,1.,fract(x)));
 return mix(young,old,fract(row));
}`;

// Rotate about the centre of the entire history volume. Zoom keeps enough
// stand-off for its corners, including at maximum sculpture scale.
const PROJECTION=`
vec3 fluxView(vec3 p){p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;return p;}
vec4 fluxClip(vec3 p){
 p=fluxView(p);float depth=7.15+max(0.,clamp(u_particle.x,.55,1.45)-1.1)*3.5+u_camera.z*.26-p.z;
 return vec4(p.xy*vec2((1.9+(u_focalLength-1.9)*.1)*1.03/(u_resolution.x/u_resolution.y),(1.9+(u_focalLength-1.9)*.1)*1.03),depth*1.002002-.2002002,depth);
}
vec3 fluxFit(vec3 p){p.x*=min(1.,u_resolution.x/u_resolution.y/.95);return p*clamp(u_particle.x,.55,1.45);}
vec3 fluxTone(float lane,float amplitude){
 vec3 tone=mix(vec3(.10,.63,.76),coverTone(lane*.64+.08),.83);tone/=max(.35,max(tone.r,max(tone.g,tone.b)));
 tone=u_particleStyle<.5?vec3(.75,.87,.92):u_particleStyle>1.5?frequencyColor(lane):tone;
 return mix(tone,vec3(.80,.95,1.),pow(amplitude,2.)*.38);
}`;

// Frequency remains left-to-right; depth is eight seconds of measured audio.
// All filaments and particles share these coordinates.
const SURFACE=`
float fluxAmplitude(float lane,float level){return pow(level,.78)*smoothstep(0.,.045,lane)*(1.-smoothstep(.955,1.,lane));}
vec3 fluxSurface(float lane,float age,float amplitude,float underside){
 float t=u_fluxClock,crest=amplitude*(1.35+u_roles.x*u_movement*.50);
 float swirl=sin(lane*17.-t*.30+age*9.+sin(lane*6.+t*.17))*.12+sin(lane*43.+age*19.-t*.4)*.024;
 float twist=sin(lane*15.+age*17.-t*.18)*(.015+amplitude*(.08+u_roles.z*.035))*u_movement;
 float y=mix(-.48+crest+swirl*amplitude*u_movement+age*.65,-.48-crest*.42-age*.17,underside)+twist;
 return vec3((lane-.5)*6.6+sin(age*6.+t*.12)*age*.16*u_movement,y,2.5-age*5.-underside*.18);
}`;

export const FLUX_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_kind,v_soft;
${COMMON}
uniform highp sampler2D u_history;
uniform float u_historyHead,u_historyPhase,u_layer,u_fluxClock,u_spectrumLight[48];
${HISTORY}
${PROJECTION}
${SURFACE}
void main(){
 float lane=a_seed.x,seed=a_seed.w,t=u_fluxClock,age=pow(a_seed.y,1.45);
 float level=history(lane,age),amplitude=fluxAmplitude(lane,level);
 float underside=step(seed,.24),bright=.06+amplitude*.55,fade=.14+.86*pow(1.-age,.9);
 vec3 p=fluxSurface(lane,age,amplitude,underside);v_kind=0.;v_soft=0.;
 if(underside>.5)bright*=.40;
 if(u_layer<.5){
  float strand=floor(a_seed.z*38.);
  p.y+=sin(a_seed.z*TAU+lane*9.-t*.18)*(.028+amplitude*.12)*u_movement;
  float glint=pow(.5+.5*sin(lane*110.+strand*2.-t*.5),18.);
  bright*=.55+glint*.9;bright+=pow(1.-age,28.)*amplitude*.25;
  v_kind=step(.975,seed);
 }else if(u_layer<1.5){
  // Fragments detach only behind the recent ridge and only from strong peaks.
  // Their depth never advances ahead of the sample that emitted them.
  float detach=smoothstep(.065+seed*.04,.17+seed*.04,age);
  float lift=detach*pow(a_seed.z,2.)*(.05+amplitude*(.34+u_roles.y*u_movement*.20));
  p.y+=(seed>.5?1.:-1.)*lift;p.x+=sin(lane*37.+age*9.+t*.45)*lift*.16*u_movement;
  p.z-=detach*a_seed.z*.28;bright*=(.12+.35*pow(seed,5.))*detach*step(.68,seed)*smoothstep(.18,.5,amplitude);v_kind=step(.90,seed);
 }else{
  lane=floor(lane*192.)/191.;age=floor(a_seed.y*32.)/32.;level=history(lane,age);amplitude=fluxAmplitude(lane,level);
  p=fluxSurface(lane,age,amplitude,0.);p.y=mix(-.48+age*.65,p.y,a_seed.z);
  float light=u_spectrumLight[int(clamp(lane,0.,1.)*47.)];
  bright=(.012+amplitude*.045+light*.13)*(.4+u_roles.y*u_movement*.5);v_kind=2.;
 }
 v_color=fluxTone(lane,amplitude);
 if(u_layer>.5&&u_layer<1.5&&seed>.91&&u_particleStyle>.5)v_color=mix(v_color,vec3(1.,.56,.25),.65);
 gl_Position=fluxClip(fluxFit(p));
 float depth=gl_Position.w,focus=smoothstep(1.8,5.,abs(depth-7.));v_soft=focus*.65;
 float size=(1.35+pow(seed,16.)*1.8)*u_pixel*5.5*u_particle.y/max(depth,1.);
 gl_PointSize=clamp(size*(u_layer>1.5?.70:u_layer>.5?.85:1.)*(1.+focus),1.,5.);
 float alive=smoothstep(.002,.045,level);
 v_alpha=bright*fade*alive*4.1*u_density*smoothstep(.2,.8,depth)*clamp(.6+u_light.y,.3,2.)/(1.+focus*1.5);
}`;

export const FLUX_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha,v_kind,v_soft;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p),a;
 if(v_kind<.5){if(r>1.)discard;a=exp(-r*r*mix(7.,3.5,v_soft))+.25*exp(-r*r*32.);}
 else if(v_kind<1.5){a=1.-smoothstep(.55,.86,max(abs(p.x),abs(p.y)));}
 else{a=(1.-smoothstep(.18,.65,abs(p.x)))*(1.-smoothstep(.6,1.,abs(p.y)));}
 fragColor=vec4(v_color*v_alpha*a,v_alpha*a);}`;

export const FLUX_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
void main(){fragColor=vec4(0.,0.,0.,1.);}`;

// Sparse world-space motes are separate from measured history, leaving only
// a quiet sense of space when silence clears the wave.
export const FLUX_DUST_VERTEX=`#version 300 es
precision highp float;
${COMMON}
uniform float u_fluxClock;
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_kind,v_soft;
${PROJECTION}
void main(){
 vec3 p=(a_seed.xyz-.5)*vec3(15.,8.,12.);float seed=a_seed.w,t=u_fluxClock;
 p+=field(p,t*.07)*.12*u_movement;
 gl_Position=fluxClip(p);float depth=gl_Position.w;
 float edge=smoothstep(2.2,4.5,length(p.xz));
 float focus=smoothstep(2.,8.,abs(depth-7.));v_soft=1.;v_kind=step(.96,seed);
 v_color=mix(vec3(.12,.32,.42),coverTone(seed),.25);
 if(seed>.985)v_color=mix(v_color,vec3(.72,.43,.20),.7);
 if(u_particleStyle<.5)v_color=vec3(.28,.36,.42);
 v_alpha=(.035+pow(seed,12.)*.13)*edge*smoothstep(.6,2.,depth)/(1.+focus*2.);
 gl_PointSize=clamp((1.2+focus*3.)*u_pixel*5./max(depth,1.),1.,5.);
}`;

export const FLUX_TRACE_VERTEX=`#version 300 es
precision highp float;
${COMMON}
uniform highp sampler2D u_history;uniform float u_historyHead,u_historyPhase,u_fluxClock,u_traceRows,u_crossTrace;
out vec3 v_color;out float v_alpha,v_edge;out vec2 v_detail;
${HISTORY}
${PROJECTION}
${SURFACE}
vec3 tracePoint(float strand,float u,out float lane,out float age,out float level){
 lane=u;age=pow(strand/u_traceRows,1.45);
 if(u_crossTrace>.5){lane=(strand+.5)/u_traceRows;age=u;}
 level=history(lane,age);
 return fluxFit(fluxSurface(lane,age,fluxAmplitude(lane,level),mod(strand,7.)<.5&&strand>2.?1.:0.));
}
void main(){
 int cell=gl_VertexID/6,corner=gl_VertexID%6;
 vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 float strand=float(cell/256),u=float(cell%256)/256.,side=o.y*2.-1.;
 float lane0,age0,level0,lane1,age1,level1;
 vec4 a=fluxClip(tracePoint(strand,u,lane0,age0,level0)),b=fluxClip(tracePoint(strand,u+1./256.,lane1,age1,level1));
 vec2 tangent=(b.xy/max(.1,b.w)-a.xy/max(.1,a.w))*u_resolution;
 vec2 normal=vec2(-tangent.y,tangent.x)/max(length(tangent),.0001);
 gl_Position=mix(a,b,o.x);
 // Pixel-width extrusion survives side views without degenerate division.
 gl_Position.xy+=normal*side*(1.55*u_pixel)/u_resolution*gl_Position.w;
 float lane=mix(lane0,lane1,o.x),age=mix(age0,age1,o.x),level=mix(level0,level1,o.x),amplitude=fluxAmplitude(lane,level);
 v_color=fluxTone(lane,amplitude);
 float visibility=smoothstep(.2,.8,min(a.w,b.w));
 v_alpha=(.09+amplitude*.85)*(.14+.86*pow(1.-age,1.2))*smoothstep(.002,.04,level)*visibility;
 v_alpha*=u_crossTrace>.5?.30:strand<2.?1.65:.6+.4*pow(.5+.5*sin(lane*60.+strand-u_fluxClock*.3),8.);
 v_alpha*=clamp(.7+u_light.y*.3,.3,1.4);v_edge=side;v_detail=vec2(lane,age);
}`;
export const FLUX_TRACE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge;in vec2 v_detail;out vec4 fragColor;
uniform float u_fluxClock;uniform vec4 u_particle;
void main(){
 float core=exp(-v_edge*v_edge*24.),halo=exp(-v_edge*v_edge*3.);
 float bead=pow(.5+.5*sin(v_detail.x*230.+v_detail.y*71.-u_fluxClock*2.4),28.);
 float thread=.70+core*(.40+bead*.75*clamp(u_particle.w,0.,2.));
 float a=v_alpha*halo*thread;fragColor=vec4(v_color*a+vec3(core*bead*v_alpha*.07),a);
}`;
