// Astra: 48 frequency orbits plus 24 remote rings around a living photosphere. Everything
// in world space shares the camera, including surface eruptions and comet trails.
const SKY=`
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_orbitBands[48],u_orbitMotion[48],u_astraEvents[12],u_stellarState;
uniform highp sampler2D u_astraHistory;
uniform float u_historyHead,u_historyPhase,u_ringEcho[72];
uniform vec3 u_palette[6],u_stellarWarm,u_stellarCool;
uniform float u_focalLength,u_movement,u_pixel,u_astraTime,u_spectrumLight[48];
const float PI=3.14159265359,TAU=6.28318530718;
const vec3 CENTER=vec3(0.,.22,0.);
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 direction(float n){float z=hash(n+8.)*2.-1.,a=hash(n+31.)*TAU;return vec3(sqrt(1.-z*z)*cos(a),z,sqrt(1.-z*z)*sin(a));}
vec4 band(float i){return u_orbitBands[int(clamp(floor(i<48.?i:mod((i-48.)*1.9+5.,48.)),0.,47.))];}
float frequency(float i){return u_spectrumLight[int(clamp(floor(i<48.?i:mod((i-48.)*1.9+5.,48.)),0.,47.))];}
// Strong track colour plus a continuous hue excursion from musical balance.
vec3 vivid(vec3 c){c=max(c-vec3(min(c.r,min(c.g,c.b))*.92),vec3(.002));c/=max(c.r,max(c.g,c.b));return pow(c,vec3(1.45));}
vec3 hueTurn(vec3 c,float angle){vec3 axis=normalize(vec3(1.));return max(vec3(.008),c*cos(angle)+cross(axis,c)*sin(angle)+axis*dot(axis,c)*(1.-cos(angle)));}
vec3 warm(){return u_stellarWarm;}
vec3 cool(){return u_stellarCool;}
// Coherent radial fronts and rotating angular lobes cross every frequency lane.
float radius(float i);
float polar(float i,float a){
 float r=radius(i),clock=u_stellarState.y;
 float front=pow(.5+.5*sin(r*5.4-clock*5.+sin(a*3.-clock)*.6),5.);
 float spoke=pow(.5+.5*cos(a*6.+sin(a*2.+clock)*.8-clock*2.2+r*.45),9.);
 return (front*(.24+u_roles.x*.95)+spoke*(u_roles.z*.7+u_roles.y*.65))*u_movement;
}
vec3 camera(vec3 p){p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;return p;}
vec4 projectSky(vec3 p){p=camera(p*clamp(u_particle.x,.6,1.5));float d=5.4+u_camera.z-p.z;return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);}
float radius(float i){if(i<48.)return .57+i*.051+floor(i/8.)*.04;float group=floor((i-48.)/6.);return 3.55+group*.68+group*group*.16+mod(i-48.,6.)*.065;}
float phase(float i){return u_stellarState.x*(.22+.9/(1.+i*.12))+i*2.39996;}
float starRadius(){return .285*(1.+u_roles.x*u_movement*.075);}
vec3 eruptionAxis(float seed){return direction(seed*51.+7.);}
// Expanding surface ripples and their hot launch sites share the ejecta origins.
vec2 surfaceShock(vec3 n){
 vec2 response=vec2(0.);
 for(int j=0;j<12;j++){
  vec4 e=u_astraEvents[j];float age=u_astraTime-e.x;
  if(e.y<=0.||age<0.||age>2.)continue;
  float distance=acos(clamp(dot(n,eruptionAxis(e.z)),-1.,1.));
  float birth=smoothstep(0.,.09,age),fade=exp(-age*2.1)*birth;
  float front=exp(-pow((distance-age*1.55)/.13,2.));
  float wake=exp(-pow((distance-age*1.55+.20)/.18,2.));
  float spot=exp(-distance*distance/ .045)*exp(-age*4.);
  response+=vec2((front-wake*.42)*.033+spot*.027,front*.7+spot*3.4)*e.y*fade;
 }
 return response;
}
float spectrumBin(int bin,int row){
 return texelFetch(u_astraHistory,ivec2(clamp(bin,0,47),row),0).r*.80
  +(texelFetch(u_astraHistory,ivec2(max(bin-1,0),row),0).r+texelFetch(u_astraHistory,ivec2(min(bin+1,47),row),0).r)*.10;
}
float spectrumEcho(float ring,float angle){
 // The complete frequency pass wraps seamlessly around each ring. A one-row
 // latency permits continuous interpolation at every history-buffer rollover.
 float lane=abs(fract(angle/TAU-ring*.0055)*2.-1.),x=lane*47.;
 float row=1.+ring*1.65-u_historyPhase;int r=int(row),head=int(u_historyHead),bin=int(x);
 int a=(head-r+128)%128,b=(a+127)%128;
 float young=mix(spectrumBin(bin,a),spectrumBin(min(bin+1,47),a),smoothstep(0.,1.,fract(x)));
 float old=mix(spectrumBin(bin,b),spectrumBin(min(bin+1,47),b),smoothstep(0.,1.,fract(x)));
 return mix(young,old,fract(row))*smoothstep(0.,.035,lane)*(1.-smoothstep(.965,1.,lane));
}
vec3 orbit(float i,float a,float r){
 float amplitude=band(i).x*u_movement;
 float sweep=polar(i,a);
 r+=amplitude*(.035+.105*(.5+.5*sin(a*3.+i*.21-u_stellarState.y)))+sweep*.055;
 vec3 p=vec3(cos(a)*r,sin(a)*r*.91,sin(a*4.+i*.38-u_stellarState.y*.6)*(amplitude*.12+sweep*.085));
 // Lift along the local plane normal before applying the orbit's inclination.
 float echo=spectrumEcho(i,a);
 p.z+=pow(echo,.98)*(.76/(1.+i*.047))*u_movement;
 float tilt=i<42.?1.02+sin(i*.16)*.10:i<48.?.42+(i-42.)*.32:.90+sin(floor((i-48.)/6.)*2.)*.18;
 p.yz=rot(tilt)*p.yz;p.xz=rot(i<42.?.12:i<48.?.5+(i-42.)*.48:.15+floor((i-48.)/6.)*.16)*p.xz;p.xy=rot(-.22)*p.xy;
 return p+CENTER;
}
float bodyLane(float i){return mod(i*5.37,46.);}
float bodyPhase(float i){return phase(i)+u_orbitMotion[int(bodyLane(i))].x+hash(i)*TAU;}
vec3 planetCenter(float i,float lag){float lane=bodyLane(i);return orbit(lane,bodyPhase(i)-lag,radius(lane)+(hash(i+41.)-.5)*.12);}
vec3 debrisCenter(float i){
 float lane=bodyLane(i),a=hash(i+73.)*TAU+u_stellarState.x*(.45+hash(i+8.)*.8)+u_orbitMotion[int(lane)].x*(.35+hash(i+5.));
 float major=.75+pow(hash(i+12.),.8)*6.7,e=.05+hash(i+16.)*.15;
 float r=major*(1.-e*e)/(1.+e*cos(a));
 r+=band(lane).x*u_movement*.055*sin(a*3.+i);
 vec3 p=vec3(cos(a)*r,sin(a)*r,0.);
 // All inclinations stay within the same prograde disc; no counter-rotating cloud.
 p.yz=rot(1.02+(hash(i+18.)-.5)*.22)*p.yz;
 p.xz=rot(.12+(hash(i+23.)-.5)*.12)*p.xz;p.xy=rot(-.22)*p.xy;
 return p+CENTER;
}
vec3 bodyCenter(float i){
 if(i<.5)return CENTER;
 if(i>8.5&&i<16.5){float parent=i-8.;vec3 p=vec3(cos(bodyPhase(parent)*2.),sin(bodyPhase(parent)*2.),sin(bodyPhase(parent)*1.7)*.4)*.10;return planetCenter(parent,0.)+p;}
 return i>16.5?debrisCenter(i):planetCenter(i,0.);
}
float bodyRadius(float i){return i<.5?starRadius():i<8.5?.027+pow(hash(i+7.),2.)*.041:i<16.5?.009+hash(i)*.009:(.0025+pow(hash(i+7.),3.)*.009)*(1.+band(bodyLane(i)).x*.10*u_movement);}
`;

