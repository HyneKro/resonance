// Astra: 48 measured frequency orbits around a living photosphere. Everything
// in world space shares the camera, including prominences and comet trails.
const SKY=`
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_orbitBands[48],u_orbitMotion[48],u_astraEvents[12];
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_astraTime,u_spectrumLight[48];
const float PI=3.14159265359,TAU=6.28318530718;
const vec3 CENTER=vec3(0.,.22,0.);
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 direction(float n){float z=hash(n+8.)*2.-1.,a=hash(n+31.)*TAU;return vec3(sqrt(1.-z*z)*cos(a),z,sqrt(1.-z*z)*sin(a));}
vec4 band(float i){return u_orbitBands[int(clamp(floor(i),0.,47.))];}
float frequency(float i){return u_spectrumLight[int(clamp(floor(i),0.,47.))];}
vec3 warm(){vec3 tint=mix(vec3(1.,.27,.045),vec3(.38,.64,1.),clamp(u_roles.z*.72+u_roles.w*.20,0.,.8));return mix(tint,max(vec3(.08),u_palette[4]),.30);}
vec3 cool(){return mix(vec3(.16,.40,.65),max(vec3(.04),u_palette[1]),.42);}
vec3 camera(vec3 p){p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;return p;}
vec4 projectSky(vec3 p){p=camera(p*clamp(u_particle.x,.6,1.5));float d=5.4+u_camera.z-p.z;return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);}
float radius(float i){return .57+i*.051+floor(i/8.)*.04;}
float phase(float i){return u_world.z*(.22+.9/(1.+i*.12))+i*2.39996;}
float starRadius(){return .285*(1.+u_roles.x*u_movement*.075);}
vec3 orbit(float i,float a,float r){
 float amplitude=band(i).x*u_movement;
 r+=amplitude*(.035+.105*(.5+.5*sin(a*3.+i*.21-u_world.z)));
 vec3 p=vec3(cos(a)*r,sin(a)*r*.91,sin(a*4.+i*.38-u_world.z*.6)*amplitude*.12);
 float tilt=i<42.?1.02+sin(i*.16)*.10:.42+(i-42.)*.32;
 p.yz=rot(tilt)*p.yz;p.xz=rot(i<42.?.12:.5+(i-42.)*.48)*p.xz;p.xy=rot(-.22)*p.xy;
 return p+CENTER;
}
float bodyLane(float i){return mod(i*5.37,46.);}
float bodyPhase(float i){return phase(i)+u_orbitMotion[int(bodyLane(i))].x+hash(i)*TAU;}
vec3 planetCenter(float i,float lag){float lane=bodyLane(i);return orbit(lane,bodyPhase(i)-lag,radius(lane)+(hash(i+41.)-.5)*.12);}
vec3 bodyCenter(float i){
 if(i<.5)return CENTER;
 if(i>8.5&&i<16.5){float parent=i-8.;vec3 p=vec3(cos(bodyPhase(parent)*2.),sin(bodyPhase(parent)*2.),sin(bodyPhase(parent)*1.7)*.4)*.10;return planetCenter(parent,0.)+p;}
 return planetCenter(i,0.);
}
float bodyRadius(float i){return i<.5?starRadius():i<8.5?.027+pow(hash(i+7.),2.)*.041:i<16.5?.009+hash(i)*.009:.009+pow(hash(i+7.),3.)*.022;}
`;

