import {CONTOUR_RAIN_SPEED} from './contour-motion.js';
// Flat brushwork: RGB stores ink absorption, alpha stores colored emission only.
const INK=`
uniform float u_inkTime,u_inkPhase,u_ratio,u_movement,u_strands,u_segments,u_inkLayer;
uniform vec2 u_resolution;uniform vec4 u_roles,u_inkMaterial;uniform float u_spectrum[48],u_spectrumLight[48];
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
 float width=(.004+pressure*.145)*(.78+u_inkMaterial.x*.55+u_inkMaterial.w*.12)*smoothstep(0.,.025,t)*(1.-smoothstep(.90,1.,t));
 if(u_inkLayer>.5&&u_inkLayer<2.5)width=u_inkLayer<1.5?.002+.004*sin(t*PI):.002+u_roles.z*u_movement*.0015;
 float rake=sin(t*27.+seed*9.)*.0017+sin(t*93.+seed*29.)*.0006;
 if(u_inkLayer<.5)rake+=sin(t*31.-u_inkPhase*2.4+seed*3.)*.0023*(.3+u_inkMaterial.y);
 float filament=width/u_strands*(.48+seed*.9);
 if(u_inkLayer>2.5){lane=0.;filament=width;}
 p+=normal*(lane*width+rake+edge*filament);
 p=place(p);gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);
 v_brush=vec4(t,u_inkLayer>2.5?edge:lane,edge,seed);
 v_density=(.55+pressure*.6)*(1.+lamp(t)*.65)*(.72+u_inkMaterial.y*.30+u_inkMaterial.x*.26);
 if(u_inkLayer<.5)v_density*=.26;
 else if(u_inkLayer>2.5)v_density*=1.85;
 else if(u_inkLayer<2.5)v_density*=u_inkLayer<1.5?1.2:.65;
 v_red=u_inkLayer>.5&&u_inkLayer<1.5?1.:u_inkLayer>1.5&&u_inkLayer<2.5?-1.:0.;v_wash=u_inkLayer>2.5?1.:0.;
 v_emission=.28+lamp(t)*2.6+band(t)*.8+u_roles.y*.6;
}`;

export const CONTOUR_FRAGMENT=`#version 300 es
precision highp float;
in vec4 v_brush;in float v_density;in float v_red;in float v_wash;in float v_emission;out vec4 fragColor;
uniform vec3 u_inkAccent;uniform vec4 u_inkMaterial;uniform float u_inkPhase;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 float t=v_brush.x,lane=v_brush.y,seed=v_brush.w;
 float travel=t-u_inkPhase*.047;
 float meander=sin(travel*17.+lane*2.)*.16+sin(travel*43.-lane*4.)*.06;
 float dry=noise(vec2(travel*90.,seed*80.+meander*3.));
 float wet=u_inkMaterial.y,loading=u_inkMaterial.x;
 float rake=smoothstep(.16-wet*.15,.78-wet*.12,dry+(.8-abs(lane))*(.25+loading*.35));
 float tooth=noise(gl_FragCoord.xy*.8);
 float fade=1.-smoothstep(.4,1.,abs(v_brush.z));
 float ink=v_density*rake*(.65+.35*tooth)*fade;
 if(v_wash>.5){
  float broken=noise(vec2(travel*110.,lane*18.+meander*2.));
  float edge=1.-smoothstep(.60+broken*.12,1.,abs(lane));
  float bristles=noise(vec2(travel*16.,lane*62.+meander*4.));
  float scratches=smoothstep(.22,.48,bristles+(.65-abs(lane))*.28);
  ink=v_density*edge*(.17+loading*.18+broken*.65)*scratches*(.65+.35*tooth);
 }
 if(v_red>.5)ink=v_density*fade*(.8+tooth*.2);
 if(v_red<-.5)ink=v_density*fade*.5;
 float reflection=exp(-pow((lane+.28+meander*.45)/.13,2.))*pow(.5+.5*sin(travel*29.+seed*3.),6.)*wet;
 float suspended=pow(noise(vec2(travel*170.,lane*24.+meander*2.)),8.)*(.2+wet*.8);
 if(abs(v_red)<.5)ink*=1.-reflection*.36-suspended*.30;
 if(v_red>.5)ink*=.88+.12*sin(travel*46.)*.5+.06;
 vec3 pigment=mix(vec3(.78,.79,.82),-log(max(u_inkAccent*.85,vec3(.015)))/3.4,max(0.,v_red));
 fragColor=vec4(pigment*ink,v_red>.5?ink*v_emission:0.);
}`;

