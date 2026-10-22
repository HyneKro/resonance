// Flat brushwork: RGB stores ink absorption, alpha stores colored emission only.
const INK=`
uniform float u_inkTime,u_ratio,u_movement,u_strands,u_segments,u_inkLayer;
uniform vec2 u_resolution;uniform vec4 u_roles;uniform float u_spectrum[48],u_spectrumLight[48];
const float PI=3.14159265359;
float hash(float p){return fract(sin(p*127.1+19.3)*43758.5453);}
float band(float t){float x=clamp(t,0.,1.)*47.;int i=int(x);return mix(u_spectrum[i],u_spectrum[min(i+1,47)],fract(x));}
float lamp(float t){return u_spectrumLight[int(clamp(t,0.,.999)*48.)];}
vec2 place(vec2 p){
 if(u_ratio<.85){p=vec2(p.y,-p.x)*min(.58,u_ratio*.91)+vec2(0.,.03);}
 else p*=min(.82,u_ratio*.52);
 return p;
}
vec2 baseGesture(float t,float edition){
 float a=t*5.75+.25,kind=mod(edition,3.);vec2 p;
 if(kind<.5){
  // A loaded circular brush opens into a long, tapering gesture.
  p=vec2(-.28,.06)+vec2(cos(a),sin(a))*.53;
  float tail=smoothstep(.76,1.,t);p=mix(p,vec2(-.04+(t-.76)*5.0,-.24+sin(t*9.)*.09),tail);
 }else if(kind<1.5){
  // Two opposed scrolls, connected by one continuous S-shaped stroke.
  p=vec2((t-.5)*2.05,sin(t*PI*2.-.25)*.39);
  p+=vec2(0.,sin(t*PI*4.)*.035);
 }else{
  // A softened diamond retains its geometric corners under the wash.
  vec2 q=vec2(cos(a),sin(a));p=sign(q)*pow(abs(q),vec2(.40))*.48;
  p=mat2(.93,-.36,.36,.93)*p+vec2(-.12,.03);
 }
 return p;
}
vec2 gesture(float t,float edition){
 vec2 p=baseGesture(t,edition);
 float bass=clamp(u_roles.x*u_movement,0.,1.6),lead=clamp(u_roles.z*u_movement,0.,1.6);
 // Low to high frequencies run along the brush and its companion line.
 vec2 tangent=normalize(baseGesture(min(1.,t+.003),edition)-baseGesture(max(0.,t-.003),edition)+vec2(.00001,0.));
 vec2 normal=vec2(-tangent.y,tangent.x);
 float spectrum=band(t)*.5+(band(t-.014)+band(t+.014))*.25;
 float envelope=pow(max(0.,sin(t*PI)),.65);
 p*=1.+bass*.12;
 p+=normal*spectrum*envelope*(.40+lead*.15)*u_movement;
 return p;
}
vec2 trace(float t,float edition){
 if(u_inkLayer<.5||u_inkLayer>2.5)return gesture(t,edition);
 if(u_inkLayer<1.5){
  vec2 tangent=normalize(baseGesture(min(1.,t+.003),edition)-baseGesture(max(0.,t-.003),edition)+vec2(.00001,0.));
  return gesture(t,edition)-vec2(-tangent.y,tangent.x)*(.024+.066*sin(t*PI));
 }
 float a=t*2.*PI,f=sin(t*PI),spectrum=band(f)*.5+(band(f-.018)+band(f+.018))*.25;
 float radius=.37+u_roles.x*u_movement*.105+spectrum*u_movement*.065;
 return vec2(.28,-.02)+vec2(cos(a),sin(a))*radius;
}
`;

