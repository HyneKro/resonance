// Straight polygon links, sparse facets and ruled micro-filaments share the
// moving graph. Depth-of-field turns distant points into soft photographic bokeh.
const WEB=`
uniform sampler2D u_nodes,u_edges,u_facets;
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_signals[8],u_origins[8],u_neural,u_neuralDrive,u_neuralTone,u_neuralStyle,u_neuralBands[48];
uniform vec3 u_neuralAccents;
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_signalTime,u_spectrumLight[48],u_shimmer;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 pigment(vec3 c){return pow(max(vec3(0.),c/max(.24,max(c.r,max(c.g,c.b)))),vec3(1.8));}
vec3 cool(){return mix(vec3(.025,.64,1.),pigment(u_palette[1]),.74);}
vec3 warm(){return mix(vec3(.64,.075,1.),pigment(u_palette[4]),.74);}
vec3 webColor(vec3 p,float seed){float blend=clamp(.5+p.x*.09+sin(p.y*.7+p.z*.4)*.18+seed*.16,0.,1.);return mix(cool(),warm(),clamp(blend+(u_neuralTone.x-.5)*.18+sin(p.x*.3-u_neural.x*.08)*u_neuralTone.y*.25,0.,1.));}
vec4 notes(float t){float x=clamp(t,0.,1.)*47.;int i=int(x);return mix(u_neuralBands[i],u_neuralBands[min(47,i+1)],fract(x));}
float chargeFraction(vec4 edge,float copy){return fract(edge.w+copy*.473+u_neural.x*(.18+u_neural.y*.50+u_roles.z*.30+u_neuralTone.y*.90));}
float frequency(float t){float x=clamp(t,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(47,i+1)],fract(x));}
float impulse(vec3 p){
 float light=0.;for(int i=0;i<8;i++){
  vec4 event=u_signals[i];float age=u_signalTime-event.x;
  float travel=length(p-u_origins[i].xyz)-age*(2.45+event.w*.65);
  light+=event.y*exp(-travel*travel*5.5)*exp(-max(0.,age)*.46)*step(0.,age);
 }return min(2.8,light)*clamp(u_light.z*9.,0.,3.);
}
vec3 junction(int id){
 vec4 data=texelFetch(u_nodes,ivec2(id,0),0);vec3 p=data.xyz;
 vec4 note=notes(data.w);float time=u_neural.x;
 vec3 normal=normalize(vec3(.18,sin(p.x*.65+p.z*.3+time*.28),cos(p.x*.5-p.y*.35-time*.23)));
 p+=normal*(sin(p.x*1.3+time*1.4)*note.x*.22+sin(p.z*2.-time*1.8)*note.y*.22+note.w*.38)*u_movement*u_neuralStyle.x;
 vec3 push=vec3(0.);for(int i=0;i<8;i++){
  float age=u_signalTime-u_signals[i].x;vec3 delta=p-u_origins[i].xyz;float r=length(delta),front=r-age*(2.45+u_signals[i].w*.65);
  float crest=exp(-front*front*3.5)*sin(front*4.)*.58;
  float echo=exp(-pow(front+1.05,2.)*4.)*sin((front+1.05)*5.)*.22;
  push+=delta/max(.1,r)*(crest+echo)*u_signals[i].y*exp(-max(0.,age)*.52)*step(0.,age)*clamp(u_light.z*9.,0.,2.);
 }return (p+push*u_movement*clamp(u_neuralStyle.z*1.8,0.,2.))*clamp(u_particle.x,.65,1.5);
}
vec4 projectWeb(vec3 p){
 p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;
 float d=max(.15,6.4+u_camera.z-p.z);return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);
}
`;
export const SYNAPSE_THREAD_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_segments,u_threadLayer,u_weaveCount,u_chargeCopies;
out vec3 v_color;out float v_alpha,v_edge,v_t,v_seed,v_pulse;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments),id=cell/segments;
 float t=(float(cell%segments)+float(c==1||c==4||c==5))/u_segments,side=c==0||c==1||c==4?-1.:1.;
 vec3 pa,pb,p;float fade,seed;
 if(u_threadLayer>1.5){
  int copies=max(1,int(u_chargeCopies)),copy=id%copies;id/=copies;
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);pa=junction(int(edge.x));pb=junction(int(edge.y));
  float head=chargeFraction(edge,float(copy)),tail=.055+u_neural.y*.17+u_neuralTone.y*.22;
  float along=clamp(head-tail*(1.-t),0.,1.);p=mix(pa,pb,along);
  fade=edge.z*sin(head*3.14159)*t*t*(.15+u_roles.z*.70+u_neuralTone.y);seed=edge.w+float(copy)*.17;
 }else if(u_threadLayer>.5){
  int strand=id%int(u_weaveCount);id/=int(u_weaveCount);
  vec4 face=texelFetch(u_facets,ivec2(id%1024,id/1024),0);
  vec3 a=junction(int(face.x)),b=junction(int(face.y)),cpos=junction(int(face.z));
  seed=hash(face.x*3.7+face.y*5.1+face.z);float f=(float(strand)+1.)/(u_weaveCount+1.);
  // Ruled strands bow inside occasional triangular patches, giving the fine
  // woven fans in the reference while leaving the main polygon links straight.
  pa=mix(a,b,f);pb=mix(a,cpos,f);p=mix(pa,pb,t);
  vec3 normal=normalize(cross(b-a,cpos-a)+vec3(.00001));
  vec4 note=notes(seed);
  p+=normal*sin(t*3.14159)*sin(f*3.14159)*(.025+u_roles.z*.20+u_roles.w*.18+u_neuralDrive.w*.10+note.x*.18)*sin(f*5.+u_neural.x*1.4+seed*9.);
  fade=face.w*step(.38,seed);seed+=f*.12;
 }else{
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);
  pa=junction(int(edge.x));pb=junction(int(edge.y));p=mix(pa,pb,t);fade=edge.z;seed=edge.w;
 }
 vec4 clip=projectWeb(p),ca=projectWeb(pa),cb=projectWeb(pb);
 vec2 tangent=(cb.xy/cb.w-ca.xy/ca.w)*u_resolution,normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float blur=smoothstep(.55,2.6,abs(clip.w-6.6)),pulse=impulse(p/clamp(u_particle.x,.65,1.5)),lit=frequency(fract(seed*3.7));
 vec4 note=notes(fract(seed*3.7));float attack=note.w*clamp(u_light.z*9.,0.,3.);
 float width=mix(.95,.55,min(1.,u_threadLayer))+blur*1.2+u_neural.y*.22+pulse*.18;
 if(u_threadLayer>1.5)width=1.+u_neuralDrive.z*.7;
 clip.xy+=normal*side*width*max(.7,u_pixel)*2./u_resolution*clip.w;gl_Position=clip;
 v_edge=side;v_t=t;v_seed=seed;v_pulse=pulse;v_color=webColor(p,seed);
 v_alpha=(.025+lit*.40+note.x*.18+note.y*.22+note.z*.24+attack*1.5+u_roles.x*.28+pulse*1.35+u_roles.w*.12+u_neuralDrive.z*.24+u_neuralAccents.y*.32*clamp(u_light.z*9.,0.,3.))*fade*exp(-blur*3.8);
 v_alpha*=mix(.08,1.,smoothstep(1.5,4.5,clip.w))*(1.-smoothstep(.9,1.8,length(pa-pb))*.80);
 v_alpha*=(u_threadLayer>1.5?2.2:mix(1.,.65,u_threadLayer))*u_neuralTone.w;
}`;
export const SYNAPSE_THREAD_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge,v_t,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural,u_neuralStyle;
void main(){
 float line=exp(-v_edge*v_edge*1.8),core=exp(-v_edge*v_edge*24.);
 float charge=pow(.5+.5*sin(v_t*(16.+u_neural.y*22.)-u_neural.x*(8.+u_neural.y*9.)+v_seed*61.),18.);
 float micro=pow(.5+.5*sin(v_t*130.+v_seed*81.-u_neural.x*2.),22.);
 vec3 color=v_color*(line*.88+core*(.32+charge*1.4+micro*.25*u_neuralStyle.y))*v_alpha;
 color+=mix(v_color,vec3(1.),.30)*core*charge*v_pulse*v_alpha*.75;
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_FACET_VERTEX=`#version 300 es
precision highp float;
${WEB}
out vec3 v_color;out float v_alpha,v_charge,v_seed;out vec3 v_bary;
void main(){
 int id=gl_VertexID/3,corner=gl_VertexID%3;vec4 face=texelFetch(u_facets,ivec2(id%1024,id/1024),0);
 int node=int(corner==0?face.x:corner==1?face.y:face.z);vec3 p=junction(node);gl_Position=projectWeb(p);
 float seed=hash(face.x*3.7+face.y*5.1+face.z),pulse=impulse(p/clamp(u_particle.x,.65,1.5));
 float blur=smoothstep(.5,2.8,abs(gl_Position.w-6.6));
 vec4 note=notes(seed);v_color=webColor(p,seed);v_charge=pulse+note.w*clamp(u_light.z*9.,0.,3.);v_seed=seed;
 v_alpha=(.003+frequency(seed)*.014+note.y*.025+u_roles.w*.020+note.w*.045+pulse*.050)*face.w*step(.38,seed)*exp(-blur*3.)*u_neuralTone.w;
 v_bary=corner==0?vec3(1.,0.,0.):corner==1?vec3(0.,1.,0.):vec3(0.,0.,1.);
}`;
export const SYNAPSE_FACET_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color,v_bary;in float v_alpha,v_charge,v_seed;out vec4 fragColor;
uniform vec4 u_neural,u_neuralStyle;
void main(){
 float edge=min(v_bary.x,min(v_bary.y,v_bary.z));
 float contour=pow(.5+.5*sin((v_bary.x*3.+v_bary.y*2.)*55.-u_neural.x*3.+v_seed*19.),20.);
 float rim=exp(-edge*100.)*v_charge*.65;
 vec3 color=v_color*v_alpha*(.45+smoothstep(0.,.25,edge)*.55+contour*.55*u_neuralStyle.y+rim);
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_NODE_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_nodeLayer,u_chargeCopies;
out vec3 v_color;out float v_power,v_blur,v_hero,v_seed,v_pulse;
void main(){
 int id=gl_VertexID;vec4 data;vec3 p;float fade=1.;float seed=hash(float(id)+113.);
 if(u_nodeLayer>2.5){
  int event=id%8;float age=u_signalTime-u_signals[event].x;
  float z=hash(float(id)*3.7)*2.-1.,angle=hash(float(id)*7.9)*6.283185;
  vec3 dir=vec3(sqrt(max(0.,1.-z*z))*cos(angle),z,sqrt(max(0.,1.-z*z))*sin(angle));
  vec3 curl=vec3(sin(seed*71.+age*2.),cos(seed*43.+age*1.7),sin(seed*31.-age*2.3));
  p=(u_origins[event].xyz+dir*age*(1.2+seed*2.2+u_signals[event].y*.7)+curl*age*.30)*clamp(u_particle.x,.65,1.5);
  fade=u_signals[event].y*exp(-max(0.,age)*1.65)*smoothstep(0.,.09,age)*step(age,2.8)*step(0.,age)*clamp(u_light.z*9.,0.,3.);
  data=vec4(p,seed);
 }else if(u_nodeLayer>1.5){
  p=vec3((hash(float(id)*5.1)-.5)*13.,(hash(float(id)*8.3)-.5)*8.,(hash(float(id)*9.7)-.5)*7.);
  p+=vec3(sin(u_neural.x*.2+seed*17.),cos(u_neural.x*.17+seed*21.),sin(u_neural.x*.15+seed*31.))*.32;
  data=vec4(p,seed);fade=(.025+u_neural.y*.10+u_shimmer*.12)*u_neuralStyle.w;
 }else if(u_nodeLayer>.5){
  int copies=max(1,int(u_chargeCopies)),copy=id%copies;id/=copies;
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
  float t=chargeFraction(edge,float(copy));p=mix(junction(a),junction(b),t);
  data=vec4(p,edge.w+float(copy)*.17);fade=sin(t*3.14159)*(.25+u_roles.z*.75+u_neuralTone.y)*edge.z;
 }else{data=texelFetch(u_nodes,ivec2(id,0),0);p=junction(id);}
 gl_Position=projectWeb(p);v_seed=data.w;
 float pulse=impulse(p/clamp(u_particle.x,.65,1.5)),f=frequency(fract(data.w));v_pulse=pulse;
 vec4 note=notes(fract(data.w));float attack=note.w*clamp(u_light.z*9.,0.,3.);
 v_blur=smoothstep(.55,2.6,abs(gl_Position.w-6.6));v_hero=smoothstep(.89,.99,data.w)*step(u_nodeLayer,.5)*(.35+u_shimmer*.65);
 float size=3.4+v_hero*9.+pulse*6.+f*3.+attack*3.+v_blur*(11.+seed*15.);
 if(u_nodeLayer>1.5)size=3.+seed*3.+v_blur*22.;
 gl_PointSize=clamp(size*u_pixel*clamp(u_particle.y,.6,1.8),2.,70.);
 v_color=webColor(p,seed);
 v_power=(.10+v_hero*.9+f*1.2+note.x*.85+note.y*.55+note.z*.8+attack*2.4+pulse*4.3+u_neuralDrive.x*.3+u_shimmer*.40+u_neuralAccents.z*.50*clamp(u_light.z*9.,0.,3.))*mix(1.,.035,v_blur)*fade;
 v_power*=(1.+u_roles.y*.65*v_hero*clamp(u_light.z*9.,0.,3.))*u_neuralTone.w;
 if(gl_Position.w<1.)v_power=0.;
}`;
export const SYNAPSE_NODE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_power,v_blur,v_hero,v_seed,v_pulse;out vec4 fragColor;
uniform vec4 u_neural,u_neuralStyle;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float core=exp(-r*r*mix(105.,8.,v_blur));
 // A filled, softly defocused hexagonal aperture; no cellular rims or nuclei.
 float angle=atan(p.y,p.x),hex=r*cos(mod(angle+3.14159/6.,3.14159/3.)-3.14159/6.);
 float bokeh=(1.-smoothstep(.63,.86,hex))*v_blur*.075;
 float halo=exp(-r*r*6.)*.10;
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
 linear*=.75+u_roles.x*.65+u_neural.y*.25;
 // Perceptual storage plus static sub-code dithering keeps the broad atmospheric
 // gradients smooth through both the float and RGBA8 intermediate targets.
 float dither=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5;
 fragColor=vec4(clamp(pow(linear,vec3(1./2.2))+dither/255.,0.,1.),1.);
}`;
