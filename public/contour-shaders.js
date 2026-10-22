// Flat brushwork: RGB stores ink absorption, alpha stores colored emission only.
const INK=`
uniform float u_inkTime,u_ratio,u_movement,u_strands,u_segments,u_inkLayer;
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
uniform vec3 u_inkAccent;uniform vec4 u_inkMaterial;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 float t=v_brush.x,lane=v_brush.y,seed=v_brush.w;
 float dry=noise(vec2(t*90.,seed*80.));
 float wet=u_inkMaterial.y,loading=u_inkMaterial.x;
 float rake=smoothstep(.16-wet*.15,.78-wet*.12,dry+(.8-abs(lane))*(.25+loading*.35));
 float tooth=noise(gl_FragCoord.xy*.8);
 float fade=1.-smoothstep(.4,1.,abs(v_brush.z));
 float ink=v_density*rake*(.65+.35*tooth)*fade;
 if(v_wash>.5){
  float broken=noise(vec2(t*110.,lane*18.));
  float edge=1.-smoothstep(.60+broken*.12,1.,abs(lane));
  float bristles=noise(vec2(t*16.,lane*62.));
  float scratches=smoothstep(.22,.48,bristles+(.65-abs(lane))*.28);
  ink=v_density*edge*(.17+loading*.18+broken*.65)*scratches*(.65+.35*tooth);
 }
 if(v_red>.5)ink=v_density*fade*(.8+tooth*.2);
 if(v_red<-.5)ink=v_density*fade*.5;
 float reflection=exp(-pow((lane+.34)/.11,2.))*pow(.5+.5*sin(t*19.+seed*3.),12.)*wet;
 if(abs(v_red)<.5)ink*=1.-reflection*.24;
 vec3 pigment=mix(vec3(.78,.79,.82),-log(max(u_inkAccent*.85,vec3(.015)))/3.4,max(0.,v_red));
 fragColor=vec4(pigment*ink,v_red>.5?ink*v_emission:0.);
}`;

export const CONTOUR_DROPS_VERTEX=`#version 300 es
precision highp float;
uniform highp sampler2D u_inkData;uniform float u_inkTime,u_ratio,u_inkStage;uniform vec2 u_resolution;
out vec2 v_uv;out vec4 v_drop,v_tint,v_link;out float v_part,v_seed;
void main(){
 int corner=gl_VertexID%6,part=gl_VertexID/6,index=gl_InstanceID+(u_inkStage>.5?64:0);
 vec2 quad=corner==0?vec2(-1,-1):corner==1?vec2(1,-1):corner==2?vec2(-1,1):corner==3?vec2(-1,1):corner==4?vec2(1,-1):vec2(1,1);
 vec4 event=texelFetch(u_inkData,ivec2(index,0),0),detail=texelFetch(u_inkData,ivec2(index,1),0),link=texelFetch(u_inkData,ivec2(index,2),0);
 v_tint=texelFetch(u_inkData,ivec2(index,3),0);
 float age=u_inkTime-event.z,seed=detail.w,fall=detail.y,kind=detail.z,radius=detail.x;
 bool memory=u_inkStage>.5;
 float wet=age-fall,impact=max(0.,wet),strength=event.w;
 if(memory){wet=8.;impact=8.;}
 vec2 p=vec2(event.x*u_ratio,event.y),size=vec2(.006),axis=vec2(1.,0.);
 float live=step(.001,strength)*step(0.,age),opacity=1.;v_link=vec4(0.);
 if(memory)live*=smoothstep(0.,1.8,age)*(1.-smoothstep(31.,45.,age))*event.w;
 if(part==10){
  // Gravity accelerates each bead toward the sheet; fine mist hangs longer.
  float t=clamp(age/max(.01,fall),0.,1.),remaining=1.-t;
  p+=vec2(-.13*remaining,(1.-t*t)*(1.12+seed*.28));
  p.x+=sin(t*3.14159)*(.012+seed*.025);
  size=vec2(kind<.5?.0014:.0028+radius*.11,.003+remaining*(kind<.5?.010:.020+strength*.012));
  live*=1.-step(fall,age);opacity=kind<.5?.32:.85;
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
 float spread=1.-exp(-age*1.5),fiber=noise(vec2(angle*22.+v_seed*91.,r*13.));
 float edge=.67+sin(angle*2.+v_seed*11.)*.09+sin(angle*3.-v_seed*19.)*.055+sin(angle*7.+v_seed*13.)*.035;
 edge+=(fiber-.5)*(.025+spread*.13)+sin(angle*67.+v_seed*31.)*.015*spread;
 if(v_part>9.5&&v_part<10.5)edge=.60;
 float ink=(1.-smoothstep(edge-.065,edge+.065,r))*v_drop.x;
 float tooth=hash(floor(gl_FragCoord.xy)),tide=exp(-pow((r-edge+.040)/.045,2.))*spread;
 ink*=.65+tooth*(.12+(1.-wet)*.24)+tide*.8;
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
 if(v_part<.5||abs(v_part-10.)<.5)color=mix(color,vec3(.98),wet*(gloss*.45+pin*.55));
 fragColor=vec4(color,clamp(ink,0.,.95));
}`;

