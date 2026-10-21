// Flat, screen-space brushwork. No scene camera, perspective, lighting or bloom.
const INK=`
uniform float u_inkTime,u_ratio,u_movement,u_strands,u_segments,u_inkLayer,u_inkEdition;
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
 float contour=(band(t)*.36+(band(t-.035)+band(t+.035))*.24+(band(t-.07)+band(t+.07))*.08)*2.-.35;
 p*=1.+bass*.19;
 p+=vec2(sin(t*PI*4.+u_inkTime*1.6)*bass*.065,
  sin(t*PI*4.-u_inkTime*1.8)*lead*.075+contour*lead*.055);
 return p;
}
vec2 trace(float t,float edition){
 if(u_inkLayer<.5||u_inkLayer>2.5)return gesture(t,edition);
 if(u_inkLayer<1.5){
  float envelope=pow(max(0.,sin(t*PI)),1.4);
  return vec2((t-.5)*2.12,-.25+sin(t*PI*3.+u_inkTime*.5)*(.05+u_roles.z*.16*u_movement)*envelope
   +sin(t*PI*34.)*band(t)*envelope*(.018*u_movement+u_roles.z*.065*u_movement));
 }
 float a=t*2.*PI;return vec2(.28,-.02)+vec2(cos(a),sin(a))*(.37+u_roles.x*u_movement*.08);
}
`;

export const CONTOUR_VERTEX=`#version 300 es
precision highp float;
${INK}
out vec4 v_brush;out float v_density;out float v_red;out float v_wash;
void main(){
 int segs=int(u_segments),cell=gl_VertexID/6,corner=gl_VertexID%6;
 float strand=float(cell/segs),t=(float(cell%segs)+((corner==1||corner==3||corner==5)?1.:0.))/u_segments;
 float edge=(corner==0||corner==1||corner==3)?-1.:1.;
 float seed=hash(strand+u_inkLayer*171.),lane=(strand+.15+seed*.7)/u_strands*2.-1.;
 float cycle=floor(u_inkTime/17.),age=mod(u_inkTime,17.);
 float edition=cycle-u_inkEdition;
 float reveal=u_inkEdition>.5?1.:smoothstep(0.,4.2,age);
 float opacity=u_inkEdition>.5?1.-smoothstep(.1,4.5,age):1.;
 if(edition<0.)opacity=0.;
 vec2 p=trace(t,edition),before=trace(max(0.,t-.005),edition),after=trace(min(1.,t+.005),edition);
 if(u_inkLayer<.5||u_inkLayer>2.5){before=baseGesture(max(0.,t-.005),edition);after=baseGesture(min(1.,t+.005),edition);}
 vec2 tangent=normalize(after-before+vec2(.00001,0.)),normal=vec2(-tangent.y,tangent.x);
 float pressure=pow(max(.001,sin(PI*t)),.55)*(.58+.42*sin(t*5.2+.4));
 float width=(.004+pressure*.145)*(1.+clamp(u_roles.y*u_movement,0.,1.4)*.45)*smoothstep(0.,.025,t)*(1.-smoothstep(.90,1.,t));
 if(u_inkLayer>.5&&u_inkLayer<2.5)width=u_inkLayer<1.5?.001+.004*sin(t*PI):.002;
 float rake=sin(t*27.+seed*9.)*.0017+sin(t*93.+seed*29.)*.0006;
 float filament=width/u_strands*(.48+seed*.9);
 if(u_inkLayer>2.5){lane=0.;filament=width;}
 p+=normal*(lane*width+rake+edge*filament);
 p=place(p);gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);
 v_brush=vec4(t,u_inkLayer>2.5?edge:lane,edge,seed);
 v_density=opacity*(1.-smoothstep(reveal-.035,reveal+.002,t))*(.55+pressure*.6)*(1.+lamp(t)*.65);
 if(u_inkLayer<.5)v_density*=.26;
 else if(u_inkLayer>2.5)v_density*=1.85;
 else if(u_inkLayer<2.5)v_density*=u_inkLayer<1.5?1.2:.65;
 v_red=u_inkLayer>.5&&u_inkLayer<1.5?1.:u_inkLayer>1.5&&u_inkLayer<2.5?-1.:0.;v_wash=u_inkLayer>2.5?1.:0.;
}`;

export const CONTOUR_FRAGMENT=`#version 300 es
precision highp float;
in vec4 v_brush;in float v_density;in float v_red;in float v_wash;out vec4 fragColor;
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
 vec3 pigment=mix(vec3(.78,.79,.82),vec3(.13,1.38,1.52),max(0.,v_red));
 fragColor=vec4(pigment*ink,ink);
}`;

export const CONTOUR_DROPS_VERTEX=`#version 300 es
precision highp float;
${INK}
uniform vec4 u_inkEvents[8];out vec3 v_drop;
void main(){
 int burst=gl_VertexID/24;float id=float(gl_VertexID%24),seed=hash(float(gl_VertexID)+.8);
 vec4 event=u_inkEvents[burst];float age=max(0.,u_inkTime-event.z),angle=id*2.39996+seed;
 float travel=(1.-exp(-age*7.))*(.025+pow(seed,1.8)*.25)*event.w;
 vec2 p=place(event.xy+vec2(cos(angle),sin(angle))*travel);
 gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);
 gl_PointSize=max(1.2,(id<1.?.028:.002+pow(seed,3.)*.013)*u_resolution.y*(.7+event.w*.7));
 v_drop=vec3((1.-smoothstep(1.4,5.5,age))*step(.001,event.w),seed,age);
}`;

export const CONTOUR_DROPS_FRAGMENT=`#version 300 es
precision highp float;in vec3 v_drop;out vec4 fragColor;
void main(){
 vec2 p=gl_PointCoord*2.-1.;float a=atan(p.y,p.x),r=length(p);
 float edge=.76+sin(a*3.+v_drop.y*8.)*.07+sin(a*7.+v_drop.y*13.)*.04+sin(a*11.)*.02;
 float ink=(1.-smoothstep(edge-.12,edge,r))*v_drop.x;
 float grain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
 ink*=.72+grain*.28;fragColor=vec4(vec3(.16,1.12,1.27)*ink,ink);
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
  ink+=vec3(.32)*bar;fragColor=vec4(ink,label.a+bar);return;}
 vec2 p=v_uv*u_resolution;
 float fine=grain(p*.93),fiber=grain(vec2(p.x*.11,p.y*1.8));
 float tooth=(fine-.5)*.022+(fiber-.5)*.011;
 float wash=sin(v_uv.x*8.+v_uv.y*3.)*sin(v_uv.y*7.)*.005;
 vec3 paper=vec3(.964,.949,.911)+tooth+wash;
 fragColor=vec4(paper,1.);
}`;