export const ASTRA_PATH_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform float u_segments,u_pathPart;
out vec3 v_color;out float v_alpha,v_edge;
vec3 path(float i,float t){
 float echo=u_pathPart>.5&&u_pathPart<1.5?.04+u_ringEcho[int(i)]*.10:0.;
 return orbit(i,t*TAU,radius(i)+echo);
}
void main(){
 int corner=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments);
 float i=float(cell/segments),t=(float(cell%segments)+float(corner==1||corner==4||corner==5))/u_segments;
 float side=corner==0||corner==1||corner==4?-1.:1.;
 vec3 p=path(i,t);vec4 clip=projectSky(p),next=projectSky(path(i,t+.001));
 vec2 tangent=(next.xy*clip.w-clip.xy*next.w)*u_resolution;
 vec2 normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.000001));
 float major=1.-step(.5,mod(i,8.)),arc=pow(.5+.5*cos(t*TAU-phase(i)),36.);
 float sweep=polar(i,t*TAU);
 float width=(.58+major*.22+band(i).x*.40+sweep*.38)*max(.75,u_pixel);
 v_alpha=(.11+major*.11+arc*.40+band(i).x*.65+frequency(i)*.36+sweep*.65)*clamp(.65+p.z*.12,.30,1.);
 v_alpha*=mix(.24,1.,smoothstep(.012,.28,u_stellarState.w));
 v_color=mix(cool(),warm(),clamp(major*.4+band(i).x*.35+sweep*.45,0.,1.))*1.35;
 if(i>=42.&&i<48.)v_alpha*=.60;
 if(i>=48.)v_alpha*=.48+.20*pow(.5+.5*sin(t*TAU*3.+i),4.);
 if(u_pathPart>.5&&u_pathPart<1.5){
  float pulse=u_ringEcho[int(i)];
  v_alpha=pulse*.48*u_movement*min(1.5,u_light.z);
  width*=1.4;v_color=mix(warm(),cool(),i/71.);
 }
 if(u_pathPart>3.5){width*=5.;v_alpha*=.13;}
 v_alpha*=smoothstep(.25,1.,clip.w);
 clip.xy+=normal*side*width*2./u_resolution*clip.w;gl_Position=clip;v_edge=side;
}`;
export const ASTRA_PATH_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge;out vec4 fragColor;
void main(){float a=(1.-smoothstep(.12,1.,abs(v_edge)))*v_alpha;fragColor=vec4(v_color*a,a*.08);}`;