export const ASTRA_PATH_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform float u_segments,u_pathPart;
out vec3 v_color;out float v_alpha,v_edge;
vec3 path(float i,float t){
 if(u_pathPart<1.5){
  float age=max(0.,u_astraTime-band(i).y),echo=u_pathPart>.5?age*(.20+band(i).w*.4):0.;
  return orbit(i,t*TAU,radius(i)+echo);
 }
 // Magnetic loops leave and return to the surface; no flat sprite flames.
 vec3 axis=direction(i+19.),a=normalize(cross(axis,vec3(.13,1.,.07))),b=cross(axis,a);
 float growth=.07+.16*pow(.5+.5*sin(u_world.z*.85+i*2.),3.)+u_roles.y*u_movement*.13;
 float angle=(t-.5)*.60;
 return CENTER+normalize(axis+a*sin(angle)+b*cos(t*PI)*.07)*(starRadius()+sin(t*PI)*(growth+sin(t*13.+i+u_world.z)*.008));
}
void main(){
 int corner=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments);
 float i=float(cell/segments),t=(float(cell%segments)+float(corner==1||corner==4||corner==5))/u_segments;
 float side=corner==0||corner==1||corner==4?-1.:1.;
 vec3 p=path(i,t);vec4 clip=projectSky(p),next=projectSky(path(i,t+.001));
 vec2 tangent=(next.xy/next.w-clip.xy/clip.w)*u_resolution;
 vec2 normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.000001));
 float major=1.-step(.5,mod(i,8.)),arc=pow(.5+.5*cos(t*TAU-phase(i)),36.);
 float width=(.46+major*.16+band(i).x*.27)*max(.75,u_pixel);
 v_alpha=(.055+major*.06+arc*.16+band(i).x*.28+frequency(i)*.22)*clamp(.65+p.z*.12,.30,1.);
 v_color=mix(cool(),warm(),major*.5+band(i).x*.45);
 if(i>=42.)v_alpha*=.48;
 if(u_pathPart>.5&&u_pathPart<1.5){
  float age=max(0.,u_astraTime-band(i).y);
  v_alpha=band(i).z*exp(-age*2.6)*smoothstep(0.,.1,age)*(1.-smoothstep(1.1,1.7,age))*.34*u_movement*min(1.5,u_light.z);
  width*=1.4;v_color=mix(warm(),cool(),age*.5);
 }
 if(u_pathPart>1.5){v_alpha=sin(t*PI)*(.25+u_roles.x*.20+u_roles.y*.4)*(.28+.72*pow(.5+.5*sin(u_world.z+i),2.));v_color=warm()*1.9;width=(u_pathPart>2.5?3.6:.8)*max(.75,u_pixel);if(u_pathPart>2.5)v_alpha*=.18;}
 clip.xy+=normal*side*width*2./u_resolution*clip.w;gl_Position=clip;v_edge=side;
}`;
export const ASTRA_PATH_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge;out vec4 fragColor;
void main(){float a=(1.-smoothstep(.12,1.,abs(v_edge)))*v_alpha;fragColor=vec4(v_color*a,a*.08);}`;

