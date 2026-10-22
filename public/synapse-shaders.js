// Straight polygon links, sparse facets and ruled micro-filaments share the
// moving graph. Depth-of-field turns distant points into soft photographic bokeh.
const WEB=`
uniform sampler2D u_nodes,u_edges,u_facets;
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_signals[8],u_origins[8],u_neural;
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_signalTime,u_spectrumLight[48],u_shimmer;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 pigment(vec3 c){return pow(max(vec3(0.),c/max(.24,max(c.r,max(c.g,c.b)))),vec3(1.8));}
vec3 cool(){return mix(vec3(.025,.64,1.),pigment(u_palette[1]),.74);}
vec3 warm(){return mix(vec3(.64,.075,1.),pigment(u_palette[4]),.74);}
vec3 webColor(vec3 p,float seed){float blend=clamp(.5+p.x*.09+sin(p.y*.7+p.z*.4)*.18+seed*.16,0.,1.);return mix(cool(),warm(),blend);}
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
uniform float u_segments,u_threadLayer,u_weaveCount;
out vec3 v_color;out float v_alpha,v_edge,v_t,v_seed,v_pulse;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments),id=cell/segments;
 float t=(float(cell%segments)+float(c==1||c==4||c==5))/u_segments,side=c==0||c==1||c==4?-1.:1.;
 vec3 pa,pb,p;float fade,seed;
 if(u_threadLayer>.5){
  int strand=id%int(u_weaveCount);id/=int(u_weaveCount);
  vec4 face=texelFetch(u_facets,ivec2(id%1024,id/1024),0);
  vec3 a=junction(int(face.x)),b=junction(int(face.y)),cpos=junction(int(face.z));
  seed=hash(face.x*3.7+face.y*5.1+face.z);float f=(float(strand)+1.)/(u_weaveCount+1.);
  // Ruled strands bow inside occasional triangular patches, giving the fine
  // woven fans in the reference while leaving the main polygon links straight.
  pa=mix(a,b,f);pb=mix(a,cpos,f);p=mix(pa,pb,t);
  vec3 normal=normalize(cross(b-a,cpos-a)+vec3(.00001));
  p+=normal*sin(t*3.14159)*sin(f*3.14159)*(.025+u_roles.z*.055);
  fade=face.w*step(.57,seed);seed+=f*.12;
 }else{
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);
  pa=junction(int(edge.x));pb=junction(int(edge.y));p=mix(pa,pb,t);fade=edge.z;seed=edge.w;
 }
 vec4 clip=projectWeb(p),ca=projectWeb(pa),cb=projectWeb(pb);
 vec2 tangent=(cb.xy/cb.w-ca.xy/ca.w)*u_resolution,normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float blur=smoothstep(.55,2.6,abs(clip.w-6.6)),pulse=impulse(p/clamp(u_particle.x,.65,1.5)),lit=frequency(fract(seed*3.7));
 float width=mix(.95,.55,u_threadLayer)+blur*1.2;
 clip.xy+=normal*side*width*max(.7,u_pixel)*2./u_resolution*clip.w;gl_Position=clip;
 v_edge=side;v_t=t;v_seed=seed;v_pulse=pulse;v_color=webColor(p,seed);
 v_alpha=(.035+lit*.16+u_roles.x*.025+pulse*.35+u_roles.w*.025)*fade*exp(-blur*3.8);
 v_alpha*=mix(.08,1.,smoothstep(1.5,4.5,clip.w))*(1.-smoothstep(.9,1.8,length(pa-pb))*.80);
 v_alpha*=mix(1.,.55,u_threadLayer);
}`;
export const SYNAPSE_THREAD_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge,v_t,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural;
void main(){
 float line=exp(-v_edge*v_edge*1.8),core=exp(-v_edge*v_edge*24.);
 float charge=pow(.5+.5*sin(v_t*12.-u_neural.x*6.+v_seed*61.),24.);
 vec3 color=v_color*(line*.82+core*(.22+charge*.6))*v_alpha;
 color+=mix(v_color,vec3(1.),.30)*core*charge*v_pulse*v_alpha*.30;
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_FACET_VERTEX=`#version 300 es
precision highp float;
${WEB}
out vec3 v_color;out float v_alpha;out vec3 v_bary;
void main(){
 int id=gl_VertexID/3,corner=gl_VertexID%3;vec4 face=texelFetch(u_facets,ivec2(id%1024,id/1024),0);
 int node=int(corner==0?face.x:corner==1?face.y:face.z);vec3 p=junction(node);gl_Position=projectWeb(p);
 float seed=hash(face.x*3.7+face.y*5.1+face.z),pulse=impulse(p/clamp(u_particle.x,.65,1.5));
 float blur=smoothstep(.5,2.8,abs(gl_Position.w-6.6));
 v_color=webColor(p,seed);v_alpha=(.004+frequency(seed)*.009+pulse*.014)*face.w*step(.62,seed)*exp(-blur*3.);
 v_bary=corner==0?vec3(1.,0.,0.):corner==1?vec3(0.,1.,0.):vec3(0.,0.,1.);
}`;
export const SYNAPSE_FACET_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color,v_bary;in float v_alpha;out vec4 fragColor;
void main(){float edge=min(v_bary.x,min(v_bary.y,v_bary.z));fragColor=vec4(v_color*v_alpha*(.45+smoothstep(0.,.25,edge)*.55),0.);}`;

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
  data=vec4(p,seed);fade=.035+u_neural.y*.075;
 }else if(u_nodeLayer>.5){
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
  float t=fract(edge.w+u_neural.x*(.12+hash(edge.w*8.)*.24));p=mix(junction(a),junction(b),t);
  data=vec4(p,edge.w);fade=sin(t*3.14159)*(.18+u_roles.z*.48)*edge.z;
 }else{data=texelFetch(u_nodes,ivec2(id,0),0);p=junction(id);}
 gl_Position=projectWeb(p);v_seed=data.w;
 float pulse=impulse(p/clamp(u_particle.x,.65,1.5)),f=frequency(data.w);v_pulse=pulse;
 v_blur=smoothstep(.55,2.6,abs(gl_Position.w-6.6));v_hero=step(.97,data.w)*step(u_nodeLayer,.5);
 float size=3.4+v_hero*8.+pulse*4.+f*2.5+v_blur*(11.+seed*15.);
 if(u_nodeLayer>1.5)size=3.+seed*3.+v_blur*22.;
 gl_PointSize=clamp(size*u_pixel*clamp(u_particle.y,.6,1.8),2.,70.);
 v_color=webColor(p,seed);
 v_power=(.15+v_hero*.65+f*.80+pulse*1.9+u_roles.x*.12+u_shimmer*.10)*mix(1.,.16,v_blur)*fade;
 v_power*=1.+u_roles.y*.65*v_hero*clamp(u_light.z*5.,0.,2.);
 if(gl_Position.w<1.)v_power=0.;
}`;
export const SYNAPSE_NODE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_power,v_blur,v_hero,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float core=exp(-r*r*mix(105.,8.,v_blur));
 // A filled, softly defocused hexagonal aperture; no cellular rims or nuclei.
 float angle=atan(p.y,p.x),hex=r*cos(mod(angle+3.14159/6.,3.14159/3.)-3.14159/6.);
 float bokeh=(1.-smoothstep(.63,.86,hex))*v_blur*.075;
 float halo=exp(-r*r*7.)*.055;
 float star=(exp(-abs(p.x)*75.)*exp(-abs(p.y)*5.)+exp(-abs(p.y)*75.)*exp(-abs(p.x)*5.))*v_hero*(1.-v_blur)*.28;
 vec3 color=v_color*(core+halo+bokeh+star)*v_power*mix(1.,step(.55,v_seed),v_blur);
 color+=mix(v_color,vec3(1.),.70)*core*v_power*.30*(1.-v_blur);
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec4 u_roles,u_neural;uniform vec3 u_palette[6];
void main(){
 vec2 p=v_uv-.5;float drift=sin(u_neural.x*.10)*.055;
 float cyan=exp(-dot((p-vec2(-.32,.16+drift))*vec2(1.2,1.8),(p-vec2(-.32,.16+drift))*vec2(1.2,1.8))*3.);
 float violet=exp(-dot((p-vec2(.37,-.24-drift))*vec2(1.5,1.25),(p-vec2(.37,-.24-drift))*vec2(1.5,1.25))*3.);
 vec3 a=u_palette[1]/max(.24,max(u_palette[1].r,max(u_palette[1].g,u_palette[1].b)));
 vec3 b=u_palette[4]/max(.24,max(u_palette[4].r,max(u_palette[4].g,u_palette[4].b)));
 vec3 linear=vec3(.0012,.0013,.0032)+mix(vec3(.001,.018,.035),a*.019,.78)*cyan+mix(vec3(.018,.001,.037),b*.018,.78)*violet;
 linear*=.80+u_roles.x*.22;
 // Perceptual storage plus static sub-code dithering keeps the broad atmospheric
 // gradients smooth through both the float and RGBA8 intermediate targets.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 fragColor=vec4(clamp(pow(linear,vec3(1./2.2))+dither/255.,0.,1.),1.);
}`;