const PHOTOSPHERE=`
float lattice(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grain(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(lattice(i),lattice(i+vec3(1,0,0)),f.x),mix(lattice(i+vec3(0,1,0)),lattice(i+vec3(1,1,0)),f.x),f.y),mix(mix(lattice(i+vec3(0,0,1)),lattice(i+vec3(1,0,1)),f.x),mix(lattice(i+vec3(0,1,1)),lattice(i+vec3(1,1,1)),f.x),f.y),f.z);}
float plasma(vec3 p){return grain(p)*.57+grain(p*2.03+13.)*.28+grain(p*4.13+31.)*.15;}
// Broad convection domes, smaller cellular ridges and moving intergranular lanes.
// The same sphere-space field drives geometry and surface shading.
vec2 solarTerrain(vec3 n){
 float clock=u_stellarState.y;
 vec3 q=n*7.+vec3(clock*.31,-clock*.24,clock*.19);
 vec3 warp=vec3(grain(q+7.),grain(q+29.),grain(q+61.))-.5;
 float domes=plasma(q+warp*1.7),cells=grain(q*3.1+warp*2.3-clock*.25);
 float ridges=pow(1.-abs(cells*2.-1.),3.);
 return vec2((domes-.5)*.021+(ridges-.5)*.006,ridges);
}
`;

