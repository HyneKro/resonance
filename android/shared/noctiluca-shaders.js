// Open water, an instanced silver school and suspended marine snow. Every pass
// shares the camera, absorption and moving surface illumination in world space.
const WATER=`
uniform vec2 u_resolution;uniform vec4 u_camera,u_roles,u_light,u_particle,u_cloud,u_ocean;
uniform vec3 u_colorA,u_colorB;uniform float u_focalLength,u_spectrumLight[48],u_particleStyle,u_movement;
const float PI=3.14159265359,TAU=6.28318530718;
mat2 rot(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}
float hash(float n){return fract(sin(n*127.1+311.7)*43758.5453);}
float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+1.),f.x),f.y);}
// View from beneath the school. Tilt is bounded so the camera stays submerged.
float tilt(){return -.22+clamp(u_camera.y,-.65,.65);}
vec3 view(vec3 p){p.xz=rot(u_camera.x)*p.xz;p.yz=rot(tilt())*p.yz;return p;}
vec3 unview(vec3 p){p.yz=rot(-tilt())*p.yz;p.xz=rot(-u_camera.x)*p.xz;return p;}
float distanceToSchool(){return 6.2+u_camera.z*.23;}
vec3 eye(){return unview(vec3(0.,0.,distanceToSchool()));}
float lens(){return 2.05*u_focalLength/1.9*min(1.,u_resolution.x/u_resolution.y*1.8);}
vec3 ray(vec2 uv){return unview(normalize(vec3((uv*2.-1.)*vec2(u_resolution.x/u_resolution.y,1.),-lens())));}
vec4 project(vec3 p){vec3 q=view(p);float z=max(.08,distanceToSchool()-q.z);return vec4(q.xy*vec2(lens()/(u_resolution.x/u_resolution.y),lens()),z*.998-.04,z);}
vec3 extinction(){return vec3(.13,.065,.045);}
vec3 deepWater(){return vec3(.0006,.005,.011);}
vec3 sunlight(){return normalize(vec3(-.32,.91,-.26));}
// Slowly advected wave interference produces narrow, irregular light columns.
float caustic(vec2 p){float t=u_ocean.x*.19;p+=vec2(t,-t*.57);p+=vec2(noise(p*.7+t*.08),noise(p*.75-t*.1+8.))*.8;float a=sin(p.x*3.4+sin(p.y*2.7)),b=sin(p.y*4.3+sin(p.x*2.1));return pow(max(0.,1.-abs(a+b)*.53),8.);}
float shaft(vec3 p){vec3 l=sunlight();vec2 surface=p.xz+l.xz*(8.5-p.y)/l.y;float lightPatch=.3+.7*noise(surface*.35);return pow(caustic(surface*.52),1.5)*lightPatch;}
float illumination(){return u_ocean.z*(.72+u_roles.z*.45+(u_ocean.y+u_roles.y*.3)*u_light.z*.22);}
vec3 waterAlong(vec3 ro,vec3 rd,float distance,int samples){
 vec3 color=vec3(0.);float stepSize=distance/float(samples);vec3 sun=sunlight();
 float forward=.25+1.5*pow(max(0.,dot(rd,sun)),5.);
 for(int i=0;i<24;i++){if(i>=samples)break;float t=(float(i)+.5)*stepSize;vec3 p=ro+rd*t;
  float depth=max(0.,8.5-p.y);float rays=shaft(p)*exp(-depth*.085)*illumination();
  color+=exp(-extinction()*t)*(vec3(.00015,.0008,.0015)+vec3(.08,.10,.11)*rays*forward)*stepSize;
 }
 return color;
}
`;

