import {COMMON} from './scene-shaders.js';

// All populations have persistent identities. Music changes envelopes and
// integrated travel speeds; it never chooses a fresh random position per frame.
const WORLD=`
uniform vec4 u_world;
uniform highp sampler2D u_school;
uniform float u_artDirection,u_artPart;
vec3 artPose(vec3 p){return p*clamp(u_particle.x,.45,1.8);}
vec3 jellyCenter(float id){
 vec3 center=id<.5?vec3(-1.45,.6,-1.2):id<1.5?vec3(-.45,1.15,-2.1):id<2.5?vec3(.55,.15,-.5):vec3(1.55,.9,-1.5);
 return center+vec3(sin(u_world.x*.22+id)*.18,sin(u_world.x*.3+id*1.4)*.16,0.);
}
vec3 jellyPoint(float id,float u,float v,bool bell){
 float pulse=.5+.5*sin(u_world.x*1.8+id*1.5),scale=.30+hash(id+3.)*.17;
 float r=sin(v*PI*.52)*(1.+u_roles.x*.28*u_movement)*(.91+pulse*.09);
 vec3 p;
 if(bell){p=vec3(cos(u)*r,cos(v*PI*.52)*.66,sin(u)*r);p.y+=sin(v*3.+u_world.x+id)*.04;}
 else{float lengthArm=1.4+hash(floor(u*4.)+id)*.9;r=.76*(1.-v*.65);p=vec3(cos(u)*r,-v*lengthArm,sin(u)*r);p.x+=sin(v*5.+u_world.x*1.7+id+u)*v*.34;p.z+=cos(v*4.+u_world.x*1.2+id+u)*v*.24;}
 return p*scale+jellyCenter(id);
}
void roadProject(vec3 p){
 // Same vanishing point and road shoulders as the scenic background.
 float depth=p.z;gl_Position=vec4(p.x*2./(1.55*u_resolution.x/u_resolution.y),.08*depth+2.*(p.y*.65-.45),depth*1.002002-.2002002,depth);
 cameraVisibility=smoothstep(.5,1.2,depth);
 gl_PointSize=clamp(u_pixel*u_particle.y*8./max(1.,depth),1.,4.);
}
float terrainHeight(float x,float z){
 float shoulder=smoothstep(1.46,4.,abs(x));
 float ridge=pow(.5+.5*sin(x*.36+sin(z*.13)*1.8),2.);
 float swell=.5+.5*sin(z*.25+x*.22);
 float low=u_roles.x*u_movement,lead=u_roles.z*u_movement;
 float height=(.35+ridge*2.4+swell*.6)*(1.+low*.65);
 height+=sin(z*.9+x*.6)*lead*.24+spectral(clamp((abs(x)-1.46)/14.,0.,1.))*.55*u_movement;
 return max(0.,height)*shoulder;
}
float inkRadius(){return .74*(1.+u_roles.x*u_movement*.13+(u_story.x-.5)*u_storyMix*.08);}
vec3 inkCircle(float id,float a,float offset){
 float radius=inkRadius(),turn=id*PI*.5+sin(u_world.w*.28)*(.035+u_roles.z*u_movement*.10);
 vec2 center=vec2(cos(turn),sin(turn))*radius*(1.-u_roles.z*u_movement*.045);
 float ripple=sin(a*3.+id+u_world.w*.35)*u_roles.z*u_movement*.012;
 return vec3(center+vec2(cos(a),sin(a))*(radius+offset+ripple),sin(a+turn)*.018);
}
vec3 swimmer(vec3 p,float id,float kind){
 if(kind<.5){
  vec3 center=texelFetch(u_school,ivec2(int(id),0),0).xyz,velocity=texelFetch(u_school,ivec2(int(id),1),0).xyz;
  vec3 forward=normalize(velocity+vec3(.00001,0.,0.)),side=normalize(cross(forward,vec3(0.,1.,0.))),up=cross(side,forward);
  return center+forward*p.x+up*p.y+side*p.z;
 }
 float group=floor(id/24.),phase=u_world.x*.15+group*2.1;
 vec3 center;float heading;
 if(kind<.5){float along=hash(id+8.)*1.4-.7;phase+=along*.23;
 center=vec3(sin(phase)*2.4+along,-.05+sin(group*3.)*.62+(hash(id+16.)-.5)*.65,cos(phase)*1.3-1.2+(hash(id+33.)-.5)*.5);heading=atan(-sin(phase)*1.3,cos(phase)*2.4);}
 else{phase=u_world.x*(kind<1.5?.08:.11)+id*2.7;center=vec3(sin(phase)*2.5,kind<1.5?-.52+sin(phase*.7)*.5:-.9+sin(phase)*.25,cos(phase)*1.4-.3-(kind<1.5?id*.75:0.));heading=atan(-sin(phase)*1.4,cos(phase)*2.5);}
 center.xz*=1.+(u_story.x-.5)*u_storyMix*.16;p.xz=rot(-heading)*p.xz;return p+center;
}
`;