export const ASTRA_BODY_VERTEX=`#version 300 es
precision highp float;
${SKY}
${PHOTOSPHERE}
uniform vec2 u_bodyDetail;uniform float u_bodyOffset;
out vec3 v_normal,v_world;out float v_body;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6;vec2 o=vec2(float(c==1||c==4||c==5),float(c==2||c==3||c==5));
 int cols=int(u_bodyDetail.x),cells=cols*int(u_bodyDetail.y),id=cell/cells,at=cell%cells;float a=(float(at%cols)+o.x)/u_bodyDetail.x*TAU,b=(float(at/cols)+o.y)/u_bodyDetail.y*PI;
 v_body=float(id)+u_bodyOffset;
 vec3 n=vec3(cos(a)*sin(b),cos(b),sin(a)*sin(b));
 v_normal=n;
 vec3 center=bodyCenter(v_body);
 float relief=0.;
 if(v_body<.5){
  float clock=u_stellarState.y;
  relief=surfaceShock(n).x+solarTerrain(n).x*(.65+u_roles.x*.55)+sin(n.x*27.+clock*2.8)*sin(n.y*25.-clock*2.1)*sin(n.z*23.+clock)*(.001+u_roles.x*.002);
 }
 v_world=n*(bodyRadius(v_body)+relief)+center;gl_Position=projectSky(v_world);
}`;
export const ASTRA_BODY_FRAGMENT=`#version 300 es
precision highp float;
${SKY}
${PHOTOSPHERE}
in vec3 v_normal,v_world;in float v_body;out vec4 fragColor;

void main(){
 vec3 n=normalize(v_normal),eye=normalize(vec3(0.,0.,5.4+u_camera.z)-camera(v_world)),viewNormal=camera(n);
 float facing=max(0.,dot(viewNormal,eye)),rim=pow(1.-facing,3.);
 vec3 p=n;p.xz=rot(u_stellarState.y*.17+v_body)*p.xz;
 float rock=.24+grain(p*8.)*.42+grain(p*29.)*.23+grain(p*110.)*.12;
 vec3 tint=mix(cool(),warm(),hash(v_body+4.)*.7);
 float light=max(0.,dot(n,normalize(CENTER-v_world)));
 vec3 color=tint*(.025+light*.65)*rock+cool()*rim*.055;
 if(v_body<.5){
  // Advected convection, dark magnetic regions and fine granulation. All noise
  // lives on the sphere, so the photosphere holds together from every angle.
  float clock=u_stellarState.y;
  vec3 q=p*4.5+vec3(clock*.65,-clock*.43,clock*.31);
  vec3 currents=vec3(plasma(q+17.),plasma(q+43.),plasma(q+71.))-.5;
  vec3 flow=p+currents*(.25+u_roles.z*.18)+sin(p.yzx*9.+clock*2.4)*(.012+u_roles.x*.03);
  float convection=plasma(flow*16.+currents*4.+vec3(clock*.35,-clock*.22,0.));
  vec2 terrain=solarTerrain(n);
  float cells=grain(flow*85.+currents*9.+clock*.9),fine=grain(flow*210.+clock*1.7);
  float detail=1.-smoothstep(.006,.025,length(fwidth(p)));
  float granules=mix(.5,cells,detail),micro=mix(.5,fine,detail*detail);
  float magnetic=plasma(flow*6.7+vec3(11.,0.,3.));
  float penumbra=smoothstep(.57,.70,magnetic),umbra=smoothstep(.67,.77,magnetic);
  float striae=.5+.5*sin(convection*52.+magnetic*13.);
  float bright=smoothstep(.50,.78,convection)*(.35+granules*.65);
  float lanes=smoothstep(.32,.50,cells)*(1.-smoothstep(.53,.70,cells));
  float heat=(.23+convection*.68+granules*.30+micro*.18+bright*.40+terrain.y*.12)*(1.-lanes*detail*.16)*(1.-penumbra*.36-umbra*.46);
  heat*=.38+.62*pow(facing,.4);
  color=mix(warm(),vec3(1.,.94,.84),bright*.24)*heat*(2.25+u_roles.x*1.20);
  color+=warm()*(rim*.42+penumbra*(1.-umbra)*striae*.12+max(0.,terrain.x)*4.);
  vec2 shock=surfaceShock(n);
  color+=mix(warm(),vec3(1.),.45)*shock.y*3.5;
 }else{
  float response=band(bodyLane(v_body)).x;
  color+=warm()*light*response*.38;
  if(v_body>16.5){
   float hot=smoothstep(.73,.94,hash(v_body+91.)),veins=pow(1.-abs(grain(p*12.+v_body)*2.-1.),9.);
   color+=mix(warm(),cool(),hash(v_body+32.))*hot*(.09+veins*.55)*(1.+response*3.5+u_roles.y*.7);
   color+=cool()*.025*rock; // A trace of starlight on the unlit silhouettes.
  }
 }
 fragColor=vec4(color,1.);
}`;