export const ASTRA_BODY_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform vec2 u_bodyDetail;
out vec3 v_normal,v_world;out float v_body;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6;vec2 o=vec2(float(c==1||c==4||c==5),float(c==2||c==3||c==5));
 int cols=int(u_bodyDetail.x),cells=cols*int(u_bodyDetail.y),id=cell/cells,at=cell%cells;float a=(float(at%cols)+o.x)/u_bodyDetail.x*TAU,b=(float(at/cols)+o.y)/u_bodyDetail.y*PI;
 vec3 n=vec3(cos(a)*sin(b),cos(b),sin(a)*sin(b));v_body=float(id);v_normal=n;
 float rock=id<=16?1.:.84+.13*sin(n.x*6.+float(id))+.11*cos(n.z*7.-n.y*5.);
 vec3 center=bodyCenter(v_body);

 v_world=n*bodyRadius(v_body)*rock+center;gl_Position=projectSky(v_world);
}`;
export const ASTRA_BODY_FRAGMENT=`#version 300 es
precision highp float;
${SKY}
in vec3 v_normal,v_world;in float v_body;out vec4 fragColor;
float lattice(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lattice(i),lattice(i+vec3(1,0,0)),f.x),mix(lattice(i+vec3(0,1,0)),lattice(i+vec3(1,1,0)),f.x),f.y),mix(mix(lattice(i+vec3(0,0,1)),lattice(i+vec3(1,0,1)),f.x),mix(lattice(i+vec3(0,1,1)),lattice(i+vec3(1,1,1)),f.x),f.y),f.z);}
void main(){
 vec3 n=normalize(v_normal),eye=normalize(vec3(0.,0.,5.4+u_camera.z)-camera(v_world)),viewNormal=camera(n);
 float facing=max(0.,dot(viewNormal,eye)),rim=pow(1.-facing,3.);
 vec3 p=n;p.xz=rot(u_world.z*.17+v_body)*p.xz;
 float rock=.24+grain(p*8.)*.42+grain(p*29.)*.23+grain(p*110.)*.12;
 vec3 tint=mix(cool(),warm(),hash(v_body+4.)*.7);
 float light=max(0.,dot(n,normalize(CENTER-v_world)));
 vec3 color=tint*(.025+light*.65)*rock+cool()*rim*.055;
 if(v_body<.5){
  vec3 flow=p*7.+vec3(0.,u_world.z*.25,0.);float warp=grain(flow)*2.;
  float cells=grain(p*28.+warp),filaments=pow(1.-abs(cells*2.-1.),7.);
  float spots=smoothstep(.64,.81,grain(p*10.+warp));
  float heat=(.33+cells*.42+filaments*.55)*(1.-spots*.68)*(.45+.55*sqrt(facing));
  color=mix(warm(),vec3(1.,.89,.67),filaments*.48)*heat*(1.3+u_roles.x*.65)+warm()*rim*.24;
 }else color+=warm()*light*band(mod(v_body*5.37,46.)).x*.25;
 fragColor=vec4(color,1.);
}`;

export const ASTRA_DUST_VERTEX=`#version 300 es
precision highp float;
${SKY}
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_flare;
void main(){
 float x=a_seed.x,y=a_seed.y,z=a_seed.z,w=a_seed.w;
 vec3 p;float shine=0.,size=1.;v_flare=0.;
 if(gl_VertexID==0){
  p=CENTER;size=450.;shine=.050+u_roles.x*.022;v_color=warm();
 }else if(w<.28){
  // Thin solar wind with a small number of hotter streamers.
  float age=fract(x+u_world.z*(.08+y*.025)),r=starRadius()+age*(.35+z*.65);
  vec3 dir=direction(y*1821.);dir.xz=rot(u_world.z*.12+age*.5)*dir.xz;
  p=CENTER+dir*r;shine=pow(1.-age,3.)*(.035+pow(z,8.)*.35)*(1.+u_roles.x*.45);
  size=.65+pow(z,9.)*1.7;v_color=mix(warm(),vec3(1.,.83,.58),pow(1.-age,3.)*.6);
 }else if(w<.48){
  // Twelve bounded burst packets: real births, ballistic travel and a fade.
  vec4 event=u_astraEvents[int(floor(y*12.))];float age=u_astraTime-event.x;
  float live=step(0.,age)*(1.-smoothstep(1.4,2.5,age))*event.y;
  vec3 axis=direction(event.z*51.+7.),dir=normalize(axis+direction(x*1023.)*(.12+z*.6));
  float travel=max(0.,age)*(.45+z*.85)*( .5+event.y)*u_movement;
  p=CENTER+dir*(starRadius()+travel);p+=cross(axis,dir)*travel*travel*.16;
  shine=live*(.10+pow(z,5.)*.55)*min(1.5,u_light.z);size=.7+z*1.3;v_color=mix(warm(),vec3(1.,.88,.71),pow(1.-clamp(age/2.5,0.,1.),4.)*.65);
 }else if(w<.76){
  float ring=10.+y*29.,a=x*TAU+u_world.z*(.16+y*.12);
  p=orbit(ring,a,radius(ring)+(z-.5)*.14);p+=direction(x*871.)*.025;
  p+=normalize(p-CENTER)*band(ring).x*u_movement*.08;
  shine=(.012+pow(z,7.)*.23)*(1.+band(ring).x*.8);size=.65+z*.7;v_color=mix(cool(),warm(),pow(z,2.));
 }else if(w<.85){
  float body=1.+floor(y*16.),parent=body>8.5?body-8.:body,lane=bodyLane(parent),boost=u_orbitMotion[int(lane)].y;
  float lag=x*(.035+boost*.65),a=bodyPhase(parent)-lag;
  p=planetCenter(parent,lag);
  if(body>8.5)p+=vec3(cos(a*2.),sin(a*2.),sin(a*1.7)*.4)*.10;
  p+=direction(z*713.)*(.003+x*x*.028);
  shine=smoothstep(.07,.35,boost)*pow(1.-x,2.)*(.06+boost*.25);size=.65+pow(1.-x,6.);v_color=mix(cool(),warm(),boost*.75);
 }else if(w<.96){
  // A comet has a beginning and an end. Its curved tail samples earlier
  // positions on the same trajectory, with widening dust behind the nucleus.
  vec4 event=u_astraEvents[int(floor(y*12.))];float age=u_astraTime-event.x,tail=x;
  float travel=age-tail*.9,t=travel/3.6;
  vec3 axis=direction(event.z*71.+3.),side=normalize(cross(axis,vec3(.1,1.,.3)));
  p=axis*((t-.5)*8.)+side*(.85+sin(t*PI)*.85)+CENTER;
  p+=direction(z*173.)*(.004+tail*tail*.065);
  shine=event.y*event.w*smoothstep(0.,.25,age)*(1.-smoothstep(2.9,3.6,age))*step(0.,travel)*pow(1.-tail,3.)*.65*min(1.5,u_light.z);
  size=.8+pow(1.-tail,12.)*3.5;v_color=mix(warm(),vec3(.55,.78,1.),.6+tail*.4);
 }else{
  p=direction(x*439.)*(6.+y*9.);shine=.012+pow(z,15.)*.24;size=.7+pow(z,12.)*1.5;v_color=mix(cool(),vec3(.72,.78,.88),y);
 }
 gl_Position=projectSky(p);float depth=max(1.,gl_Position.w);
 gl_PointSize=clamp(size*u_pixel*5./depth*u_particle.y,1.,384.);
 v_alpha=shine*clamp(.65+u_light.y*.45,.65,1.6)*smoothstep(.2,1.,gl_Position.w);
}`;
export const ASTRA_DUST_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_flare;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p);if(r>1.)discard;
 float a=v_alpha*exp(-r*r*7.)*(1.-smoothstep(.7,1.,r));fragColor=vec4(v_color*a,a*.05);}`;