export const ART_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_kind;
${COMMON}
${WORLD}
uniform float u_layer,u_spectrumLight[48];
float lightAt(float lane){float x=clamp(lane,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(i+1,47)],fract(x));}
void main(){
 float x=a_seed.x,y=a_seed.y,z=a_seed.z,t=u_world.x;
 float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement,drum=u_roles.y*u_movement;
 float angle=x*TAU,lane=y,shine=.1,size=1.;vec3 p=vec3(0.);v_kind=0.;
 if(u_artDirection<1.5){
  if(u_layer<.5){float id=floor(x*4.),rib=floor(fract(x*4.)*36.)/36.*TAU;p=jellyPoint(id,rib,y,true);lane=y;shine=.045+lead*.05;}
  else{float id=floor(x*4.),arm=floor(fract(x*4.)*22.)/22.*TAU;p=jellyPoint(id,arm,y,false);lane=y;shine=.025+pow(.5+.5*sin(y*16.-t*3.+id),12.)*(.08+lead*.3);}
  v_color=mix(vec3(.12,.66,.72),coverTone(lane*.55+x*.2),.32);size=1.15;
  if(a_seed.w>.78&&u_layer<1.5){p=vec3((x-.5)*8.,(y-.5)*4.,(z-.5)*4.);p.x+=sin(t*.13+y*9.)*.12;p.y+=sin(t*.15+x*8.)*.13;shine=.008+pow(z,20.)*(.03+drum*.04);size=.7;}
  if(a_seed.w>.94&&u_layer<1.5){float rise=fract(y+t*(.028+z*.018));p=vec3((x-.5)*7.+sin(rise*8.+t*.25+x*7.)*.14,(rise-.5)*4.8,(z-.5)*4.);shine=.06*smoothstep(0.,.1,rise)*(1.-smoothstep(.8,1.,rise));size=2.+z*3.;v_kind=5.;}
 }else if(u_artDirection<2.5){
  float travel=fract(z-u_world.y*.018),depth=2.+travel*30.;
  p=vec3((x<.5?-1.:1.)*(1.6+y*3.),.12+pow(y,6.)*.75,depth);
  lane=y;shine=(.018+drum*.12)*smoothstep(0.,.12,travel)*(1.-smoothstep(.7,1.,travel));size=1.2;
  v_color=mix(vec3(.12,.65,1.),vec3(1.,.06,.42),step(.5,x));v_kind=1.;
 }else{
  float circle=floor(x*4.),a=fract(x*4.)*TAU;lane=fract(x*4.);
  float row=floor(y*18.),offset=-row*.012;
  offset+=sin(a*5.+row*.5-u_world.w)*u_roles.z*u_movement*.012;
  p=inkCircle(circle,a,offset);
  shine=(.003+lead*.025)*pow(1.-row/18.,2.)*(.25+.75*pow(.5+.5*sin(a*2.+circle+u_world.w*.15),3.));
  size=.7;v_kind=3.;v_color=vec3(.88,.96,1.);
  if(u_layer>.5&&u_layer<1.5){
   float drop=floor(x*36.),age=fract(hash(drop+9.)+u_world.w*.06),splash=pow(1.-age,3.)*smoothstep(0.,.10,age);
   p=vec3((hash(drop+2.)-.5)*3.0,(hash(drop+5.)-.5)*2.8-age*.15,0.);
   p.xy+=vec2(cos(y*TAU),sin(y*TAU))*sqrt(fract(x*36.))*.008;
   shine=drum*.08*splash;size=.5+pow(hash(drop+16.),4.)*3.5;v_kind=4.;
  }
 }
 if(u_artDirection>1.5&&u_artDirection<2.5)roadProject(p);else{p=artPose(p);project(p,a_seed.w,1.);}
 if(u_layer>1.5){shine=lightAt(lane)*(u_artDirection>3.5?.075:(.24+u_intensity*.12));size*=1.3;}
 v_alpha=shine*u_density*cameraVisibility*clamp(.55+u_light.y,.3,2.);
 gl_PointSize=clamp(gl_PointSize*size,1.,u_artDirection>3.5?16.:9.);
}`;

export const ART_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha,v_kind;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=length(p),a;
 if(v_kind<.5){if(r>1.)discard;a=exp(-r*r*5.)*.8+exp(-r*r*28.)*.4;}
 else if(v_kind<1.5){r=abs(p.x)+abs(p.y);if(r>1.)discard;a=(1.-smoothstep(.35,1.,r))*.8;}
 else if(v_kind<2.5){if(r>1.)discard;a=(1.-smoothstep(.25,.9,r))*.85;}
 else if(v_kind<3.5){if(r>1.)discard;a=1.-smoothstep(.25,.95,r);}
 else if(v_kind<4.5){float angle=atan(p.y,p.x);r+=sin(angle*7.)*.06+sin(angle*13.)*.035;if(r>1.)discard;a=(1.-smoothstep(.65,1.,r))*(.65+.25*sin(p.x*45.)*sin(p.y*36.));}
 else{if(r>1.)discard;a=exp(-pow((r-.76)*15.,2.))*(.25+.75*max(0.,p.y-p.x))+.35*exp(-length(p-vec2(-.30,.36))*18.);}
 fragColor=vec4(v_color*v_alpha*a,v_alpha*a);}`;

