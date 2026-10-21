// Celestial paths share one projection and one integrated motion clock. No
// wall-time-driven animation: pause, freeze and reduced motion retain the sky.
const SKY=`
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light;
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_spectrumLight[48],u_spectrum[48];
const float PI=3.14159265359,TAU=6.28318530718;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
float frequency(float lane){float x=clamp(lane,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(47,i+1)],fract(x));}
vec3 cool(){return mix(vec3(.20,.54,.74),u_palette[1],.20);}
vec3 warm(){return mix(vec3(1.,.54,.22),u_palette[4],.16);}
vec3 camera(vec3 p){p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;return p;}
vec4 projectSky(vec3 p){p=camera(p*clamp(u_particle.x,.6,1.5));float d=5.4+u_camera.z-p.z;return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);}
float radius(float i){return .53+i*.086+floor(i/4.)*.052;}
float phase(float i){return u_world.z*(.28+1.1/(1.+i*.22))+i*2.39996;}
vec3 orbit(float i,float a,float r){
 float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement;
 r*=1.+bass*.085;
 vec3 p=vec3(cos(a)*r,sin(a)*r*(.88+.06*sin(i)),0.);
 p.z=sin(a*3.-u_world.z*.6+i*.23)*lead*.035*r;
 // Most tracks occupy an accretion plane. A few distant inclined paths
 // give the system depth without turning every circle into a uniform cage.
 float tilt=i<24.?1.02+sin(i*.26)*.11: .28+(i-24.)*.48;
 p.yz=rot(tilt+sin(u_world.z*.13+i*.3)*(.045+lead*.12))*p.yz;
 p.xz=rot(i<24.?.12: .5+(i-24.)*.75)*p.xz;
 p.xy=rot(-.22+sin(u_world.z*.10)*.09)*p.xy;
 return p+vec3(0.,.27,0.);
}
vec3 bodyCenter(float i){return i<.5?vec3(0.,.27,0.):orbit(i*3.,phase(i*3.),radius(i*3.));}
float bodyRadius(float i){return i<.5?.21*(1.+u_roles.x*u_movement*.09):.024+pow(hash(i+7.),2.)*.045;}
`;

export const ORRERY_PATH_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform float u_segments,u_pathPart;
out vec3 v_color;out float v_alpha,v_edge;
vec3 path(float i,float t){
 if(u_pathPart<.5)return orbit(i,t*TAU,radius(i));
 float x=(t-.5)*9.,z=(i/35.-.5)*5.;
 float distance=length(vec2(x,z)),bass=u_roles.x*u_movement,lead=u_roles.z*u_movement;
 float y=-1.25-.32*exp(-distance*distance*.35)+sin(distance*3.-u_world.z*1.1)*(.035+bass*.14)*exp(-distance*.24);
 y+=sin(x*1.7+z*.6-u_world.z*.45)*(.035+lead*.065);
 return vec3(x,y,z-1.1);
}
void main(){
 int vertex=gl_VertexID,corner=vertex%6,cell=vertex/6,segments=int(u_segments);
 float i=float(cell/segments),t=(float(cell%segments)+float(corner==1||corner==4||corner==5))/u_segments;
 float side=corner==0||corner==1||corner==4?-1.:1.;
 vec3 p=path(i,t);vec4 clip=projectSky(p),next=projectSky(path(i,t+.001));
 vec2 tangent=(next.xy/next.w-clip.xy/clip.w)*u_resolution;
 vec2 normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.000001));
 float major=1.-step(.5,mod(i,4.)),lane=i/28.;
 float a=t*TAU,arc=pow(.5+.5*cos(a-phase(i)),28.);
 float width=(.50+major*.23+arc*.32)*max(.75,u_pixel);
 clip.xy+=normal*side*width*2./u_resolution*clip.w;gl_Position=clip;v_edge=side;
 float depth=clamp(.65+p.z*.18,.25,1.);
 v_color=mix(cool(),warm(),major*.55+arc*.35);
 v_alpha=(.08+major*.08+arc*(.45+u_roles.z*.32)+frequency(lane)*.52)*depth;
 if(i>=24.){v_alpha*=.38;v_color=mix(cool(),warm(),.5);}
 if(u_pathPart>.5){
  float fade=pow(max(0.,sin(t*PI)),1.3)*(1.-smoothstep(2.,4.,abs((i/35.-.5)*5.)));
  v_alpha=(.028+u_roles.x*.03)*fade;v_color=cool();
 }
}`;
export const ORRERY_PATH_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge;out vec4 fragColor;
void main(){float a=(1.-smoothstep(.2,1.,abs(v_edge)))*v_alpha;fragColor=vec4(v_color*a,a*.28);}`;