// Small shaded sphere sprites preserve the population without large faceted
// silhouettes or thousands of tiny meshes competing with the frequency rings.
export const ASTRA_DEBRIS_VERTEX=`#version 300 es
precision highp float;
${SKY}
out vec3 v_tint,v_sun;out float v_heat;
void main(){
 float id=float(gl_VertexID)+17.,response=band(bodyLane(id)).x;
 vec3 p=debrisCenter(id);gl_Position=projectSky(p);
 gl_PointSize=clamp(bodyRadius(id)*2.*u_resolution.y*u_focalLength/max(1.,gl_Position.w)*u_particle.y,1.1,8.*u_pixel);
 v_tint=mix(cool(),warm(),hash(id+4.)*.7);v_sun=normalize(camera(CENTER-p));
 v_heat=smoothstep(.74,.98,hash(id+91.))*(.22+response*1.4)+response*.16;
 if(gl_Position.w<.3)gl_PointSize=1.;
}`;
export const ASTRA_DEBRIS_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_tint,v_sun;in float v_heat;out vec4 fragColor;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float rr=dot(p,p);if(rr>1.)discard;
 vec3 n=vec3(p.x,-p.y,sqrt(1.-rr));float light=max(0.,dot(n,v_sun));
 float rim=pow(1.-n.z,3.),edge=1.-smoothstep(.65,1.,rr);
 fragColor=vec4(v_tint*(.18+light*.65+v_heat)+vec3(.12,.16,.2)*rim,edge);
}`;

export const ASTRA_DUST_VERTEX=`#version 300 es
precision highp float;
${SKY}
uniform vec4 u_cometTrail[96];
// A single inverse-square gravity law for every launch speed, on both sides
// of escape velocity. Fixed-step velocity Verlet remains continuous at the
// escape threshold; no bound/escaping branch or separate trajectory formula.
vec2 ejectaFlight(float speed,float age){
 float r=.285,v=speed,h=min(age,2.4)/48.;
 for(int i=0;i<48;i++){
  float halfVelocity=v-.5*h*.18/(r*r);
  float nextRadius=r+h*halfVelocity;
  if(nextRadius<=.285&&halfVelocity<0.)return vec2(0.,halfVelocity);
  r=max(.285,nextRadius);v=halfVelocity-.5*h*.18/(r*r);
 }
 return vec2(r-.285,v);
}
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_flare;
void main(){
 float x=a_seed.x,y=a_seed.y,z=a_seed.z,w=a_seed.w;
 vec3 p;float shine=0.,size=1.;v_flare=0.;
 if(gl_VertexID==0){
  p=CENTER;size=560.;shine=.17+u_roles.x*.13;v_color=warm();
 }else if(w<.28){
  // Thin solar wind with a small number of hotter streamers.
  float age=fract(x+u_stellarState.y*(.14+y*.045)),r=starRadius()+age*(.18+z*.32);
  vec3 dir=direction(y*1821.);dir.xz=rot(u_stellarState.y*.12+age*.5)*dir.xz;
  p=CENTER+dir*r;shine=sin(age*PI)*pow(1.-age,2.)*(.10+pow(z,8.)*.9)*(1.+u_roles.x*.9);
  size=.85+pow(z,9.)*2.3;v_color=mix(warm(),vec3(1.,.90,.75),pow(1.-age,3.)*.35)*1.3;
 }else if(w<.48){
  vec4 event=u_astraEvents[int(floor(y*12.))];float age=max(0.,u_astraTime-event.x);
  // Broad overlapping launch speeds, all sharing the same gravity. Pressure is
  // captured at birth so later notes cannot move particles already in flight.
  float speed=(.35+pow(z,1.25)*1.30)*(.80+event.w*.40);
  vec2 flight=ejectaFlight(speed,age);
  float travel=flight.x,returning=1.-smoothstep(-.12,.12,flight.y);
  vec3 axis=eruptionAxis(event.z),fan=direction(x*1023.+y*317.);
  vec3 dir=normalize(axis+fan*(.10+hash(x*173.+z*31.)*.25));
  float population=1.-smoothstep(.28+event.y*.65,.34+event.y*.65,x);
  float live=population*event.y*smoothstep(0.,.065,age)*(1.-smoothstep(1.65,2.1,age))*smoothstep(0.,.015,travel);
  // Fine transverse eddies vary with each seed and fade at the photosphere.
  vec3 eddy=cross(axis,fan)*sin(age*(2.+x*3.)+z*TAU)*travel*.075;
  p=CENTER+dir*(starRadius()+travel)+eddy;
  shine=live*(.75+pow(hash(z*73.+x*31.),4.)*1.4+returning*.18)*min(1.5,u_light.z);size=.8+hash(x*217.+z*91.)*1.5;
  v_color=mix(warm(),vec3(1.),(.35+returning*.15)*pow(1.-clamp(travel,0.,1.),2.))*2.;
 }else if(w<.76){
  float ring=y<.66?10.+y/.66*29.:48.+(y-.66)/.34*23.,a=x*TAU+u_stellarState.x*(.32+y*.3)+u_orbitMotion[int(mod(floor(ring),48.))].x*.4;
  p=orbit(ring,a,radius(ring)+(z-.5)*.14);p+=direction(x*871.)*.025;
  if(z>.62)p=debrisCenter(floor(x*1900.)+600.);
  p+=normalize(p-CENTER)*band(ring).x*u_movement*.08;
  shine=(.028+pow(z,7.)*.65)*(1.+band(ring).x*1.2+polar(ring,a)*1.8);size=.65+pow(z,5.)*2.8;v_color=mix(cool(),warm(),pow(z,2.));
 }else if(w<.85){
  float body=1.+floor(y*16.),parent=body>8.5?body-8.:body,lane=bodyLane(parent),boost=u_orbitMotion[int(lane)].y;
  float lag=x*(.035+boost*.65),a=bodyPhase(parent)-lag;
  p=planetCenter(parent,lag);
  if(body>8.5)p+=vec3(cos(a*2.),sin(a*2.),sin(a*1.7)*.4)*.10;
  p+=direction(z*713.)*(.003+x*x*.028);
  shine=smoothstep(.07,.35,boost)*pow(1.-x,2.)*(.06+boost*.25);size=.65+pow(1.-x,6.);v_color=mix(cool(),warm(),boost*.75);
 }else if(w<.96){
  // Interpolate an actual focus-centred elliptical orbit and its past positions.
  // Only 96 Kepler samples are solved per frame on the CPU, even on phones.
  int comet=int(floor(y*6.)),at=int(floor(x*14.999));float f=fract(x*14.999);
  vec4 point=mix(u_cometTrail[comet*16+at],u_cometTrail[comet*16+at+1],f);
  p=point.xyz+direction(z*173.)*(.002+x*x*.035);
  p+=normalize(p-CENTER+vec3(.0001))*x*x*.10;
  shine=point.w*1.7*min(1.5,u_light.z);size=.9+pow(1.-x,14.)*4.;
  v_color=mix(warm(),cool(),.3+x*.6);
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
uniform vec2 u_resolution;uniform vec4 u_roles;uniform vec3 u_stellarWarm,u_stellarCool;
vec3 vivid(vec3 c){c=max(c-vec3(min(c.r,min(c.g,c.b))*.92),vec3(.002));c/=max(c.r,max(c.g,c.b));return pow(c,vec3(1.45));}
vec3 hueTurn(vec3 c,float angle){vec3 axis=normalize(vec3(1.));return max(vec3(.008),c*cos(angle)+cross(axis,c)*sin(angle)+axis*dot(axis,c)*(1.-cos(angle)));}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){
 vec2 p=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 float haze=exp(-dot(p-vec2(0.,.08),p-vec2(0.,.08))*7.);
 float cloud=exp(-pow((p.y+p.x*.22-.1)*3.,2.))*exp(-dot(p,p)*1.8);
 vec3 sun=u_stellarWarm,tint=u_stellarCool;
 vec3 color=vec3(.0004,.00065,.0012)+tint*haze*.012+sun*cloud*.006*(.5+u_roles.x*.4);
 vec2 grid=p*85.,cell=floor(grid),offset=vec2(hash(cell+17.),hash(cell+31.))*.65+.175;
 float seed=hash(cell),r=length((fract(grid)-offset)/max(fwidth(grid),vec2(.001)));
 float stars=step(.985,seed)*exp(-r*r/(.32+pow(seed,50.)*.8));
 color+=mix(vec3(.14,.27,.40),vec3(.52,.38,.24),hash(cell+41.))*stars*(.03+.4*pow(hash(cell+51.),6.));
 // Store perceptually, even on RGBA8 devices. Decode before linear compositing.
 // Dither before quantization, not after the contour bands have already formed.
 color=pow(max(color,vec3(0.)),vec3(1./2.2));
 color+=(hash(gl_FragCoord.xy)-.5)/255.;fragColor=vec4(max(color,vec3(0.)),1.);
}`;