export const NOCTILUCA_BACKGROUND=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
${WATER}
void main(){
 vec3 ro=eye(),rd=ray(v_uv);float surfaceDistance=rd.y>.005?(8.5-ro.y)/rd.y:120.;float d=min(38.,surfaceDistance);
 vec3 color=deepWater()*exp(-extinction()*d)+waterAlong(ro,rd,d,u_ocean.w>.5?14:24);
 if(surfaceDistance<65.){
  vec3 p=ro+rd*surfaceDistance;float t=u_ocean.x*.12;
  vec2 uv=p.xz;float waves=pow(noise(uv*2.2+vec2(t,0.))*noise(uv*5.7-t)*2.,3.),micro=noise(uv*19.+t)*noise(uv*37.-t);
  float lightPatch=exp(-length(uv-vec2(-2.8,-3.))*.12);
  float sun=pow(max(0.,dot(rd,normalize(vec3(-2.8,8.5,-3.)-ro))),90.);
  vec3 surface=mix(vec3(.012,.055,.075),vec3(.11,.24,.27),waves)*(.3+lightPatch)+micro*.07;
  surface+=vec3(16.,12.,9.)*sun*illumination();
  color+=surface*exp(-extinction()*surfaceDistance);
 }
 fragColor=vec4(color,1.);
}`;

export const NOCTILUCA_FISH_VERTEX=`#version 300 es
precision highp float;precision highp int;
uniform sampler2D u_school;uniform float u_schoolCount,u_followers,u_fishDetail;
out vec3 v_position,v_normal,v_local;flat out float v_id,v_fin;
${WATER}
vec3 body(float a,float angle){
 float x=.5-a,r=pow(max(.0001,sin(a*PI)),.8)*(.09+.07*(1.-a));
 vec3 p=vec3(x,cos(angle)*r,sin(angle)*r*.53);
 p.z+=sin(u_ocean.x*8.+a*5.+v_id*1.7)*a*a*.075;
 return p;
}
void main(){
 int id=gl_InstanceID;v_id=float(id);float seed=hash(v_id+3.);int leader=id%int(u_schoolCount);int flock=id/int(u_schoolCount);
 vec3 center=texelFetch(u_school,ivec2(leader,0),0).xyz,velocity=texelFetch(u_school,ivec2(leader,1),0).xyz;
 vec3 forward=normalize(velocity+vec3(.00001)),up=normalize(vec3(-forward.y,forward.x,.12)),side=normalize(cross(forward,up));up=normalize(cross(side,forward));
 mat3 basis=mat3(forward,up,side);
 vec3 offset=vec3(hash(v_id+7.)-.5,hash(v_id+19.)-.5,hash(v_id+31.)-.5);
 center+=basis*offset*(flock==0?.18:.9);
 // Farther cohorts make a continuous deep school, with a few nearer silhouettes.
 center.z-=float(flock)*.29;center.xy*=1.32+float(flock)*.045;
 center*=u_particle.x;
 float size=(.15+pow(seed,2.)*.19)*u_particle.y*(1.+u_roles.x*u_movement*.045);
 if(flock==0&&seed>.86){size*=1.55;center.z+=1.3;}
 int lon=int(u_fishDetail),rad=6,bodyVertices=lon*rad*6,vertex=gl_VertexID;vec3 local,n;
 v_fin=vertex>=bodyVertices?1.:0.;
 if(vertex<bodyVertices){
  int cell=vertex/6,k=vertex%6;vec2 corner=k==0?vec2(0,0):k==1?vec2(1,0):k==2?vec2(0,1):k==3?vec2(0,1):k==4?vec2(1,0):vec2(1,1);
  float a=(float(cell/rad)+corner.x)/float(lon),angle=(float(cell%rad)+corner.y)/float(rad)*TAU;
  local=body(a,angle);vec3 da=body(min(.9999,a+.002),angle)-body(max(.0001,a-.002),angle),db=body(a,angle+.005)-body(a,angle-.005);n=normalize(cross(da,db));
 }else{
  int f=(vertex-bodyVertices)/3,k=(vertex-bodyVertices)%3;
  // Forked tail, dorsal and pectoral fins are actual thin triangles.
  if(f<2){float signY=f==0?1.:-1.;local=k==0?vec3(-.43,0,0):k==1?vec3(-.66,signY*.19,.012):vec3(-.58,0,0);}
  else if(f==2){local=k==0?vec3(.16,.12,0):k==1?vec3(-.15,.21,0):vec3(-.21,.10,0);}
  else{float s=f==3?1.:-1.;local=k==0?vec3(.15,-.01,s*.05):k==1?vec3(-.17,-.13,s*.23):vec3(-.08,0,s*.065);}
  local.z+=sin(u_ocean.x*8.+5.+v_id*1.7)*.08;n=vec3(0,0,1);
 }
 v_local=local;v_normal=basis*n;v_position=center+basis*local*size;gl_Position=project(v_position);
}`;

export const NOCTILUCA_FISH_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_position,v_normal,v_local;flat in float v_id,v_fin;out vec4 fragColor;
${WATER}
void main(){
 vec3 ro=eye(),rd=normalize(v_position-ro),n=normalize(v_normal);if(dot(n,-rd)<0.)n=-n;
 vec3 l=sunlight(),h=normalize(l-rd);float diffuse=max(0.,dot(n,l)),fresnel=pow(1.-max(0.,dot(n,-rd)),4.);
 float nh=max(0.,dot(n,h));float glint=pow(nh,42.)/(1.+fwidth(nh)*65.),broad=pow(max(0.,dot(n,h)),9.);
 float belly=(1.-smoothstep(-.06,.07,v_local.y)),back=smoothstep(.02,.13,v_local.y);
 vec3 silver=mix(vec3(.075,.16,.18),vec3(.48,.61,.61),belly)*(1.-back*.5);
 float spectral=u_spectrumLight[int(mod(v_id*7.,48.))];
 vec3 tint=clamp(mix(u_colorA,u_colorB,hash(v_id+2.)),.03,1.);
 if(u_particleStyle<.5)tint=vec3(.7);else if(u_particleStyle<2.5&&u_particleStyle>1.5)tint=.5+.5*cos(v_id*.17+vec3(0.,2.,4.));
 silver=mix(silver,silver*(.4+tint*1.1),.12+spectral*.20+u_roles.z*.10);
 float scales=.95+.05*sin(v_local.x*165.+sin(v_local.y*80.))*sin(v_local.y*90.);
 float lateral=exp(-abs(v_local.y+.006)*130.)*.08;
 vec3 color=silver*(.15+diffuse*1.1)*scales+vec3(.21,.37,.40)*(broad*.48+fresnel*.11)+vec3(.73,.91,.90)*glint*(.23+spectral*.75);
 color*=1.+u_roles.y*u_light.z*.25;
 color+=vec3(.10,.27,.29)*lateral+silver*shaft(v_position)*.18*illumination();
 float eyeDist=length((v_local.xy-vec2(.35,.035))*vec2(1.,1.25));float eye=(1.-smoothstep(.011,.019,eyeDist))*smoothstep(.012,.024,abs(v_local.z));
 float eyeRim=(1.-smoothstep(.018,.023,eyeDist))*smoothstep(.012,.024,abs(v_local.z));color=mix(color,vec3(.11,.16,.16),eyeRim);color=mix(color,vec3(.002,.005,.007),eye);
 float gill=exp(-abs(v_local.x-.24+v_local.y*.23)*180.)*step(abs(v_local.y),.09);color*=1.-gill*.5;
 if(v_fin>.5)color=mix(vec3(.025,.085,.11),color,.45);
 float distance=length(v_position-ro);color=color*exp(-extinction()*distance)+waterAlong(ro,rd,distance,6);
 fragColor=vec4(max(color,vec3(0.)),1.);
}`;

export const NOCTILUCA_SNOW_VERTEX=`#version 300 es
precision highp float;in vec4 a_seed;out vec3 v_color;out float v_soft;
${WATER}
void main(){
 vec3 p=(a_seed.xyz-.5)*vec3(20.,11.,19.);p.y+=sin(u_ocean.x*.09+a_seed.w*TAU)*.3;p.x+=sin(u_ocean.x*.065+a_seed.z*12.)*.35;
 gl_Position=project(p);float depth=max(.1,distanceToSchool()-view(p).z);v_soft=step(.9,a_seed.w);
 gl_PointSize=clamp((1.+pow(a_seed.w,8.)*5.)*5./depth,1.,9.);
 float lit=shaft(p)*illumination();v_color=vec3(.08,.23,.27)*(.15+lit)*exp(-extinction()*length(eye()-p));
 if(depth<.3)gl_Position=vec4(2.,2.,2.,1.);
}`;
export const NOCTILUCA_SNOW_FRAGMENT=`#version 300 es
precision highp float;in vec3 v_color;in float v_soft;out vec4 fragColor;
void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r,mix(1.4,3.,v_soft));fragColor=vec4(v_color*a,0.);}`;