// Currents share the exact live brush curve: their roots cannot drift away
// from the frequency gesture when its shape, orientation or layout changes.
export const CONTOUR_CURRENT_VERTEX=`#version 300 es
precision highp float;
${INK}
uniform highp sampler2D u_currentData;uniform float u_currentStage,u_currentPhase;
out vec4 v_current;out vec4 v_pigment;out float v_seed;
vec2 stream(vec2 a,vec2 b,float t,float seed,float branch){
 vec2 delta=b-a,normal=vec2(-delta.y,delta.x);
 float bend=sin(seed*13.+branch*2.)*.24+sin(u_currentPhase*.7+seed*8.)*.035*u_inkMaterial.z;
 return mix(a,b,t)+normal*sin(t*PI)*(bend+sin(t*PI*2.+seed*9.)*.085);
}
vec2 bloom(vec2 root,vec2 normal,float node,float t,float seed,float radius){
 int lineage[5];int depth=0,n=int(node)+1;
 for(int i=0;i<5;i++){lineage[i]=n;if(n>1){depth++;n/=2;}}
 vec2 p=root;float angle=atan(normal.y,normal.x)+sin(seed*19.)*.65;
 for(int i=4;i>=0;i--){
  int id=lineage[i];if(i>depth)continue;
  if(id>1)angle+=(id%2==0?-1.:1.)*(.37+hash(float(id)+seed*37.)*.48);
  float segment=radius*pow(.64,float(depth-i));
  // Ancestors have already grown; the last segment is sampled along its length.
  float along=i==0?t:1.;
  p+=vec2(cos(angle),sin(angle))*segment*along;
  p+=vec2(-sin(angle),cos(angle))*sin(along*PI)*segment*.18*sin(seed*21.+float(id));
 }
 return p;
}
void main(){
 int corner=gl_VertexID%6,cell=gl_VertexID/6,segs=int(u_segments),branch=cell/segs;
 float t=(float(cell%segs)+((corner==1||corner==3||corner==5)?1.:0.))/u_segments;
 float edge=(corner==0||corner==1||corner==3)?-1.:1.;
 int index=gl_InstanceID+(u_currentStage>.5?32:0);
 vec4 event=texelFetch(u_currentData,ivec2(index,0),0),detail=texelFetch(u_currentData,ivec2(index,1),0),link=texelFetch(u_currentData,ivec2(index,3),0);
 v_pigment=texelFetch(u_currentData,ivec2(index,2),0);v_seed=detail.y;
 float age=max(0.,u_inkTime-event.z),live=step(.001,event.w)*step(event.z,u_inkTime),seed=detail.y;
 vec2 root=place(gesture(detail.x,0.));
 vec2 tangent=normalize(place(baseGesture(detail.x+.003,0.))-place(baseGesture(detail.x-.003,0.))+vec2(.00001,0.));
 vec2 normal=vec2(-tangent.y,tangent.x),p,before,after;
 float growth=1.-exp(-age*(.65+event.w*.55)),width=.0018+event.w*.0026,opacity=.48;
 if(u_currentStage<.5){
  vec2 source=vec2(event.x*u_ratio,event.y),target=root;
  if(branch>0){
   // Two fine tributaries either reach another wet pool or fork into the tooth.
   vec2 delta=root-source;
   target=stream(source,root,branch==1?.43:.70,seed,0.);
   source=branch==1&&link.z>.5?vec2(link.x*u_ratio,link.y):source+vec2(-delta.y,delta.x)*(branch==1?.45:-.38);
   width*=.50;opacity*=.55;
  }
  p=stream(source,target,t,seed,float(branch));before=stream(source,target,max(0.,t-.006),seed,float(branch));after=stream(source,target,min(1.,t+.006),seed,float(branch));
  live*=1.-smoothstep(5.,9.,age);opacity*=smoothstep(0.,.9,age);
 }else{
  float radius=.065+event.w*.12,depth=floor(log2(float(branch)+1.));
  p=bloom(root,normal,float(branch),t,seed,radius);before=bloom(root,normal,float(branch),max(0.,t-.006),seed,radius);after=bloom(root,normal,float(branch),min(1.,t+.006),seed,radius);
  growth=clamp(age/2.8,0.,1.);growth=clamp(growth*5.-depth,0.,1.);
  width=(.0026+event.w*.0025)*pow(.66,depth);opacity=.52*mix(1.,.10,smoothstep(3.,7.,age));
  live*=1.-smoothstep(11.,15.,age);
 }
 vec2 axis=normalize(after-before+vec2(.00001,0.));
 float pulse=pow(max(0.,cos((t*2.5-u_currentPhase-seed)*6.28318)),22.)*u_inkMaterial.y;
 width*=.85+pulse*1.4;
 p+=vec2(-axis.y,axis.x)*edge*width*(.55+.45*sin(t*PI));
 gl_Position=vec4(p.x/u_ratio,p.y,0.,1.);
 v_current=vec4(t,edge,live*opacity,growth);
}`;

export const CONTOUR_CURRENT_FRAGMENT=`#version 300 es
precision highp float;
in vec4 v_current,v_pigment;in float v_seed;out vec4 fragColor;
uniform float u_currentPhase,u_currentStage;uniform vec4 u_inkMaterial;
void main(){
 float t=v_current.x,edge=v_current.y;
 float tooth=fract(sin(dot(floor(gl_FragCoord.xy),vec2(127.1,311.7)))*43758.5453);
 float line=1.-smoothstep(.35,1.,abs(edge));
 float grown=1.-smoothstep(v_current.w-.025,v_current.w+.025,t);
 float pulse=pow(max(0.,cos((t*2.5-u_currentPhase-v_seed)*6.28318)),22.)*u_inkMaterial.y;
 vec3 pigment=mix(vec3(.025,.031,.038),max(vec3(.018),v_pigment.rgb)*.74,v_pigment.a);
 // Pigment catches a travelling, coloured wet highlight. It dries back into
 // the paper, with no full-screen light source or change to its white point.
 pigment=mix(pigment,max(pigment,v_pigment.rgb)*.75,pulse*.70);
 float ink=line*grown*v_current.z*(.55+tooth*.45)*(1.+pulse*.45);
 fragColor=vec4(pigment,clamp(ink,0.,.9));
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
