// A fixed forward view. All travel uses integrated musical clocks, never time
// multiplied by a changing envelope. Geometry and the road share one projection.
const DRIVE=`
uniform vec2 u_resolution;
uniform vec4 u_world,u_roles,u_light,u_particle,u_cloud;
uniform vec3 u_colorA,u_colorB,u_colorC,u_retro;
uniform float u_movement,u_spectrum[48],u_spectrumLight[48];
const float PI=3.14159265359;
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 saturated(vec3 c){c=pow(max(c,vec3(.001)),vec3(1.65));return c/max(c.r,max(c.g,c.b));}
vec3 pink(){return mix(vec3(1.,.016,.29),saturated(u_colorA),u_retro.z*.78);}
vec3 cyan(){return mix(vec3(.035,.55,1.),saturated(u_colorB),u_retro.z*.78);}
vec3 amber(){return mix(vec3(1.,.28,.012),saturated(u_colorC),u_retro.z*.60);}
float speedClock(){return u_world.y*3.4;}
float band(float x){float f=clamp(x,0.,1.)*47.;int i=int(f);return mix(u_spectrum[i],u_spectrum[min(i+1,47)],fract(f));}
float lamp(float x){float f=clamp(x,0.,1.)*47.;int i=int(f);return mix(u_spectrumLight[i],u_spectrumLight[min(i+1,47)],fract(f));}

`;
const PROJECT=`void driveProject(vec3 p){
 float depth=max(.01,p.z),aspect=u_resolution.x/u_resolution.y;
 gl_Position=vec4(p.x*1.55/aspect,.02*depth+(p.y-1.2)*1.55,depth*1.002002-.2002002,depth);
}`;
const EDGES=`float aa(float d,float width){return 1.-smoothstep(width,width+max(fwidth(d),.0003),d);}`;