export const CONTOUR_DROPS_VERTEX=`#version 300 es
precision highp float;
uniform highp sampler2D u_inkData;uniform float u_inkTime,u_ratio,u_inkStage;uniform vec2 u_resolution;
out vec2 v_uv;out vec4 v_drop,v_tint,v_link;out float v_part,v_seed;
void main(){
 int corner=gl_VertexID%6,part=u_inkStage>1.5?18:gl_VertexID/6,index=gl_InstanceID+(u_inkStage>.5&&u_inkStage<1.5?64:0);
 vec2 quad=corner==0?vec2(-1,-1):corner==1?vec2(1,-1):corner==2?vec2(-1,1):corner==3?vec2(-1,1):corner==4?vec2(1,-1):vec2(1,1);
 vec4 event=texelFetch(u_inkData,ivec2(index,0),0),detail=texelFetch(u_inkData,ivec2(index,1),0),link=texelFetch(u_inkData,ivec2(index,2),0);
 v_tint=texelFetch(u_inkData,ivec2(index,3),0);
 float age=u_inkTime-event.z,seed=detail.w,fall=detail.y,kind=detail.z,radius=detail.x;
 bool memory=u_inkStage>.5&&u_inkStage<1.5;
 float wet=age-fall,impact=max(0.,wet),strength=event.w;
 if(memory){wet=8.;impact=8.;}
 vec2 p=vec2(event.x*u_ratio,event.y),size=vec2(.006),axis=vec2(1.,0.);
 float live=step(.001,strength)*step(0.,age),opacity=1.;v_link=vec4(0.);
 if(memory)live*=smoothstep(0.,1.8,age)*(1.-smoothstep(31.,45.,age))*event.w;
 if(part==18){
  size=vec2(.035+impact*.17);v_link.x=size.x;
  live*=smoothstep(0.,.035,wet)*(1.-smoothstep(1.7,2.8,wet));opacity=(kind<.5?.045:.10+strength*.07);
 }else if(part==10){
  // Every bead starts above the frame and travels at the same screen speed.
  // Impact height changes its flight duration, never its velocity.
  p.y+=max(0.,fall-age)*${CONTOUR_RAIN_SPEED.toFixed(2)};
  size=vec2(kind<.5?.002:.0035+radius*.10,kind<.5?.010:.016+radius*.16);
  live*=1.-step(fall,age);opacity=kind<.5?.48:.90;
 }else if(part<2){
  float growth=1.-exp(-impact*7.);
  size=vec2(radius*mix(.34,1.,growth))*(part==1?1.7:1.);
  if(!memory)live*=smoothstep(0.,.035,wet)*(1.-smoothstep(3.4,5.45,wet));
  opacity=part==1?.15:kind>1.5?.86:.72;
 }else if(part==11){
  vec2 delta=vec2((link.x-event.x)*u_ratio,link.y-event.y);float d=length(delta),r=min(radius,link.z);
  axis=delta/max(.0001,d);p+=delta*.5;
  size=vec2(d*.5+r*.65,r*.72);v_link=vec4(radius,link.z,d*.5,size.y);
  live*=link.w*smoothstep(.02,.12,wet)*(1.-smoothstep(2.8,3.4,wet));opacity=.42;
 }else if(part>11){
  float n=float(part-12),angle=n*2.39996+seed*6.28318;
  axis=vec2(cos(angle),sin(angle));float growth=1.-exp(-impact*1.9);
  p+=axis*radius*(.85+growth*.38);
  size=vec2(radius*(.10+growth*.32),.001+radius*.045);
  live*=step(.5,kind)*smoothstep(.06,.55,wet)*(1.-smoothstep(3.4,5.45,wet));opacity=.16;
 }else{
  float n=float(part-2),angle=n*2.39996+seed*6.28318;
  float speed=(.04+fract(sin(n*71.+seed*13.)*4171.)*.10)*(.45+strength)*(kind>1.5?1.4:1.);
  float travel=(1.-exp(-impact*9.))*speed;
  p+=vec2(cos(angle),sin(angle))*(travel+sin(min(1.,impact*3.)*3.14159)*speed*.22);
  size=vec2(.0012+pow(fract(sin(n*127.+seed*31.)*4375.),3.)*.005)*(1.+strength*.7);
  live*=step(.5,kind)*smoothstep(0.,.012,wet)*(1.-smoothstep(2.5,4.9,wet));opacity=.55;
 }
 vec2 offset=quad*size;p+=mat2(axis.x,axis.y,-axis.y,axis.x)*offset;
 gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);v_uv=quad;
 v_drop=vec4(live*opacity,impact,strength,kind);v_part=float(part);v_seed=seed;
}`;