export const ORRERY_BODY_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform vec2 u_bodyDetail;
out vec3 v_normal,v_world;out float v_body;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6;vec2 o=vec2(float(c==1||c==4||c==5),float(c==2||c==3||c==5));
 int cols=int(u_bodyDetail.x),cells=cols*int(u_bodyDetail.y),id=cell/cells,at=cell%cells;float a=(float(at%cols)+o.x)/u_bodyDetail.x*TAU,b=(float(at/cols)+o.y)/u_bodyDetail.y*PI;
 vec3 n=vec3(cos(a)*sin(b),cos(b),sin(a)*sin(b));v_body=float(id);v_normal=n;
 v_world=n*bodyRadius(v_body)+bodyCenter(v_body);gl_Position=projectSky(v_world);
}`;
export const ORRERY_BODY_FRAGMENT=`#version 300 es
precision highp float;
${SKY}
in vec3 v_normal,v_world;in float v_body;out vec4 fragColor;
float lattice(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lattice(i),lattice(i+vec3(1,0,0)),f.x),mix(lattice(i+vec3(0,1,0)),lattice(i+vec3(1,1,0)),f.x),f.y),mix(mix(lattice(i+vec3(0,0,1)),lattice(i+vec3(1,0,1)),f.x),mix(lattice(i+vec3(0,1,1)),lattice(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 vec3 n=normalize(v_normal),eye=normalize(vec3(0.,0.,5.4)-camera(v_world)),viewNormal=camera(n);
 vec3 sun=normalize(vec3(-.7,.65,.1));float light=max(0.,dot(n,sun)),rim=pow(1.-max(0.,dot(viewNormal,eye)),3.);
 vec3 p=n;p.xz=rot(u_world.z*.15+v_body)*p.xz;
 float rock=.24+grain(p*8.)*.42+grain(p*29.)*.23+grain(p*110.)*.12;
 float vein=pow(grain(p*24.),7.);
 vec3 tint=mix(cool(),warm(),hash(v_body+4.)*.8);
 vec3 color=tint*(.008+light*.20)*rock+cool()*rim*(.10+light*.6);
 if(v_body<.5){
  color=cool()*(.014+light*.36)*rock+vec3(.54,.81,1.)*rim*(.08+light*1.1);
  color+=warm()*vein*max(0.,.25-light)*(.18+u_roles.y*.35)*u_movement;
 }
 color+=tint*light*frequency(v_body/8.)*.24;
 fragColor=vec4(color,1.);
}`;

export const ORRERY_DUST_VERTEX=`#version 300 es
precision highp float;
${SKY}
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_flare;
void main(){
 float x=a_seed.x,y=a_seed.y,z=a_seed.z,w=a_seed.w,angle=x*TAU,lane=y;
 vec3 p;float shine,size=1.;v_flare=0.;
 if(gl_VertexID<9){
  float body=float(gl_VertexID);p=bodyCenter(body)+normalize(vec3(-.45,.55,.72))*bodyRadius(body)*1.04;size=10.+hash(body)*5.;
  shine=.20+u_roles.y*.18+frequency(body/8.)*.24;v_color=mix(cool(),warm(),hash(body));v_flare=1.;
  if(body<.5){p=bodyCenter(0.);size=210.;shine=.023+u_roles.x*.012;v_color=cool();v_flare=0.;}
 }else if(w<.72){
  float ring=8.+y*14.,r=radius(ring)+(z-.5)*.14;
  float a=angle+u_world.z*(.23+.10*y);
  p=orbit(ring,a,r);p+=vec3(0.,(hash(x*917.)-.5)*.055,0.);
  float crescent=pow(.5+.5*cos(a-1.2),4.);
  shine=(.018+crescent*.18)*( .5+pow(z,7.)*2.5);
  // Drums lift only the sparse debris, keeping the orbital spine legible.
  p+=normalize(p-vec3(0.,.27,0.))*(u_roles.y*u_movement*.075*pow(z,4.));
  shine*=1.+u_roles.y*.9;size=.65+z*.7;
  v_color=mix(cool(),warm(),.35+crescent*.6);
 }else if(w<.91){
  float comet=floor(y*3.),tail=x,a=phase(7.+comet*7.)-tail*.85;
  p=orbit(7.+comet*7.,a,radius(7.+comet*7.));
  p+=vec3(sin(y*199.),cos(z*173.),sin(z*281.))*(.002+tail*.023);
  shine=pow(1.-tail,4.)*(.035+u_roles.z*.08);size=.7+pow(1.-tail,8.)*1.6;
  v_color=mix(warm(),vec3(.66,.86,1.),comet/2.);
 }else{
  p=vec3((x-.5)*10.,(y-.5)*6.,-3.-z*6.);shine=.015+pow(z,18.)*.26;size=.6+pow(z,12.)*1.5;
  v_color=mix(cool(),vec3(.83,.86,.91),y);shine*=.8+.2*sin(u_world.z*.4+x*40.);
 }
 gl_Position=projectSky(p);float depth=max(1.,gl_Position.w);
 gl_PointSize=clamp(size*u_pixel*5./depth*u_particle.y,1.,256.);
 v_alpha=(shine+frequency(lane)*.04)*clamp(.7+u_light.y*.4,.7,1.4)*smoothstep(.2,1.,depth);
}`;
export const ORRERY_DUST_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_flare;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float shape=exp(-r*r*6.);
 if(v_flare>.5)shape+=exp(-abs(p.x)*38.-abs(p.y)*3.)*.55+exp(-abs(p.y)*38.-abs(p.x)*3.)*.55;
 float a=v_alpha*shape;fragColor=vec4(v_color*a,a*.16);}`;

export const ORRERY_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;
uniform vec4 u_roles;
float starHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 float haze=exp(-dot(p-vec2(0.,.10),p-vec2(0.,.10))*12.);
 vec3 color=vec3(.0015,.003,.006)+vec3(.008,.020,.032)*haze;
 float edge=exp(-pow((p.y-.36+.10*p.x*p.x)*160.,2.))*exp(-p.x*p.x*1.8);
 color+=vec3(.10,.20,.28)*edge*.16;
 vec2 grid=p*85.,cell=floor(grid),offset=vec2(starHash(cell+17.),starHash(cell+31.))*.65+.175;
 float seed=starHash(cell),starDistance=length((fract(grid)-offset)/max(fwidth(grid),vec2(.001)));
 float stars=step(.979,seed)*exp(-starDistance*starDistance/(.32+pow(seed,50.)*.8));
 color+=mix(vec3(.14,.27,.40),vec3(.52,.38,.24),starHash(cell+41.))*stars*(.03+.45*pow(starHash(cell+51.),6.));
 fragColor=vec4(color,1.);
}`;
