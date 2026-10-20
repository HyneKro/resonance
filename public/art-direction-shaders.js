import {COMMON} from './scene-shaders.js';
const ART_POSE=`
vec3 artPose(vec3 p){return p*clamp(u_particle.x,.3,2.)*(1.+u_storyMix*(u_story.x-.5)*.06)*(1.+u_rhythm.z*u_particle.z*u_movement*.018);}
`;


// One seed buffer, no simulation or per-frame geometry allocation. A seed keeps
// its place in the composition; musical changes move that place continuously.
export const ART_VERTEX=`#version 300 es
precision highp float;
in vec4 a_seed;out vec3 v_color;out float v_alpha,v_kind;
${COMMON}
${ART_POSE}
uniform float u_artDirection,u_layer,u_spectrumLight[48];
float lightAt(float lane){float x=clamp(lane,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(i+1,47)],fract(x));}
void main(){
 float x=a_seed.x,y=a_seed.y,z=a_seed.z,t=u_time*.12*u_movement;
 float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement,drum=u_roles.y*u_movement;
 float angle=x*TAU,lane=y,shine=.15,detail=1.,size=1.;vec3 p=vec3(0.);v_kind=0.;
 if(u_artDirection<1.5){
  // Bell ribs, a translucent skirt, and independently undulating oral arms.
  if(u_layer<.5){
   float rib=floor(x*72.)/72.*TAU,phi=y*PI*.53;
   float radius=sin(phi)*(1.05+bass*.15)*(1.+.025*cos(rib*12.));
   p=vec3(cos(rib)*radius,cos(phi)*.68+.36,sin(rib)*radius*.72);
   p.y+=sin(phi*3.+t)*.045;lane=y;
   shine=.035+.085*pow(sin(phi),12.)+.06*pow(max(0.,cos(rib*12.)),12.);
  }else{
   float arm=floor(x*32.)/32.*TAU,lengthArm=1.25+.7*hash(floor(x*32.)+3.);
   float radius=.74*(1.-y*.7)+sin(y*6.-t+arm)*(.05+y*.16);
   p=vec3(cos(arm)*radius,-y*lengthArm+.35,sin(arm)*radius*.7);
   p.x+=sin(y*5.+t*.8+arm)*y*.22;p.z+=cos(y*4.-t*.7+arm)*y*.2;
   p.y+=sin(y*4.+t)*.04;lane=y;shine=.028+pow(.5+.5*sin(y*19.-t*3.+arm),12.)*(.06+lead*.14);
  }
  p.y+=.16;p.xz=rot(.25+sin(t*.15)*.2)*p.xz;
  v_color=mix(vec3(.16,.70,.82),coverTone(lane*.7),.35)+vec3(.12,.20,.24);size=1.3;v_kind=0.;
 }else if(u_artDirection<2.5){
  // Thirteen double-terminated prisms, a different spectral lane per spire.
  float tower=floor(x*13.),az=tower/12.*TAU;
  float height=tower<.5?2.3:1.0+hash(tower)*.65;
  height+=spectral(tower/12.)*.35*u_movement;
  float width=tower<.5?.28:.13+hash(tower+5.)*.055;
  float row=y,side=floor(fract(x*13.)*6.);
  float radius=width*min(1.,min(row/.15,(1.-row)/.28));
  float a=side/6.*TAU;
  if(u_layer>.5){row=floor(y*3.)/2.*.57+.15;row=min(row,.72);radius=width;a=fract(x*13.)*TAU;radius*=cos(PI/6.)/cos(mod(a,TAU/6.)-PI/6.);}
  p=vec3(cos(a)*radius,-1.+row*height,sin(a)*radius);
  if(tower>.5)p.xz+=vec2(cos(az),sin(az))*(.77+bass*.055);
  p.xz=rot(.4+t*.055)*p.xz;p.yz=rot(.18)*p.yz;
  lane=tower/12.;shine=u_layer<.5?.065:.035;size=.9;
  v_color=mix(vec3(.28,.58,.90),coverTone(lane*.7),.35);v_kind=1.;
 }else if(u_artDirection<3.5){
  // Nested tilted brass armillary rings with engraved graduation marks.
  float ring=floor(y*8.),radius=.34+ring*.135+bass*.045;
  if(u_layer<.5){
   float tick=floor(x*240.),u=tick/240.*TAU;
   float width=mod(tick,10.)<.5?.055:.018;
   radius+=(z-.5)*width;
   p=vec3(cos(u)*radius,sin(u)*radius,0.);
   p.yz=rot(ring*.47+.4)*p.yz;p.xz=rot(ring*.31+t*.08)*p.xz;
   lane=ring/7.;shine=.09;size=1.1;
  }else{
   radius+=.026*sin(z*TAU);p=vec3(cos(angle)*radius,sin(angle)*radius,.012*cos(z*TAU));
   p.yz=rot(ring*.47+.4)*p.yz;p.xz=rot(ring*.31+t*.08)*p.xz;
   lane=ring/7.;shine=.055;size=1.;
   if(z>.88){float phi=acos(y*2.-1.);p=vec3(cos(angle)*sin(phi),cos(phi),sin(angle)*sin(phi))*(.16+bass*.03);shine=.06;size=1.3;}
  }
  p.xy=rot(-.24)*p.xy;p*=1.2;
  v_color=mix(vec3(.84,.56,.24),coverTone(.12+lane*.35),.2);v_kind=2.;
 }else{
  // Continuous contour threads on a suspended sheet, with a sparse second
  // family of cross-sections. Subtractive ink is composed in the finish pass.
  float row=floor(y*76.)/75.;float sx=(x-.5)*3.2,sz=(row-.5)*2.4;
  if(u_layer>.5){sx=(floor(x*24.)/23.-.5)*3.2;sz=(y-.5)*2.4;}
  lane=clamp((sx+1.6)/3.2,0.,1.);
  float mountain=exp(-((sx+.5)*(sx+.5)*2.+sz*sz*1.5));
  float ridge=exp(-((sx-.65)*(sx-.65)*3.+(sz-.2)*(sz-.2)*2.));
  float height=mountain*(.75+bass*.25)+ridge*(.45+lead*.3);
  height+=sin(sx*3.+sz*2.+t*.24)*.10+sin(sz*5.-sx*2.-t*.14)*.045;
  height+=spectral(lane)*.12*u_movement*sin(row*PI);
  p=vec3(sx,height-.45,sz);p.yz=rot(-.62)*p.yz;p.xy=rot(-.13)*p.xy;
  shine=u_layer<.5?.22:.055;size=.85;v_kind=3.;
  v_color=mix(vec3(.25,.42,.48),coverTone(lane*.6),.22);
 }
 if(u_layer>.5&&u_layer<1.5&&a_seed.w>.94&&u_artDirection<3.5){
  p=vec3((x-.5)*6.,(y-.5)*3.4,(z-.5)*3.);p.y+=sin(t*.15+x*12.)*.04;
  shine=.012+pow(z,24.)*.06;size=.65;v_kind=0.;
 }
 p=artPose(p);
 project(p,a_seed.w,1.);
 shine*=1.+drum*u_light.z*(u_artDirection<1.5?.3:u_artDirection<2.5?1.6:.65);
 shine+=pow(a_seed.w,32.)*u_shimmer*.025;
 if(u_layer>1.5){shine=lightAt(lane)*(.13+u_intensity*.065);size*=1.25;}
 v_alpha=shine*u_density*cameraVisibility*clamp(.55+u_light.y,.3,2.);
 gl_PointSize=clamp(gl_PointSize*size,1.,u_artDirection<1.5?9.:6.);
}`;