export const CONTOUR_DROPS_FRAGMENT=`#version 300 es
precision highp float;in vec2 v_uv;in vec4 v_drop,v_tint,v_link;in float v_part,v_seed;out vec4 fragColor;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 vec2 p=v_uv;float angle=atan(p.y,p.x),r=length(p),age=v_drop.y,wet=exp(-age/1.15);
 if(v_part>17.5){
  float distance=length(p*vec2(1.,1.06))*v_link.x,crest=0.,trough=0.;
  for(int i=0;i<3;i++){
   float delayed=age-float(i)*.24,front=.014+max(0.,delayed)*.15;
   float amplitude=step(0.,delayed)*exp(-age*.9)*pow(.64,float(i));
   crest+=exp(-pow((distance-front)/.0024,2.))*amplitude;
   trough+=exp(-pow((distance-front-.0035)/.003,2.))*amplitude;
  }
  float signal=crest-trough*.8;
  fragColor=vec4(signal>0.?vec3(1.,.995,.975):vec3(.40,.46,.45),abs(signal)*v_drop.x);return;
 }
 float spread=1.-exp(-age*1.5),fiber=noise(vec2(angle*22.+v_seed*91.,r*13.));
 float edge=.67+sin(angle*2.+v_seed*11.)*.09+sin(angle*3.-v_seed*19.)*.055+sin(angle*7.+v_seed*13.)*.035;
 edge+=(fiber-.5)*(.025+spread*.13)+sin(angle*67.+v_seed*31.)*.015*spread;
 if(v_part>9.5&&v_part<10.5)edge=.60;
 float ink=(1.-smoothstep(edge-.065,edge+.065,r))*v_drop.x;
 float tooth=hash(floor(gl_FragCoord.xy)),tide=exp(-pow((r-edge+.040)/.045,2.))*spread;
 ink*=.65+tooth*(.12+(1.-wet)*.24)+tide*.8;
 if(v_part>9.5&&v_part<10.5){
  float bulb=sqrt(max(0.,1.-pow((p.y+.15)/.90,2.)))*.59;
  float taper=1.-smoothstep(-.20,.85,p.y)*.72;
  ink=(1.-smoothstep(bulb*taper-.06,bulb*taper+.06,abs(p.x)))*(1.-smoothstep(.86,.99,abs(p.y)))*v_drop.x;
 }
 if(v_part>.5&&v_part<1.5)ink*=exp(-r*r*2.5);
 if(v_part>10.5&&v_part<11.5){
  float a=max(.0001,v_link.x),b=max(.0001,v_link.y),m=min(a,b);
  vec2 q=p*vec2(v_link.z+m*.65,v_link.w);
  float da=length(q+vec2(v_link.z,0.)),db=length(q-vec2(v_link.z,0.));
  float field=a*a/max(.000001,da*da)+b*b/max(.000001,db*db);
  ink=smoothstep(1.18,2.15,field)*smoothstep(a*.55,a*.98,da)*smoothstep(b*.55,b*.98,db)*v_drop.x;
 }
 if(v_part>11.5){
  float meander=sin(p.x*7.+v_seed*17.)*.07;
  ink=(1.-smoothstep(.07,.30,abs(p.y+meander)))*(1.-smoothstep(.45,1.,abs(p.x)))*v_drop.x*(.4+tooth*.6);
 }
 vec3 tint=mix(v_tint.rgb,vec3(.018,.021,.026),1.-v_tint.a);
 vec3 color=max(vec3(.012),tint)*(.74+tooth*(1.-wet)*.10);
 // A broad soft reflection and a tiny sharp catchlight vanish as water absorbs.
 float gloss=exp(-dot((p-vec2(-.22,.25))*vec2(2.8,6.),(p-vec2(-.22,.25))*vec2(2.8,6.)));
 float pin=exp(-dot(p-vec2(-.30,.31),p-vec2(-.30,.31))*180.);
 if(v_part>9.5&&v_part<10.5){gloss=exp(-pow((p.x+.19)/.085,2.)-pow((p.y+.10)/.38,2.));pin=exp(-dot(p-vec2(-.16,-.35),p-vec2(-.16,-.35))*130.);}
 if(v_part<.5||abs(v_part-10.)<.5)color=mix(color,vec3(.98),wet*(gloss*.45+pin*.55));
 fragColor=vec4(color,clamp(ink,0.,.95));
}`;