export const CONTOUR_VERTEX=`#version 300 es
precision highp float;
${INK}
out vec4 v_brush;out float v_density;out float v_red;out float v_wash;out float v_emission;
void main(){
 int segs=int(u_segments),cell=gl_VertexID/6,corner=gl_VertexID%6;
 float strand=float(cell/segs),t=(float(cell%segs)+((corner==1||corner==3||corner==5)?1.:0.))/u_segments;
 float edge=(corner==0||corner==1||corner==3)?-1.:1.;
 float seed=hash(strand+u_inkLayer*171.),lane=(strand+.15+seed*.7)/u_strands*2.-1.;
 // Keep the complete painted gesture. Music changes its shape and pressure,
 // never erases it or replaces it with a new drawing on a timer.
 float edition=0.;
 vec2 p=trace(t,edition),before=trace(max(0.,t-.005),edition),after=trace(min(1.,t+.005),edition);
 if(u_inkLayer<.5||u_inkLayer>2.5){before=baseGesture(max(0.,t-.005),edition);after=baseGesture(min(1.,t+.005),edition);}
 vec2 tangent=normalize(after-before+vec2(.00001,0.)),normal=vec2(-tangent.y,tangent.x);
 float pressure=pow(max(.001,sin(PI*t)),.55)*(.58+.42*sin(t*5.2+.4));
 float width=(.004+pressure*.145)*(1.+clamp(u_roles.y*u_movement,0.,1.4)*.45)*smoothstep(0.,.025,t)*(1.-smoothstep(.90,1.,t));
 if(u_inkLayer>.5&&u_inkLayer<2.5)width=u_inkLayer<1.5?.002+.004*sin(t*PI):.002+u_roles.z*u_movement*.0015;
 float rake=sin(t*27.+seed*9.)*.0017+sin(t*93.+seed*29.)*.0006;
 float filament=width/u_strands*(.48+seed*.9);
 if(u_inkLayer>2.5){lane=0.;filament=width;}
 p+=normal*(lane*width+rake+edge*filament);
 p=place(p);gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);
 v_brush=vec4(t,u_inkLayer>2.5?edge:lane,edge,seed);
 v_density=(.55+pressure*.6)*(1.+lamp(t)*.65);
 if(u_inkLayer<.5)v_density*=.26;
 else if(u_inkLayer>2.5)v_density*=1.85;
 else if(u_inkLayer<2.5)v_density*=u_inkLayer<1.5?1.2:.65;
 v_red=u_inkLayer>.5&&u_inkLayer<1.5?1.:u_inkLayer>1.5&&u_inkLayer<2.5?-1.:0.;v_wash=u_inkLayer>2.5?1.:0.;
 v_emission=.28+lamp(t)*2.6+band(t)*.8+u_roles.y*.6;
}`;

export const CONTOUR_FRAGMENT=`#version 300 es
precision highp float;
in vec4 v_brush;in float v_density;in float v_red;in float v_wash;in float v_emission;out vec4 fragColor;
uniform vec3 u_inkAccent;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 float t=v_brush.x,lane=v_brush.y,seed=v_brush.w;
 float dry=noise(vec2(t*90.,seed*80.));
 float rake=smoothstep(.05,.72,dry+(.8-abs(lane))*.45);
 float tooth=noise(gl_FragCoord.xy*.8);
 float fade=1.-smoothstep(.4,1.,abs(v_brush.z));
 float ink=v_density*rake*(.65+.35*tooth)*fade;
 if(v_wash>.5){
  float broken=noise(vec2(t*110.,lane*18.));
  float edge=1.-smoothstep(.60+broken*.12,1.,abs(lane));
  float bristles=noise(vec2(t*16.,lane*62.));
  float scratches=smoothstep(.22,.48,bristles+(.65-abs(lane))*.28);
  ink=v_density*edge*(.25+broken*.65)*scratches*(.8+.2*tooth);
 }
 if(v_red>.5)ink=v_density*fade*(.8+tooth*.2);
 if(v_red<-.5)ink=v_density*fade*.5;
 vec3 pigment=mix(vec3(.78,.79,.82),-log(max(u_inkAccent*.85,vec3(.015)))/3.4,max(0.,v_red));
 fragColor=vec4(pigment*ink,v_red>.5?ink*v_emission:0.);
}`;

export const CONTOUR_DROPS_VERTEX=`#version 300 es
precision highp float;
uniform vec4 u_inkDrops[64];uniform float u_inkTime,u_ratio;uniform vec2 u_resolution;
out vec2 v_uv;out vec4 v_drop;out float v_part,v_seed;
float hash(float p){return fract(sin(p*127.1+19.3)*43758.5453);}
void main(){
 int corner=gl_VertexID%6,part=gl_VertexID/6;
 vec2 quad=corner==0?vec2(-1,-1):corner==1?vec2(1,-1):corner==2?vec2(-1,1):corner==3?vec2(-1,1):corner==4?vec2(1,-1):vec2(1,1);
 vec4 event=u_inkDrops[gl_InstanceID];float age=u_inkTime-event.z;
 float seed=hash(float(gl_InstanceID)*17.+event.z*.37),fall=.42+hash(seed+21.)*.46;
 float wet=age-fall,impact=max(0.,wet),strength=event.w;
 vec2 p=vec2(event.x*u_ratio,event.y),size=vec2(.006);
 float live=step(.001,strength)*step(0.,age),opacity=1.;
 if(part==10){
  // Near-camera droplets descend in a shallow layer toward the paper. Their
  // tapering tails contract into a round bead immediately before impact.
  float t=clamp(age/fall,0.,1.),remaining=1.-t;
  p+=vec2(-.13*remaining,.90*remaining+remaining*remaining*.62);
  p.x+=sin(t*3.14159)*(.012+seed*.025);
  size=vec2(.0025+strength*.0035,.004+remaining*(.012+strength*.018));
  live*=1.-step(fall,age);opacity=.7;
 }else if(part<2){
  float growth=1.-exp(-impact*7.);
  float radius=(.009+strength*.026)*(1.+seed*.35)*mix(.34,1.,growth);
  size=vec2(radius)*(part==1?1.7:1.);
  live*=smoothstep(0.,.035,wet)*(1.-smoothstep(3.4,5.45,wet));
  opacity=part==1?.12:.68;
 }else{
  float n=float(part-2),angle=n*2.39996+seed*6.28318;
  float speed=(.04+hash(n+seed*11.)*.10)*(.45+strength);
  float travel=(1.-exp(-impact*9.))*speed;
  p+=vec2(cos(angle),sin(angle))*(travel+sin(min(1.,impact*3.)*3.14159)*speed*.22);
  size=vec2(.0015+pow(hash(n+seed*31.),3.)*.0055)*(1.+strength*.7);
  live*=smoothstep(0.,.012,wet)*(1.-smoothstep(2.5,4.9,wet));opacity=.55;
 }
 vec2 offset=quad*size;p+=offset;
 gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);v_uv=quad;
 v_drop=vec4(live*opacity,impact,strength,step(.36,hash(seed+31.)));v_part=float(part);v_seed=seed;
}`;

