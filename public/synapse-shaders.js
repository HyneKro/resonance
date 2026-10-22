// Every layer uses the same moving junctions and spherical pulse fronts, so
// fine filaments, cores and travelling charges remain attached in three dimensions.
const WEB=`
uniform sampler2D u_nodes,u_edges;
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_signals[8],u_origins[8],u_neural;
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_signalTime,u_spectrumLight[48],u_shimmer;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 pigment(vec3 c){return pow(max(vec3(0.),c/max(.24,max(c.r,max(c.g,c.b)))),vec3(2.2));}
vec3 cool(){return mix(pigment(u_palette[1]),pigment(u_palette[2]),.28);}
vec3 warm(){return mix(pigment(u_palette[4]),pigment(u_palette[0]),.18);}
float frequency(float t){float x=clamp(t,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(47,i+1)],fract(x));}
float impulse(vec3 p){
 float light=0.;for(int i=0;i<8;i++){
  vec4 event=u_signals[i];float age=u_signalTime-event.x;
  float travel=length(p-u_origins[i].xyz)-age*2.65;
  light+=event.y*exp(-travel*travel*9.)*exp(-max(0.,age)*.55)*step(0.,age);
 }return min(1.8,light)*clamp(u_light.z*5.,0.,2.);
}
vec3 junction(int id){
 vec3 p=texelFetch(u_nodes,ivec2(id,0),0).xyz;
 vec3 push=vec3(0.);for(int i=0;i<8;i++){
  float age=u_signalTime-u_signals[i].x;vec3 delta=p-u_origins[i].xyz;float r=length(delta),front=r-age*2.65;
  push+=delta/max(.1,r)*exp(-front*front*5.)*sin(front*5.)*u_signals[i].y*exp(-max(0.,age)*.65)*step(0.,age)*.21;
 }return (p+push*u_movement)*clamp(u_particle.x,.65,1.5);
}
vec4 projectWeb(vec3 p){
 p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;
 float d=max(.15,6.4+u_camera.z-p.z);return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);
}
`;
export const SYNAPSE_THREAD_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_segments,u_threadLayer;
out vec3 v_color;out float v_alpha,v_edge,v_t,v_seed,v_pulse;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments),id=cell/segments;
 if(u_threadLayer>.5)id*=2;
 vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
 float t=(float(cell%segments)+float(c==1||c==4||c==5))/u_segments,side=c==0||c==1||c==4?-1.:1.;
 vec3 pa=junction(a),pb=junction(b),p=mix(pa,pb,t);float lengthAB=length(pa-pb);
 vec3 axis=normalize(cross(pb-pa,vec3(.31,.87,.41))+vec3(.00001));
 float arc=sin(t*3.14159)*min(.18,lengthAB*.30);
 p+=axis*arc*sin(edge.w*51.+u_neural.x*1.6)*( .35+u_roles.z*.65);
 p+=axis*arc*sin(t*6.283+edge.w*19.+u_neural.x)*u_threadLayer;
 vec4 clip=projectWeb(p),ca=projectWeb(pa),cb=projectWeb(pb);
 vec2 tangent=(cb.xy/cb.w-ca.xy/ca.w)*u_resolution,normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float blur=smoothstep(.65,3.5,abs(clip.w-6.1));
 float pulse=impulse(p/clamp(u_particle.x,.65,1.5)),lit=frequency(fract(edge.w*3.7));
 float width=(.65+blur*2.0+pulse*.4)*max(.7,u_pixel);
 clip.xy+=normal*side*width*2./u_resolution*clip.w;gl_Position=clip;v_edge=side;v_t=t;v_seed=edge.w;v_pulse=pulse;
 v_color=mix(cool(),warm(),clamp(pulse*.75+hash(edge.w*19.)*.40,0.,1.));
 v_alpha=(.065+lit*.38+u_roles.x*.055+pulse*.95+u_roles.w*.06)*(1.-blur*.68)*edge.z;
 v_alpha*=mix(.12,1.,smoothstep(2.,5.,clip.w))*(1.-smoothstep(.65,1.65,lengthAB)*.85);
 v_alpha*=1.-u_threadLayer*.60;
}`;
export const SYNAPSE_THREAD_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge,v_t,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural;
void main(){
 float sheath=exp(-v_edge*v_edge*3.4),core=exp(-v_edge*v_edge*35.);
 float charge=pow(.5+.5*sin(v_t*28.-u_neural.x*5.+v_seed*61.),16.);
 float beads=pow(.5+.5*sin(v_t*70.+v_seed*171.),24.);
 vec3 color=v_color*(sheath*.70+core*(.38+charge*.9+beads*.32))*v_alpha;
 color+=mix(v_color,vec3(1.),.55)*core*charge*v_pulse*v_alpha*.65;
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_NODE_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_nodeLayer;
out vec3 v_color;out float v_power,v_blur,v_hero,v_seed,v_pulse;
void main(){
 int id=gl_VertexID;vec4 data;vec3 p;float fade=1.;float seed=hash(float(id)+113.);
 if(u_nodeLayer>2.5){
  int event=id%8;float age=u_signalTime-u_signals[event].x;
  float z=hash(float(id)*3.7)*2.-1.,angle=hash(float(id)*7.9)*6.283185;
  vec3 dir=vec3(sqrt(max(0.,1.-z*z))*cos(angle),z,sqrt(max(0.,1.-z*z))*sin(angle));
  p=(u_origins[event].xyz+dir*age*(1.1+seed*1.6))*clamp(u_particle.x,.65,1.5);
  fade=u_signals[event].y*exp(-max(0.,age)*2.1)*smoothstep(0.,.09,age)*step(age,2.8)*step(0.,age)*clamp(u_light.z*5.,0.,2.);
  data=vec4(p,seed);
 }else if(u_nodeLayer>1.5){
  p=vec3((hash(float(id)*5.1)-.5)*13.,(hash(float(id)*8.3)-.5)*8.,(hash(float(id)*9.7)-.5)*7.);
  p+=vec3(sin(u_neural.x*.2+seed*17.),cos(u_neural.x*.17+seed*21.),sin(u_neural.x*.15+seed*31.))*.32;
  data=vec4(p,seed);fade=.08+u_neural.y*.15;
 }else if(u_nodeLayer>.5){
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
  float t=fract(edge.w+u_neural.x*(.12+hash(edge.w*8.)*.24));p=mix(junction(a),junction(b),t);
  data=vec4(p,edge.w);fade=sin(t*3.14159)*(.18+u_roles.z*.48)*edge.z;
 }else{data=texelFetch(u_nodes,ivec2(id,0),0);p=junction(id);}
 gl_Position=projectWeb(p);v_seed=data.w;
 float pulse=impulse(p/clamp(u_particle.x,.65,1.5)),f=frequency(data.w);v_pulse=pulse;
 v_blur=smoothstep(.6,3.1,abs(gl_Position.w-6.1));v_hero=step(.91,data.w)*step(u_nodeLayer,.5);
 float size=3.8+v_hero*10.+pulse*12.+f*5.+v_blur*25.;
 if(u_nodeLayer>1.5)size=4.+seed*4.+v_blur*18.;
 gl_PointSize=clamp(size*u_pixel*clamp(u_particle.y,.6,1.8),2.,70.);
 v_color=mix(cool(),warm(),clamp(v_hero*.55+pulse*.72+seed*.18,0.,1.));
 v_power=(.20+v_hero*.95+f*1.3+pulse*4.+u_roles.x*.18+u_shimmer*.18)*(1.-v_blur*.78)*fade;
 v_power*=1.+u_roles.y*.65*v_hero*clamp(u_light.z*5.,0.,2.);
 if(gl_Position.w<1.)v_power=0.;
}`;
export const SYNAPSE_NODE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_power,v_blur,v_hero,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float core=exp(-r*r*mix(95.,6.,v_blur)),halo=exp(-r*r*5.)*.14;
 float angle=atan(p.y,p.x),membrane=exp(-pow((r-.40-sin(angle*5.+v_seed*31.+u_neural.x)*.025)*26.,2.));
 float nucleus=exp(-dot(p-vec2(.12,-.08),p-vec2(.12,-.08))*95.);
 vec3 color=v_color*(core+halo+membrane*v_hero*.15*(1.-v_blur))*v_power;
 color+=mix(v_color,vec3(1.),.25)*(core*.27+nucleus*.10*v_hero)*v_power*(1.-v_blur);
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec4 u_roles;uniform vec3 u_palette[6];
void main(){
 vec2 p=v_uv-.5;float haze=exp(-dot(p-vec2(-.28,.18),p-vec2(-.28,.18))*3.2);
 // Store the smooth dark gradient perceptually. A linear RGBA8 intermediate
 // otherwise reduces it to a few values before the final tone mapping pass.
 vec3 tint=u_palette[1]/max(.24,max(u_palette[1].r,max(u_palette[1].g,u_palette[1].b)));
 vec3 linear=mix(vec3(.00065,.0012,.0024),tint*.008,.60)*(.32+haze*.9+u_roles.x*.16);
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 fragColor=vec4(clamp(pow(linear,vec3(1./2.2))+dither/255.,0.,1.),1.);
}`;