export const ART_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha,v_kind;out vec4 fragColor;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float r=length(p),a;
 if(v_kind<.5){if(r>1.)discard;a=exp(-r*r*5.)*.8+exp(-r*r*28.)*.4;}
 else if(v_kind<1.5){r=abs(p.x)+abs(p.y);if(r>1.)discard;a=(1.-smoothstep(.45,1.,r))*.8;}
 else if(v_kind<2.5){if(r>1.)discard;a=(1.-smoothstep(.25,.9,r))*.85;}
 else{if(r>1.)discard;a=1.-smoothstep(.25,.95,r);}
 fragColor=vec4(v_color*v_alpha*a,v_alpha*a);
}`;

// Small analytic meshes provide material and volume; points remain the living
// ornament. No textures, models, depth sorting or additional framebuffers.
export const ART_SURFACE_VERTEX=`#version 300 es
precision highp float;
${COMMON}
${ART_POSE}
uniform float u_artDirection;
out vec3 v_position,v_normal,v_tint;out float v_alpha;
void main(){
 int id=gl_VertexID,corner=id%6;vec2 offset=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 vec3 p,n;float t=u_time*.12*u_movement,bass=u_roles.x*u_movement;
 if(u_artDirection<1.5){
  int cell=id/6;float angle=(float(cell%64)+offset.x)/64.*TAU,phi=(float(cell/64)+offset.y)/20.*PI*.53;
  float radius=sin(phi)*(1.05+bass*.15)*(1.+.025*cos(angle*12.));
  p=vec3(cos(angle)*radius,cos(phi)*.68+.36,sin(angle)*radius*.72);
  p.y+=sin(phi*3.+t)*.045+.16;p.xz=rot(.25+sin(t*.15)*.2)*p.xz;
  n=normalize(vec3(cos(angle)*sin(phi),cos(phi),sin(angle)*sin(phi)));
  v_tint=mix(vec3(.055,.32,.44),coverTone(phi*.22),.23);v_alpha=.07;
 }else{
  int cell=id/6,tower=cell/18,face=cell%6,tier=(cell%18)/6;
  float row=tier==0?mix(0.,.15,offset.y):tier==1?mix(.15,.72,offset.y):mix(.72,1.,offset.y);
  float a=(float(face)+offset.x)/6.*TAU,az=float(tower)/12.*TAU;
  float height=tower==0?2.3:1.+hash(float(tower))*.65;height+=spectral(float(tower)/12.)*.35*u_movement;
  float width=tower==0?.28:.13+hash(float(tower)+5.)*.055;
  float radius=width*min(1.,min(row/.15,(1.-row)/.28));
  p=vec3(cos(a)*radius,-1.+row*height,sin(a)*radius);
  if(tower>0)p.xz+=vec2(cos(az),sin(az))*(.77+bass*.055);
  p.xz=rot(.4+t*.055)*p.xz;p.yz=rot(.18)*p.yz;
  n=normalize(vec3(cos((float(face)+.5)/6.*TAU),tier==1?0.:tier==0?-.35:.35,sin((float(face)+.5)/6.*TAU)));
  v_tint=mix(vec3(.15,.38,.68),coverTone(float(tower)/13.),.42);v_alpha=.11;
 }
 p=artPose(p);v_position=p;v_normal=n;project(p,0.,1.);
}`;

export const ART_SURFACE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_position,v_normal,v_tint;in float v_alpha;out vec4 fragColor;
uniform float u_artDirection,u_time,u_movement;uniform vec4 u_roles,u_light;
void main(){
 vec3 n=normalize(v_normal);float edge=pow(1.-abs(dot(n,normalize(vec3(0.,0.,5.4)-v_position))),3.);
 float light=.3+.7*abs(dot(n,normalize(vec3(-.4,.8,.6))));
 float shimmer=pow(.5+.5*sin(v_position.y*14.+v_position.x*4.-u_time*.4*u_movement),12.)*.15*u_roles.z;
 float caustic=pow(.5+.5*sin(v_position.x*19.+sin(v_position.y*12.)*2.+v_position.z*7.),18.);
 vec3 color=v_tint*(light*.3+edge*.8+shimmer+caustic*.14)*v_alpha;
 if(u_artDirection>1.5){float facet=pow(light,8.);float spectral=pow(.5+.5*sin(v_position.y*24.+v_position.z*11.+v_position.x*7.),20.);
 color+=vec3(.18,.38,.52)*facet*.045+vec3(.14,.08,.24)*spectral*.014;}
 color*=1.+u_roles.y*u_light.z*.7;fragColor=vec4(color,1.);
}`;