// A bounded mesh population replaces the solitary wireframe. Fish, rays,
// sharks and jellyfish use analytic skinning; the school supplies flock headings.
export const ART_SURFACE_VERTEX=`#version 300 es
precision highp float;
${COMMON}
${WORLD}
out vec3 v_position,v_local,v_tint,v_normal;out float v_kind,v_id;
void main(){
 int id=gl_VertexID,corner=id%6;vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 vec3 p;v_normal=vec3(0.);v_kind=u_artPart;v_id=0.;float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement;
 if(u_artDirection<1.5){
  int cell=id/6,cols=u_artPart<.5?8:16,rows=u_artPart<.5?6:12,cells=cols*rows,animal=cell/cells,at=cell%cells;float a=(float(at%cols)+o.x)/float(cols),b=(float(at/cols)+o.y)/float(rows);v_id=float(animal);
  if(u_artPart<.5||u_artPart>1.5&&u_artPart<2.5){
   bool shark=u_artPart>1.5;float len=shark?1.0:.10+hash(v_id+2.)*.08;
   float body=pow(max(0.,sin(a*PI)),.7),phi=b*TAU;
   float tail=smoothstep(.72,1.,a),fin=pow(max(0.,1.-abs(a-.52)*10.),2.);
   p=vec3((.5-a)*len,cos(phi)*body*len*(shark?.14:.24),sin(phi)*body*len*.11);
   // Paired caudal fins and a dorsal fin are continuous parts of the skin.
   p.y+=cos(phi)*tail*tail*len*.23;p.x+=(1.-abs(cos(phi)))*tail*tail*len*.12;p.y+=pow(max(0.,cos(phi)),12.)*fin*len*(shark?.24:.1);
   p.z+=sin(phi)*fin*len*(shark?.30:.08);
   p.z+=sin(a*6.-u_world.x*(shark?3.:5.)+v_id)*a*a*len*(.07+u_roles.y*.1*u_movement);
   p.y*=1.+bass*.08;v_local=p/len;vec3 n=normalize(vec3(cos(a*PI)*.3,cos(phi)*.6,sin(phi)));
   v_normal=swimmer(n,v_id,shark?2.:0.)-swimmer(vec3(0.),v_id,shark?2.:0.);p=swimmer(p,v_id,shark?2.:0.);
   v_tint=shark?vec3(.055,.19,.22):mix(vec3(.24,.44,.46),vec3(.39,.48,.43),hash(v_id));
  }else if(u_artPart<1.5){
   float wing=(b-.5)*2.,body=pow(max(0.,sin(a*PI)),.9),len=.66-v_id*.07;
   p=vec3((.5-a)*len,0.,wing*body*len*.96);
   p.x-=abs(wing)*body*len*.35;p.y=sin(abs(wing)*2.5-u_world.x*1.8+v_id)*pow(abs(wing),1.3)*body*len*(.13+bass*.065);
   p.y+=cos(wing*PI*.5)*body*len*.08;
   if(a>.80){p.x-=(a-.8)*3.;p.z*=1.-smoothstep(.8,1.,a);p.y*=1.-smoothstep(.8,1.,a);}
   v_local=p/len;p.yz=rot(.62+sin(u_world.x*.2+v_id)*.25)*p.yz;p=swimmer(p,v_id,1.);v_tint=vec3(.045,.24,.30);
  }else{p=jellyPoint(v_id,a*TAU,b,true);v_local=vec3(a,b,0.);v_tint=mix(vec3(.06,.37,.51),vec3(.28,.15,.42),v_id/4.);}
 }else if(u_artDirection<2.5){
  int cell=id/6,side=cell/4096,at=cell%4096;
  float across=(float(at%32)+o.x)/32.,row=float(at/32)+o.y;
  float travel=u_world.y*.65,depth=.9+row*.4-mod(travel,.4);
  float x=(side==0?-1.:1.)*(1.46+across*18.),z=depth+travel;
  p=vec3(x,terrainHeight(x,z),depth);v_local=vec3(x/.56,z/.4,0.);v_tint=mix(vec3(.07,.37,.9),vec3(.9,.035,.34),float(side));
 }else{
  int cell=id/6,ring=cell/256;float a=(float(cell%256)+o.x)/256.*TAU,side=o.y*2.-1.;
  float pressure=.5+.5*sin(a+float(ring)*1.1),width=(.008+pressure*.035)*(1.+u_roles.y*u_movement*.45);
  p=inkCircle(float(ring),a,side*width);v_local=vec3(a,side,float(ring));v_id=float(ring);v_tint=vec3(.88,.96,1.);
 }
 if(u_artDirection>1.5&&u_artDirection<2.5){v_position=p;roadProject(p);}else{p=artPose(p);v_position=p;project(p,0.,1.);}
}`;
export const ART_SURFACE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_position,v_local,v_tint,v_normal;in float v_kind,v_id;out vec4 fragColor;
uniform float u_artDirection,u_movement,u_spectrumLight[48];uniform vec4 u_roles,u_light,u_world;
void main(){
 vec3 normal=length(v_normal)>.1?normalize(v_normal):normalize(cross(dFdx(v_position),dFdy(v_position))+vec3(.000001));
 vec3 view=normalize(vec3(0.,0.,5.4)-v_position),lightDir=normalize(vec3(-.4,.8,1.));
 if(dot(normal,view)<0.)normal=-normal;
 float diffuse=max(0.,dot(normal,lightDir)),rim=pow(1.-max(0.,dot(normal,view)),3.);
 float lead=u_roles.z*u_movement,bass=u_roles.x*u_movement,drum=u_roles.y*u_movement;
 vec3 color;
 if(u_artDirection<1.5){
  float caustic=pow(.5+.5*sin(v_position.x*18.+sin(v_position.y*13.+u_world.x)*2.+v_position.z*7.),14.);
  float glint=pow(max(0.,dot(normal,normalize(view+lightDir))),48.);
  color=v_tint*(.028+diffuse*.20+rim*.09+caustic*.06)+vec3(.38,.65,.66)*glint*(.20+lead*.3);
  if(v_kind>2.5){float lace=pow(.5+.5*sin(v_local.x*6.2831853*24.+sin(v_local.y*22.)*2.),18.);color=v_tint*(.015+rim*.16+lace*.06)*(1.+bass*.8+lead*.8);}
  else{float scales=.84+.16*sin(v_local.x*170.)*sin(v_local.y*210.);color*=scales;float stripe=exp(-abs(v_local.y)*35.)*(.04+lead*.12);color+=vec3(.12,.50,.58)*stripe*(v_kind>.5&&v_kind<1.5?.25:1.);if(v_kind>1.5){float gills=pow(.5+.5*sin(v_local.x*210.),10.)*step(.10,v_local.x)*step(v_local.x,.24);color*=1.-gills*.45;}
   float eye=exp(-length((v_local.xy-vec2(.33,.04))*vec2(1.,1.6))*160.);color+=vec3(.2,.7,.7)*eye*.4;
   if(v_kind<.5){float light=u_spectrumLight[int(mod(v_id,48.))];color*=.85+drum*.30;color+=vec3(.12,.20,.23)*glint*light*.7;}
  }
  color*=exp(-max(0.,-v_position.z)*.18);
 }else if(u_artDirection<2.5){
  vec2 cell=abs(fract(v_local.xy-.5)-.5)/max(fwidth(v_local.xy),vec2(.0001));
  float wire=1.-smoothstep(.3,1.15,min(cell.x,cell.y));
  float fine=1.-smoothstep(.35,1.,min(abs(fract(v_local.x*2.-.5)-.5)/max(.0001,fwidth(v_local.x*2.)),abs(fract(v_local.y*2.-.5)-.5)/max(.0001,fwidth(v_local.y*2.))));
  float lane=clamp((abs(v_position.x)-1.46)/14.,0.,1.),light=u_spectrumLight[int(lane*47.)];
  float fog=smoothstep(18.,52.,v_position.z),ridges=pow(max(0.,normal.y),2.);
  color=vec3(.003,.004,.012)+v_tint*(.004+ridges*.004);
  color+=v_tint*(wire*(.035+light*.16+drum*.045)+fine*.006);
  color=mix(color,vec3(.022,.005,.045),fog*.75);
 }
 if(u_artDirection>3.5){
  float edge=1.-smoothstep(.45,1.,abs(v_local.y));
  float bristle=.5+.5*sin(v_local.y*31.+sin(v_local.x*3.+v_id)*1.2);
  float resolved=1.-smoothstep(.6,2.,fwidth(v_local.y*31.));
  float fiber=mix(.78,.32+.68*smoothstep(.1,.7,bristle),resolved);
  fiber*=.90+.10*sin(v_local.x*137.+v_local.y*7.);
  float dry=.48+.52*smoothstep(-.75,.2,sin(v_local.x*2.+v_id*1.4));
  color=v_tint*edge*fiber*dry;
 }
 color*=1.+drum*u_light.z*.55;fragColor=vec4(color,u_artDirection>1.5&&u_artDirection<2.5?1.-smoothstep(38.,52.,v_position.z):1.);
}`;

export const ART_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;uniform vec3 u_colorA,u_colorB;uniform float u_time,u_artDirection,u_energy,u_movement,u_storyMix,u_spectrum[48],u_spectrumLight[48];
uniform vec4 u_cloud,u_roles,u_rhythm,u_world,u_story,u_camera;
const float PI=3.14159265359;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*noise(p);p=p*2.03+vec2(7.1,3.4);a*=.5;}return s;}
float lane(float x){return u_spectrum[int(clamp(x,0.,1.)*47.)];}
float spectrumLight(float x){return u_spectrumLight[int(clamp(x,0.,1.)*47.)];}
float line(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/max(.00001,dot(ba,ba)),0.,1.));}
float stroke(float distance,float width){return 1.-smoothstep(width,width+max(.001,fwidth(distance)),distance);}
vec3 neon(vec3 c){return mix(vec3(.08,.1,.22),c/max(.1,max(c.r,max(c.g,c.b))),.86);}

void main(){
 vec2 uv=v_uv,p=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement,drum=u_roles.y*u_movement;
 vec3 color;
 if(u_artDirection<1.5){
  vec2 q=p+vec2(sin(u_camera.x)*.035,sin(u_camera.y)*.025);float t=u_world.x;
  vec2 warp=vec2(fbm(q*2.+t*.02),fbm(q*2.-t*.018+7.));float water=fbm(q*5.+warp*2.);
  float rayAngle=atan(q.x-.12,.85-q.y),rays=pow(.5+.5*sin(rayAngle*35.+sin(rayAngle*11.+t*.08)*1.3),12.)*smoothstep(-.5,.60,q.y);
  float caustic=pow(1.-abs(sin((q.x+warp.y*.3)*18.)*sin(q.y*14.+warp.x*5.)),9.);
  color=mix(vec3(.006,.025,.041),vec3(.045,.24,.30),smoothstep(-.5,.65,q.y));
  color+=vec3(.10,.21,.22)*(rays*(.7+lead*.5))+vec3(.025,.09,.105)*water*.2+vec3(.008,.018,.022)*caustic*pow(max(0.,.65+q.y),2.);
  float rock=-.48+fbm(vec2(q.x*5.,3.))*.15;float bed=1.-smoothstep(rock-.025,rock+.025,q.y);
  color=mix(color,vec3(.008,.036,.042)*(1.+caustic*.7),bed);
  // Rooted sea-grass silhouettes; bending grows with the low envelope.
  for(int i=0;i<9;i++){float id=float(i),x=(hash(vec2(id,8.))-.5)*1.8,height=.12+hash(vec2(id,9.))*.25;
   float y=q.y+.5,stem=x+sin(y*9.+t*.32+id)*y*(.14+bass*.12);
   float grass=stroke(abs(q.x-stem),.0025*(1.-clamp(y/height,0.,1.)))*step(0.,y)*step(y,height);
   color=mix(color,vec3(.012,.075,.067),grass*.8);}
 }else if(u_artDirection<2.5){
  float horizon=.015,dy=horizon-p.y;
  vec3 pink=mix(vec3(1.,.035,.43),neon(u_colorA),.22),blue=mix(vec3(.04,.45,1.),neon(u_colorB),.24);
  color=mix(vec3(.012,.007,.055),vec3(.18,.025,.18),exp(-abs(p.y-horizon)*5.));
  float sunR=.185*(1.+bass*.025+u_story.w*u_storyMix*.035),sunD=length(p-vec2(0.,.15));float sun=1.-smoothstep(sunR,sunR+.0015,sunD);
  float stripes=step(.18,fract((p.y+.5)*34.));sun*=mix(stripes,1.,smoothstep(.12,.22,p.y));
  vec3 sunset=mix(pink,vec3(1.,.58,.13),smoothstep(.02,.33,p.y));color+=sunset*sun*.8;
  color+=pink*exp(-sunD*8.)*.11;
  vec2 skyCell=p*250.;float stars=pow(hash(floor(skyCell)),90.)*pow(max(0.,1.-length(fract(skyCell)-.5)*2.),4.);
  color+=vec3(.2,.32,.6)*stars*smoothstep(.16,.38,p.y);
  // Several distinct skyline depths, with per-building spectral windows.
  for(int layer=0;layer<3;layer++){float l=float(layer),columns=24.+l*9.;float cell=floor(p.x*columns),u=fract(p.x*columns);
   float h=.025+pow(hash(vec2(cell,l+3.)),2.)*(.13+l*.05);h*=1.+drum*.14;
   float city=step(horizon,p.y)*step(p.y,horizon+h)*step(.12,u)*step(u,.90);
   vec3 wall=vec3(.018,.012,.05)*(1.+l*.25);float windowX=step(.42,fract(u*6.)),windowY=step(.55,fract((p.y-horizon)*210.));
   float lit=step(.38,hash(vec2(cell*9.+floor(u*6.),floor(p.y*210.)+l*19.)));
   wall+=mix(blue,pink,hash(vec2(cell,l)))*windowX*windowY*lit*(.06+lane(fract(cell*.073))*.5+spectrumLight(fract(cell*.073))*.3);
   float edge=stroke(min(min(abs(u-.12),abs(u-.90))/columns,abs(p.y-horizon-h)),.0007)*(.12+drum*.24);wall+=mix(pink,blue,l/3.)*edge;
   color=mix(color,wall,city);}
  if(dy>0.){
   float depth=.45/(dy+.025),wx=p.x*depth*1.55,road=1.-smoothstep(1.42,1.46,abs(wx));float travel=depth+u_world.y*.65;
   float gx=abs(fract(wx*.75)-.5),gz=abs(fract(travel)-.5),aa=max(.008,fwidth(travel));
   float grid=(1.-smoothstep(.015,.015+max(.006,fwidth(wx)),gx))+(1.-smoothstep(.025,.025+aa,gz));
   vec3 ground=vec3(.018,.008,.042)+pink*grid*.36*(.7+drum*.8)*smoothstep(0.,.12,dy);
   float lanes=stroke(abs(abs(wx)-.48)/depth,.0015)*step(.46,fract(travel*.5));
   ground=mix(ground,vec3(.009,.009,.025)+blue*lanes*(.30+lead*.85),road);
   float edge=exp(-abs(abs(wx)-1.46)*55.);ground+=mix(pink,blue,.2)*edge*(.65+bass*.8+u_rhythm.z*.2);ground+=pink*exp(-abs(abs(wx)-1.46)*13.)*.07;
   float reflection=exp(-abs(wx)*2.)*pow(.5+.5*sin(travel*10.),10.)*exp(-dy*3.);ground+=pink*reflection*(.035+bass*.07);
   color=ground;
  }
  // Palm silhouettes and lit trunks frame the drive, never block the vanishing point.
  for(int side=0;side<2;side++)for(int tree=0;tree<3;tree++){
   float signX=side==0?-1.:1.,id=float(tree),distance=1.7+fract(id/3.-u_world.y*.006)*13.,scale=1.6/distance;
   vec2 base=vec2(signX*2.6/distance,-1.3/distance),top=base+vec2(signX*.025,scale);
   float trunk=stroke(line(p,base,top),.004*scale);color=mix(color,vec3(.005,.004,.017),trunk);color+=blue*stroke(line(p,base+vec2(.002,0.),top+vec2(.002,0.)),.0006)*(.12+lead*.16);
   for(int f=0;f<5;f++){float a=float(f)*.7-.3;vec2 end=top+vec2(cos(a),sin(a)*.45-.32)*scale*.26;vec2 mirror=top+vec2(-cos(a),sin(a)*.45-.32)*scale*.26;
    float leaf=min(line(p,top,end),line(p,top,mirror));color=mix(color,vec3(.008,.004,.02),stroke(leaf,.004*scale));}
  }
  for(int side=0;side<2;side++)for(int post=0;post<7;post++){
   float signX=side==0?-1.:1.,id=float(post),distance=1.5+fract(id/7.-u_world.y*.008)*22.;
   vec2 base=vec2(signX*1.45/distance,-.70/distance),top=base+vec2(0.,(.34+lane(id/7.)*.26)/distance);
   float d=line(p,base,top),fade=smoothstep(1.5,2.2,distance)*(1.-smoothstep(20.,23.5,distance));
   color+=mix(pink,blue,float(side))*(stroke(d,.001)+exp(-d*450.)*.22)*(.18+spectrumLight(id/7.)*.8+drum*.2)*fade;
  }
  color+=vec3(.025,.008,.045)*(noise(vec2(p.x*3.,p.y*80.-u_world.y*.1))-.5);
 }else{
  // Open paper and a small vermilion anchor leave the moving ink geometry in charge.
  float grain=hash(floor(uv*u_resolution)),tooth=fbm(p*180.),fibers=noise(uv*vec2(470.,130.));
  color=vec3(.89,.865,.79)+(grain-.5)*.028+(tooth-.5)*.045+(fibers-.5)*.012;
  color-=vec3(.016,.018,.015)*fbm(p*4.);
  // Dilute washes at the edges, with a clear center for the brush geometry.
  float wash=fbm(p*7.+vec2(u_world.w*.015,0.));float edges=smoothstep(.32,.80,abs(p.x));
  color-=vec3(.035,.033,.029)*smoothstep(.38,.65,wash)*edges*(.4+lead*.8);
  float anchor=length(p),radius=.025*(1.+bass*.10);
  float red=1.-smoothstep(radius-.0008,radius+.0008,anchor+(noise(p*600.)-.5)*.0008);
  color=mix(color,vec3(.86,.075,.025),red);
  vec2 diamond=p-vec2(0.,-.39);float mark=1.-smoothstep(.0055,.0065,abs(diamond.x)+abs(diamond.y));
  color=mix(color,vec3(.055,.065,.06),mark);

 }
 fragColor=vec4(max(color,vec3(0.)),1.);
}`;