export const CONTOUR_DROPS_FRAGMENT=`#version 300 es
precision highp float;in vec2 v_uv;in vec4 v_drop;in float v_part,v_seed;out vec4 fragColor;uniform vec3 u_inkAccent;
float hash(float p){return fract(sin(p*127.1+19.3)*43758.5453);}
void main(){
 vec2 p=v_uv;float angle=atan(p.y,p.x),r=length(p),age=v_drop.y;
 float edge=.67+sin(angle*2.+v_seed*11.)*.09+sin(angle*3.-v_seed*19.)*.055+sin(angle*7.+v_seed*13.)*.035+sin(angle*13.-v_seed*29.)*.018;
 if(v_part>9.5)edge=.60;
 float soft=v_part<1.5?.10:.07;
 float ink=(1.-smoothstep(edge-soft,edge+soft,r))*v_drop.x;
 float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
 // Pigment collects at a drying tide line; a faint capillary wash feathers out.
 float tide=exp(-pow((r-edge+.045)/.055,2.))*(1.-exp(-age*2.));
 ink*=.70+grain*.20+tide*.7;
 if(v_part>.5&&v_part<1.5)ink*=exp(-r*r*2.5);
 vec3 tint=mix(u_inkAccent,vec3(.07),hash(v_seed+7.)*.18);
 vec3 pigment=mix(vec3(.86,.87,.89),-log(max(tint*.88,vec3(.015)))/3.4,v_drop.w);
 vec3 color=exp(-pigment*3.4);
 if(v_part>9.5)color+=vec3(.18)*exp(-dot(p-vec2(-.18,.15),p-vec2(-.18,.15))*24.);
 // Paint onto the paper before the foreground gesture. Its dark bristles then
 // naturally cover every wet stain, rather than letting colored drops shine over it.
 fragColor=vec4(color,clamp(ink,0.,.95));
}`;

export const CONTOUR_PAPER=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;uniform sampler2D u_lettering;uniform float u_paper;uniform float u_spectrum[48];
float grain(vec2 p){return fract(sin(dot(floor(p),vec2(127.1,311.7)))*43758.5453);}
void main(){
 if(u_paper<.5){vec4 label=texture(u_lettering,vec2(v_uv.x,1.-v_uv.y));vec3 ink=-log(max(label.rgb,vec3(.035)))/3.4*label.a;
  float x=(v_uv.x-.69)/.22;int bin=int(clamp(x,0.,.999)*48.);
  float bar=(1.-smoothstep(.16,.24,abs(fract(x*48.)-.5)))*step(0.,x)*step(x,1.)
   *step(.19,v_uv.y)*(1.-smoothstep(.192+u_spectrum[bin]*.025,.194+u_spectrum[bin]*.025,v_uv.y));
  ink+=vec3(.32)*bar;fragColor=vec4(ink,0.);return;}
 vec2 p=v_uv*u_resolution;
 float fine=grain(p*.93),fiber=grain(vec2(p.x*.11,p.y*1.8));
 float tooth=(fine-.5)*.022+(fiber-.5)*.011;
 float wash=sin(v_uv.x*8.+v_uv.y*3.)*sin(v_uv.y*7.)*.005;
 vec3 paper=vec3(.955,.952,.940)+tooth*.55+wash*.6;
 fragColor=vec4(paper,1.);
}`;