export const ASTRA_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;uniform vec4 u_roles;uniform vec3 u_palette[6];
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 float haze=exp(-dot(p-vec2(0.,.08),p-vec2(0.,.08))*7.);
 float cloud=exp(-pow((p.y+p.x*.22-.1)*3.,2.))*exp(-dot(p,p)*1.8);
 vec3 tint=mix(vec3(.12,.28,.5),u_palette[1],.3),sun=mix(vec3(.65,.18,.035),u_palette[4],.35);
 vec3 color=vec3(.0004,.00065,.0012)+tint*haze*.009+sun*cloud*.002*(.5+u_roles.x*.4);
 vec2 grid=p*85.,cell=floor(grid),offset=vec2(hash(cell+17.),hash(cell+31.))*.65+.175;
 float seed=hash(cell),r=length((fract(grid)-offset)/max(fwidth(grid),vec2(.001)));
 float stars=step(.985,seed)*exp(-r*r/(.32+pow(seed,50.)*.8));
 color+=mix(vec3(.14,.27,.40),vec3(.52,.38,.24),hash(cell+41.))*stars*(.03+.4*pow(hash(cell+51.),6.));
 // Store perceptually, even on RGBA8 devices. Decode before linear compositing.
 // Dither before quantization, not after the contour bands have already formed.
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 color+=(hash(gl_FragCoord.xy)-.5)/255.;fragColor=vec4(max(color,vec3(0.)),1.);
}`;