export const ART_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;uniform vec3 u_colorA,u_colorB;uniform float u_time,u_artDirection,u_energy;
uniform vec4 u_cloud,u_roles;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 uv=v_uv,p=(uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);float t=u_time*.02;
 vec3 color;
 if(u_artDirection<1.5){
  float haze=exp(-dot(p-vec2(0.,.12),p-vec2(0.,.12))*4.);
  float ray=pow(.5+.5*sin(p.x*9.+sin(p.y*3.+t)*.6),12.)*smoothstep(-.5,.6,p.y);
  vec2 warp=vec2(noise(p*3.+t*.09),noise(p*3.-t*.08+7.));
  float mist=noise(p*5.+warp*3.+vec2(t*.2,-t*.12));
  float silk=pow(.5+.5*sin((p.x+warp.x*.23)*32.+p.y*7.+t*.4),14.);
  float caustic=pow(1.-abs(sin((p.x+warp.y*.2)*14.)*sin(p.y*12.+warp.x*4.)),10.);
  color=vec3(.012,.042,.055)+vec3(.025,.11,.13)*(haze+ray*.24)*(.65+mist*.35);
  color+=u_colorA*haze*.018+vec3(.006,.024,.032)*silk*mist+vec3(.004,.016,.021)*caustic*pow(max(0.,p.y+.5),2.);
 }else if(u_artDirection<2.5){
  float horizon=exp(-abs(p.y+.22)*12.);
  float beams=pow(.5+.5*cos(p.x*11.+p.y*1.3),20.)*exp(-abs(p.y)*1.7);
  color=vec3(.024,.032,.054)+vec3(.07,.085,.11)*horizon+vec3(.015,.025,.045)*beams;
  // Perspective floor engraving, attenuated before it reaches the subject.
  float floorY=-p.y-.25;
  if(floorY>0.){vec2 q=vec2(p.x,floorY)*vec2(2.,1.)/(floorY+.08);float grid=pow(.5+.5*cos(q.x*30.),38.)+pow(.5+.5*cos(q.y*70.),38.);color+=vec3(.015,.026,.04)*grid*smoothstep(0.,.1,floorY);}
 }else if(u_artDirection<3.5){
  float r=length(p),angle=atan(p.y,p.x);
  float engraving=pow(.5+.5*cos(r*140.),80.)*smoothstep(.30,.65,r)*(1.-smoothstep(.72,1.05,r));
  float ticks=pow(.5+.5*cos(angle*120.),42.)*exp(-abs(r-.65)*200.);
  color=vec3(.046,.036,.026)+vec3(.065,.050,.029)*(engraving*.5+ticks);
  color+=vec3(.035,.022,.008)*exp(-r*r*5.);
  float inset=length(p-vec2(.48,.22));float dial=pow(.5+.5*cos(inset*160.),45.)*(1.-smoothstep(.12,.14,inset));
  color+=vec3(.032,.025,.015)*dial;
  color+=(hash(floor(uv*u_resolution))-.5)*.005;
 }else{
  float grain=hash(floor(uv*u_resolution)),fibers=noise(uv*vec2(190.,4.));
  color=vec3(.83,.81,.75)+(grain-.5)*.018+(fibers-.5)*.005;
  float sun=1.-smoothstep(.115,.117,length(p-vec2(.40,.23)));
  color=mix(color,vec3(.66,.37,.24),sun*.8);
  float horizon=exp(-abs(p.y+.24)*180.);color-=vec3(.06)*horizon;
 }
 fragColor=vec4(color,1.);
}`;