export const AFTERGLOW_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
${DRIVE}
${EDGES}
float random2(vec2 p){return hash(dot(p,vec2(13.71,77.19)));}
void main(){
 vec2 p=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);float horizon=.01,y=p.y-horizon;
 vec3 hot=pink(),cool=cyan(),gold=amber();
 vec3 color=mix(vec3(.0025,.0007,.014),hot*.045+cool*.009,exp(-abs(y)*8.));
 color+=hot*.038*exp(-abs(y-.055)*16.);
 // Broad atmospheric glow is separate from the crisp, progressively sliced disc.
 vec2 sunP=p-vec2(0.,.18);float radius=.205,sd=length(sunP);
 color+=hot*.075*exp(-sd*8.)+gold*.032*exp(-sd*4.);
 float disc=aa(max(0.,sd-radius),.0001)*step(sd,radius+.003);
 float slices=1.;if(sunP.y<.025){float row=(.025-sunP.y)*35.;float gap=.12+clamp(-sunP.y,0.,.23)*2.0;slices=smoothstep(gap,gap+max(.025,fwidth(row)),fract(row));}
 vec3 sunColor=mix(hot,gold,smoothstep(-.15,.15,sunP.y));sunColor=mix(sunColor,vec3(1.,.64,.13),smoothstep(.10,.21,sunP.y)*.25*(1.-u_retro.z*.5));
 color+=sunColor*disc*slices*(.60+u_roles.z*.15*u_movement);
 // Stable star identities, with rare four-point glints and gentle musical twinkle.
 vec2 starGrid=p*vec2(125.,95.),cell=floor(starGrid),q=fract(starGrid)-.5;
 float seed=random2(cell),star=exp(-dot(q,q)*360.);
 float cross=exp(-abs(q.x)*160.-abs(q.y)*15.)+exp(-abs(q.y)*160.-abs(q.x)*15.);
 color+=mix(cool,vec3(.75,.61,1.),seed)*(star+cross*step(.986,seed)*.5)*step(.965,seed)*smoothstep(.035,.22,y)*(.18+.14*sin(u_world.x*.55+seed*91.)+.18*u_roles.w);
 // Three independent depth layers: stepped Art Deco crowns, roof antennas,
 // lit windows, cyan cornices and dark gaps. Forward travel gives slow parallax.
 for(int layer=0;layer<3;layer++){
  float l=float(layer),scale=1.+.018*sin(u_world.y*.018+l),unit=(.036+l*.015)*scale;
  float cityX=p.x/scale+sin(u_world.y*.012+l)*(.002+l*.002);
  float id=floor(cityX/unit),r=hash(id+21.+l*87.),w=unit*(.63+r*.24),x=mod(cityX,unit)-unit*.5;
  float base=-.008-l*.004,height=(.023+pow(hash(id+41.+l*143.),2.)*(.085+l*.035))*(1.+.35*smoothstep(.05,.45,abs(p.x)));
  float tier=step(height*.72,y-base)+step(height*.88,y-base),width=w*(1.-tier*.15);
  float body=step(abs(x),width*.5)*step(y,base+height)*step(base,y);
  float antenna=aa(abs(x),.00045)*step(base+height,y)*step(y,base+height+.014*r)*step(.76,r);
  float facade=.003+l*.002;
  vec3 building=hot*facade+vec3(.001,.001,.004);
  float edge=aa(abs(abs(x)-width*.5),.0005)+aa(abs(y-base-height),.0006);
  building+=mix(cool,hot,step(.5,r))*edge*(.10+l*.035);
  vec2 windowUV=vec2((x+w*.5)/.0042,(y-base)/.0065),windowCell=floor(windowUV),windowP=fract(windowUV);
  float windows=step(.25,windowP.x)*step(windowP.x,.55)*step(.22,windowP.y)*step(windowP.y,.62)*step(.52,random2(windowCell+id*7.+l*20.));
  float rows=aa(abs(fract((y-base)*160.)-.5),.035)*step(.58,r);
  building+=mix(gold,cool,r)*windows*(.025+.055*lamp(fract(id*.071)))*(.65+l*.2);
  building+=hot*rows*.018;
  color=mix(color,building,body);color=mix(color,cool*.13,antenna);
 }
 // The road is an infinite plane with perspective-correct, antialiased grid.
 if(y<0.){
  float depth=1.2*.775/max(.0001,-y),x=p.x*depth/.775,z=depth+speedClock();
  vec2 grid=vec2(x/1.1,z/1.65),edge=abs(fract(grid-.5)-.5)/max(fwidth(grid),vec2(.0001));
  float wire=1.-smoothstep(.3,1.25,min(edge.x,edge.y));
  float fade=1.-smoothstep(35.,140.,depth),road=1.-smoothstep(2.30,2.35,abs(x));
  color=vec3(.0015,.001,.007)+hot*.007*exp(-abs(x)*.65);
  color+=mix(hot,cool,.24)*wire*(.10+.08*u_roles.y*u_particle.z)*fade;
  float shoulder=exp(-abs(abs(x)-2.35)*42.);
  color+=mix(hot,cool,.45)*shoulder*(.55+.40*u_roles.x*u_movement)*fade;
  color+=hot*exp(-abs(abs(x)-2.35)*4.)*.028*fade;
  float dashed=aa(abs(x),.022)*step(.64,fract(z/4.));
  color+=gold*dashed*.22*fade;
  // Broken sunset reflection across the asphalt, not a flat opaque glow.
  float reflection=exp(-x*x/(.16+depth*.014))*exp(-depth*.015)*road;
  color+=mix(hot,gold,smoothstep(4.,70.,depth))*reflection*(.035+.025*sin(z*13.)*sin(x*23.+z))*(.55+.25*u_roles.z);
  color+=hot*.045*exp(-abs(y)*40.);
 }
 color+=mix(hot,cool,.3)*exp(-abs(y)*130.)*.12;
 fragColor=vec4(color,0.);
}`;

const TERRAIN=`
uniform highp sampler2D u_history;
uniform float u_historyHead,u_historyPhase;
float echoAt(float frequency,float age){
 float f=clamp(frequency,0.,1.)*47.,row=clamp(age*30.-u_historyPhase,0.,126.);int a=int(f),b=min(a+1,47),r=int(row);
 int i=(int(u_historyHead)-r+256)%128,j=(i+127)%128;
 float v=mix(texelFetch(u_history,ivec2(a,i),0).r,texelFetch(u_history,ivec2(b,i),0).r,fract(f));
 float w=mix(texelFetch(u_history,ivec2(a,j),0).r,texelFetch(u_history,ivec2(b,j),0).r,fract(f));
 return mix(v,w,fract(row));
}
float terrain(float x,float z){
 float across=clamp((abs(x)-2.45)/23.,0.,1.),shoulder=smoothstep(0.,.16,across),age=z*.028+across*.8;
 float voice=mix(band(across),echoAt(across,age),smoothstep(1.,8.,z));
 float echo=echoAt(across,max(0.,age-.45))*.3+echoAt(across,max(0.,age-.9))*.12;
 float base=.18+.28*pow(.5+.5*sin(abs(x)*.52+sin((z+speedClock())*.07)),2.);
 return shoulder*(base+(voice+echo)*exp(-age*.26)*(2.1+u_roles.x*u_movement*3.8));
}
`;

export const AFTERGLOW_TERRAIN_VERTEX=`#version 300 es
precision highp float;
${DRIVE}
${PROJECT}
${TERRAIN}
out vec3 v_position;out vec2 v_grid;out float v_signal;
void main(){
 int corner=gl_VertexID%6,cell=gl_VertexID/6,side=cell/6144,at=cell%6144;
 vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 float across=(float(at%48)+o.x)/48.,row=float(at/48)+o.y;
 float travel=speedClock(),z=.9+row*.75-mod(travel,.75),x=(side==0?-1.:1.)*(2.45+across*23.);
 v_position=vec3(x,terrain(x,z),z);v_grid=vec2(across*48.,row-floor(travel/.75));v_signal=band(across);
 driveProject(v_position);
}`;
export const AFTERGLOW_TERRAIN_FRAGMENT=`#version 300 es
precision highp float;
${DRIVE}
in vec3 v_position;in vec2 v_grid;in float v_signal;out vec4 fragColor;
void main(){
 vec2 cell=abs(fract(v_grid-.5)-.5)/max(fwidth(v_grid),vec2(.0001));
 float wire=1.-smoothstep(.28,1.25,min(cell.x,cell.y));
 float diagonal=abs(fract(v_grid.x+v_grid.y-.5)-.5)/max(.0001,fwidth(v_grid.x+v_grid.y));
 float facet=1.-smoothstep(.22,.8,diagonal);
 vec3 normal=normalize(cross(dFdx(v_position),dFdy(v_position)));float facing=abs(normal.y);
 float across=clamp((abs(v_position.x)-2.45)/23.,0.,1.),fade=exp(-v_position.z*.018);
 vec3 tint=mix(cyan(),pink(),clamp(across*.8+v_position.y*.07,0.,1.));
 vec3 color=vec3(.0015,.001,.008)+pink()*(.002+facing*.003);
 color+=tint*(wire*(.16+lamp(across)*.45+u_roles.y*u_particle.z*.045)+facet*.028)*fade;
 color+=tint*pow(v_signal,3.)*.009*fade;
 color=mix(color,pink()*.015+cyan()*.004,smoothstep(48.,96.,v_position.z));
 fragColor=vec4(color,1.);
}`;

export const AFTERGLOW_PALM_VERTEX=`#version 300 es
precision highp float;
${DRIVE}
${PROJECT}
out vec2 v_uv;out float v_id,v_depth;
void main(){
 int corner=gl_VertexID%6;float id=float(gl_VertexID/6),side=mod(id,2.)*2.-1.,slot=floor(id/2.);
 vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 float depth=1.+mod(slot*8.+hash(slot+8.)*2.-speedClock(),160.),height=3.3+hash(slot+51.)*1.7;
 vec3 p=vec3(side*(3.2+hash(slot+19.)*.4)+(o.x-.5)*height*1.3,(o.y)*height,depth);
 v_uv=vec2(o.x*2.-1.,o.y);v_id=id;v_depth=depth;driveProject(p);
}`;
export const AFTERGLOW_PALM_FRAGMENT=`#version 300 es
precision highp float;
${DRIVE}
${EDGES}
in vec2 v_uv;in float v_id,v_depth;out vec4 fragColor;
float segment(vec2 p,vec2 a,vec2 b){vec2 d=b-a;return length(p-a-d*clamp(dot(p-a,d)/dot(d,d),0.,1.));}
void main(){
 vec2 p=v_uv;float sway=sin(u_world.x*.22+floor(v_id/2.))*.025;
 vec2 crown=vec2(.12+sway,.75);float t=clamp(p.y/.75,0.,1.);
 float trunk=abs(p.x-crown.x*t*t),width=mix(.030,.012,t);
 float shape=aa(trunk,width)*step(p.y,.75);
 float rim=aa(abs(trunk-width),.004)*step(p.y,.75)*(.4+.6*step(p.x,crown.x*t*t));
 // Paired curved fronds, with separated tapered leaflets along every rib.
 if(p.y>.43)for(int f=0;f<10;f++){
  float n=float(f),side=mod(n,2.)*2.-1.,row=floor(n/2.);
  vec2 end=crown+vec2(side*(.82-row*.15),-.17+row*.11),bend=(crown+end)*.5+vec2(0.,.20-row*.025);
  for(int j=0;j<7;j++){
   float a=float(j)/7.,b=float(j+1)/7.;vec2 va=mix(mix(crown,bend,a),mix(bend,end,a),a),vb=mix(mix(crown,bend,b),mix(bend,end,b),b);
   float spine=segment(p,va,vb);shape=max(shape,aa(spine,.007*(1.-a*.6)));
   vec2 tip=vb+vec2(side*.05,-.13*(1.-b*.8));float leaf=segment(p,vb,tip);
   float upper=segment(p,vb,vb+vec2(side*.025,.055*(1.-b)));
   shape=max(shape,max(aa(leaf,.009*(1.-b*.8)),aa(upper,.007*(1.-b*.8))));rim=max(rim,aa(spine,.002)*.65);
  }
 }
 if(shape<.04)discard;
 float rings=.5+.5*sin(p.y*125.+p.x*12.);
 vec3 color=vec3(.001,.0015,.004)+pink()*.006*rings;
 color+=mix(cyan(),pink(),mod(v_id,2.))*rim*(.022+.018*u_roles.z)*exp(-v_depth*.009);
 fragColor=vec4(color,1.);
}`;

export const AFTERGLOW_DUST_VERTEX=`#version 300 es
precision highp float;
${DRIVE}
${PROJECT}
uniform float u_pixel,u_density;
in vec4 a_seed;out vec3 v_color;out float v_alpha;
void main(){
 float depth=1.5+fract(a_seed.z-speedClock()*.003)*80.;
 vec3 p=vec3((a_seed.x-.5)*24.,.25+a_seed.y*6.,depth);
 p.x+=sin(u_world.x*.12+a_seed.y*30.)*.12;driveProject(p);
 float fade=smoothstep(1.5,8.,depth)*(1.-smoothstep(55.,82.,depth));
 v_alpha=(.012+.06*u_roles.w+.06*lamp(a_seed.y))*fade*u_density;
 v_color=mix(pink(),cyan(),a_seed.w);
 gl_PointSize=clamp(u_pixel*u_particle.y*(1.+16./depth),1.,5.);
}`;
export const AFTERGLOW_DUST_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in float v_alpha;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;float a=exp(-r*4.)*v_alpha;fragColor=vec4(v_color*a,0.);}
`;