// A canopy outside the composition casts soft, defocused silhouettes. These
// are illumination on the paper, not ink branches growing out of the gesture.
export const CONTOUR_SHADOW_VERTEX=`#version 300 es
precision highp float;
uniform float u_inkTime,u_ratio;uniform vec4 u_inkMaterial;
out vec2 v_uv;out vec3 v_shadow;
float hash(float n){return fract(sin(n*127.1+19.3)*43758.5453);}
void main(){
 int corner=gl_VertexID%6,canopy=gl_InstanceID/26,leaf=gl_InstanceID%26;
 vec2 quad=corner==0?vec2(-1,-1):corner==1?vec2(1,-1):corner==2?vec2(-1,1):corner==3?vec2(-1,1):corner==4?vec2(1,-1):vec2(1,1);
 float side=canopy==0?-1.:1.,seed=hash(float(gl_InstanceID)+13.);
 float wind=u_inkTime*.24,breath=sin(wind+float(canopy)*2.3)*.04+sin(wind*.61)*.025;
 vec2 start=vec2(side*u_ratio*1.04,1.12),end=vec2(side*u_ratio*(canopy==0?.58:.66),canopy==0?.28:-.24);
 end+=vec2(breath*(1.+u_inkMaterial.y*.15),sin(wind*.83+side)*.025);
 vec2 direction=normalize(end-start),p,axis;vec2 size;
 if(leaf==0){p=(start+end)*.5;axis=direction;size=vec2(length(end-start)*.5,.004);v_shadow=vec3(.035,1.,.5);}
 else{
  float t=.09+float((leaf-1)/2)*.067,signSide=leaf%2==0?-1.:1.;
  float angle=atan(direction.y,direction.x)+signSide*(.65+seed*.43)+sin(wind*1.4+seed*9.)*.12*t;
  axis=vec2(cos(angle),sin(angle));size=vec2(.082+seed*.075,.046+hash(seed*37.)*.026);
  p=mix(start,end,t)+axis*size.x*.75+vec2(breath*.3,sin(wind+t*3.+seed)*.009)*t;
  v_shadow=vec3(.10+seed*.045,0.,.18+seed*.10);
 }
 p+=axis*quad.x*size.x+vec2(-axis.y,axis.x)*quad.y*size.y;
 gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);v_uv=quad;
}`;

export const CONTOUR_SHADOW_FRAGMENT=`#version 300 es
precision highp float;
in vec2 v_uv;in vec3 v_shadow;out vec4 fragColor;
void main(){
 vec2 p=v_uv;float mask;
 if(v_shadow.y>.5)mask=(1.-smoothstep(.05,1.,abs(p.y)))*(1.-smoothstep(.91,1.,abs(p.x)));
 else{
  float silhouette=.76*pow(max(0.,1.-p.x*p.x),.74);
  mask=(1.-smoothstep(-v_shadow.z,v_shadow.z,abs(p.y)-silhouette))*(1.-smoothstep(.83,1.,abs(p.x)));
 }
 fragColor=vec4(.46,.49,.46,mask*v_shadow.x);
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
