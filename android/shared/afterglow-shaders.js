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
 color+=hot*.075*exp(-abs(y-.055)*12.);
 // Broad atmospheric glow is separate from the crisp, progressively sliced disc.
 vec2 sunP=p-vec2(0.,.18);float radius=.205,sd=length(sunP);
 float solar=1.+u_roles.z*.30*u_movement;
 color+=(hot*.15*exp(-sd*5.5)+gold*.065*exp(-sd*3.2))*solar;
 color+=mix(hot,gold,.35)*exp(-abs(sd-radius)*48.)*.18*solar;
 float disc=aa(max(0.,sd-radius),.0001)*step(sd,radius+.003);
 float slices=1.;if(sunP.y<.025){float row=(.025-sunP.y)*35.;float gap=.12+clamp(-sunP.y,0.,.23)*2.0;slices=smoothstep(gap,gap+max(.025,fwidth(row)),fract(row));}
 vec3 sunColor=mix(hot,gold,smoothstep(-.15,.15,sunP.y));sunColor=mix(sunColor,vec3(1.,.64,.13),smoothstep(.10,.21,sunP.y)*.25*(1.-u_retro.z*.5));
 color+=sunColor*disc*slices*(1.15+u_roles.z*.40*u_movement);
 // Stable star identities, with rare four-point glints and gentle musical twinkle.
 vec2 starGrid=p*vec2(125.,95.),cell=floor(starGrid),q=fract(starGrid)-.5;
 float seed=random2(cell),star=exp(-dot(q,q)*360.);
 float cross=step(abs(q.x),.052)*step(abs(q.y),.25)+step(abs(q.y),.052)*step(abs(q.x),.25);
 color+=mix(cool,vec3(.75,.61,1.),seed)*(star+cross*step(.984,seed)*.7)*step(.963,seed)*smoothstep(.035,.22,y)*(.30+.13*sin(u_world.x*.55+seed*91.)+.35*u_roles.w);
 // Four independently drifting city layers. Window identities stay stable;
 // occupancy crossfades slowly, with a continuous spectral ribbon across town.
 for(int layer=0;layer<4;layer++){
  float l=float(layer),scale=1.+.025*sin(u_world.y*.009+l),unit=(.028+l*.014)*scale;
  float cityX=p.x/scale+sin(u_world.y*.009+l)*(.003+l*.004);
  float id=floor(cityX/unit),r=hash(id+21.+l*87.),w=unit*(.72+r*.22),x=mod(cityX,unit)-unit*.5;
  float base=-.016-l*.006,h=.05+pow(hash(id+41.+l*143.),1.8)*(.095+l*.025);
  h*=1.+.22*smoothstep(.08,.35,abs(p.x));float by=y-base,roof=by/h;
  float kind=floor(r*7.),width=w;
  if(kind<1.)width*=1.-step(.73,roof)*.16-step(.89,roof)*.22;
  else if(kind<2.)width*=1.-step(.82,roof)*.28;
  else if(kind<3.)width*=1.-smoothstep(.80,1.,roof)*.66;
  else if(kind<4.)width*=1.-step(.92,roof)*.12;
  else if(kind<5.)width*=1.-step(.58,roof)*.12-step(.76,roof)*.16-step(.90,roof)*.13;
  else if(kind<6.)width*=1.-smoothstep(.65,1.,roof)*.32;
  float body=step(abs(x),width*.5)*step(by,h)*step(0.,by);
  if(kind>5.5)body*=1.-step(.67,roof)*(1.-step(w*.12,abs(x)));
  float penthouse=step(abs(x+w*.12),w*.23)*step(h,by)*step(by,h+.008+r*.012)*step(.56,r);
  float roofRail=aa(abs(by-h-.003),.0004)*step(abs(x),width*.48)*step(.35,r);
  float antenna=aa(abs(x-w*.18),.0005)*step(h,by)*step(by,h+.009+r*.019)*step(.55,r);
  vec3 trim=mix(cool,hot,r),building=mix(vec3(.002,.002,.012),hot*.026+cool*.012,l/3.);
  float sideFace=smoothstep(w*.11,w*.16,x),verticalShade=.35+.65*sin(clamp(roof,0.,1.)*PI*.75);
  building*=mix(1.45,.48,sideFace)*verticalShade;
  float edge=aa(abs(abs(x)-width*.5),.00065)+aa(abs(by-h),.0007);
  float cornice=aa(abs(fract(by/(.015+r*.016))-.5),.035)*step(.35,r);
  float mullion=aa(abs(fract((x+w*.5)/(.007+r*.006))-.5),.035);
  float balcony=aa(abs(fract(by/(.010+r*.009))-.45),.045)*step(.38,roof)*step(r,.56);
  float ribs=aa(abs(fract((x+w*.5)/(w*.25))-.5),.035)*step(.60,r);
  building+=trim*(edge*(.35+l*.09)+cornice*.065+mullion*.035+balcony*.10+ribs*.065);
  vec2 windowUV=vec2((x+w*.5)/(.0031+l*.00065+r*.0007),by/(.0044+l*.0012)),wc=floor(windowUV),wp=fract(windowUV);
  float pane=step(.18,wp.x)*step(wp.x,.64)*step(.20,wp.y)*step(wp.y,.68);
  float identity=random2(wc+id*7.+l*20.),clock=u_world.x*.055+identity*8.,era=floor(clock),blend=smoothstep(.14,.86,fract(clock));
  float occupancy=mix(step(.40,hash(identity*671.+era)),step(.40,hash(identity*671.+era+1.)),blend);
  float frequency=clamp(p.x*.56+.5,0.,1.),note=band(frequency),light=lamp(frequency);
  float waveRow=.030+note*.115,signal=exp(-abs(by-waveRow)*200.)*(.10+light*.95);
  float echo=exp(-abs(by-waveRow*.73)*290.)*light*.22,fill=step(by,waveRow)*light*.055;
  float frame=aa(abs(wp.x-.70),.035)*step(.10,wp.y)*step(wp.y,.78);
  building+=mix(gold,cool,identity)*pane*(occupancy*(.085+l*.035)+signal*(.9+l*.2)+echo+fill)*mix(1.,.50,sideFace);
  building+=trim*frame*.014;
  float signFace=step(abs(x+w*.30),w*.055)*step(h*.45,by)*step(by,h*.82)*step(.73,r);
  float signPixels=step(.35,fract(by*950.))*step(.25,fract(x*1800.));
  building+=hot*signFace*signPixels*(.35+.3*u_roles.z);
  color=mix(color,building,body);color=mix(color,trim*.075+vec3(.006),penthouse);color+=trim*roofRail*.12;color=mix(color,trim*.55,antenna);
 }
 // The road is an infinite plane with perspective-correct, antialiased grid.
 if(y<0.){
  float depth=1.2*.775/max(.0001,-y),x=p.x*depth/.775,z=depth+speedClock();
  vec2 grid=vec2(x/1.1,z/1.65),edge=abs(fract(grid-.5)-.5)/max(fwidth(grid),vec2(.0001));
  float wire=1.-smoothstep(.3,1.25,min(edge.x,edge.y));
  float fade=1.-smoothstep(35.,140.,depth),road=1.-smoothstep(2.30,2.35,abs(x));
  color=vec3(.0015,.001,.007)+hot*.007*exp(-abs(x)*.65);
  color+=mix(hot,cool,.24)*wire*(.30+.32*u_roles.y*u_particle.z)*fade;
  float shoulder=exp(-abs(abs(x)-2.35)*42.);
  color+=mix(hot,cool,.45)*shoulder*(1.5+1.1*u_roles.x*u_movement)*fade;
  color+=hot*exp(-abs(abs(x)-2.35)*4.)*.10*fade;
  float dashed=aa(abs(x),.030)*step(.63,fract(z/4.));
  color+=gold*dashed*.65*fade;
  // Discrete arcade markers, broken pixels and outward-facing road chevrons.
  vec2 tile=vec2(abs(x)*5.,z*1.5);vec2 tp=fract(tile);float bit=step(.28,tp.x)*step(tp.x,.73)*step(.2,tp.y)*step(tp.y,.58);
  float shoulderBits=step(1.92,abs(x))*step(abs(x),2.23)*step(.48,hash(floor(z*1.5)));
  color+=cool*bit*shoulderBits*(.13+.40*u_roles.y)*fade;
  float chevron=aa(abs(abs(x)-(.45+abs(fract(z/12.)-.5)*.65)),.045)*step(.82,fract(z/12.))*road;
  color+=hot*chevron*(.20+.28*u_roles.y)*fade;
  // Broken sunset reflection across the asphalt, not a flat opaque glow.
  float reflection=exp(-x*x/(.16+depth*.014))*exp(-depth*.015)*road;
  float reflectionBits=.45+.55*hash(floor(z*2.)+floor(x*14.)*19.);
  color+=mix(hot,gold,smoothstep(4.,70.,depth))*reflection*(.09+.06*reflectionBits)*(.65+.35*u_roles.z);
  color+=hot*.08*exp(-abs(y)*40.);
 }
 color+=mix(hot,cool,.3)*exp(-abs(y)*130.)*.32;
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
 float height=shoulder*(base+(voice+echo)*exp(-age*.26)*(2.1+u_roles.x*u_movement*3.8));
 // A curved bowl opens the view: foreground crests are foreshortened and
 // fanned outward, while distant echoes remain tall enough to be read.
 float near=1.-smoothstep(2.,36.,z);
 return height*(1.-near*.67)/(1.+height*near*.17)+across*across*smoothstep(8.,55.,z)*.8;
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
 float height=terrain(x,z);x+=sign(x)*height*.65*(1.-smoothstep(4.,30.,z));
 v_position=vec3(x,height,z);v_grid=vec2(across*48.,row-floor(travel/.75));v_signal=band(across);
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
 color+=tint*(wire*(.36+lamp(across)*.85+u_roles.y*u_particle.z*.11)+facet*.065)*fade;
 vec2 pixel=fract(v_grid*vec2(4.,3.));float blocks=step(.22,pixel.x)*step(pixel.x,.70)*step(.25,pixel.y)*step(pixel.y,.65);
 float selected=step(.86,hash(floor(v_grid.x*4.)+floor(v_grid.y*3.)*77.));
 color+=mix(tint,amber(),.22)*blocks*selected*(.025+pow(v_signal,2.)*.19)*fade;
 color=mix(color,pink()*.015+cyan()*.004,smoothstep(48.,96.,v_position.z));
 fragColor=vec4(color,1.);
}`;

export const AFTERGLOW_PALM_VERTEX=`#version 300 es
precision highp float;
${DRIVE}
${PROJECT}
out vec2 v_uv;flat out float v_id,v_depth;
void main(){
 int corner=gl_VertexID%6;float id=float(gl_VertexID/6),side=mod(id,2.)*2.-1.,rank=19.-floor(id/2.);
 vec2 o=corner==0?vec2(0,0):corner==1?vec2(1,0):corner==2?vec2(0,1):corner==3?vec2(0,1):corner==4?vec2(1,0):vec2(1,1);
 float travel=speedClock()/8.,slot=mod(rank+floor(travel),20.);
 float depth=1.+(rank+1.-fract(travel))*8.+hash(slot+8.)*1.5,height=3.3+hash(slot+51.)*1.7;
 vec3 p=vec3(side*(3.2+hash(slot+19.)*.4)+(o.x-.5)*height*1.3,(o.y)*height,depth);
 v_uv=o;v_id=slot*2.+mod(id,2.);v_depth=depth;driveProject(p);
}`;
export const AFTERGLOW_PALM_FRAGMENT=`#version 300 es
precision highp float;
${DRIVE}
uniform sampler2D u_palmAtlas;
in vec2 v_uv;flat in float v_id,v_depth;out vec4 fragColor;
void main(){
 vec2 p=v_uv;p.x+=sin(u_world.x*.24+v_id*.75)*.012*pow(p.y,2.);
 float variant=mod(v_id,4.);vec2 uv=vec2((clamp(p.x,.002,.998)+variant)*.25,1.-p.y);
 vec2 dx=dFdx(uv),dy=dFdy(uv),texel=1./vec2(textureSize(u_palmAtlas,0));
 float shape=textureGrad(u_palmAtlas,uv,dx,dy).a;
 float inner=textureGrad(u_palmAtlas,uv+texel*vec2(-1.5,0.),dx,dy).a*textureGrad(u_palmAtlas,uv+texel*vec2(0.,1.5),dx,dy).a;
 float rim=clamp(shape-inner,0.,1.);
 float rib=p.y*82.+p.x*8.,rings=.82+.18*sin(rib*6.2831853)*(1.-smoothstep(.3,1.,fwidth(rib)));
 vec3 gradient=mix(pink()*.045,cyan()*.075,smoothstep(.1,.9,p.y));
 gradient+=amber()*.020*(1.-abs(p.x-.5)*2.)*p.y;
 vec3 color=gradient*rings*(.7+.35*u_roles.z)+mix(cyan(),pink(),mod(v_id,2.))*rim*(.22+.20*lamp(fract(v_id*.13)));
 color*=exp(-v_depth*.007);float fade=smoothstep(1.,4.,v_depth)*(1.-smoothstep(135.,165.,v_depth));
 // Transparent coverage remains continuous, including subpixel leaflets.
 fragColor=vec4(color,shape*fade);
}`;

export const AFTERGLOW_DUST_VERTEX=`#version 300 es
precision highp float;
${DRIVE}
${PROJECT}
uniform float u_pixel,u_density,u_tail;
in vec4 a_seed;out vec3 v_color,v_motePosition;out vec2 v_moteUV;out float v_alpha,v_kind;
void main(){
 float clock=u_world.x,travel=speedClock()-u_tail*.40;
 float depth=1.5+fract(a_seed.z-travel*.003)*80.;
 vec3 p=vec3((a_seed.x-.5)*24.,.25+a_seed.y*6.,depth);
 p.x+=sin(clock*.22+a_seed.y*30.)*.4;p.y+=sin(clock*.17+a_seed.w*19.)*.09;
 int corner=gl_VertexID%6;vec2 q=corner==0?vec2(-1,-1):corner==1?vec2(1,-1):corner==2?vec2(-1,1):corner==3?vec2(-1,1):corner==4?vec2(1,-1):vec2(1,1);
 float size=(.014+a_seed.w*.010)*u_particle.y/(1.+u_tail*.16);
 p+=vec3(q.x*size,0.,q.y*size*2.);v_motePosition=p;v_moteUV=q;driveProject(p);
 float fade=smoothstep(1.5,8.,depth)*(1.-smoothstep(55.,82.,depth));
 float sound=lamp(a_seed.y);v_alpha=(.07+.23*u_roles.w+.45*sound+.12*u_roles.y)*fade*u_density*exp(-u_tail*.65);
 v_color=mix(pink(),cyan(),a_seed.w)*(1.5+sound*1.4);v_kind=u_tail>0.?0.:step(.78,a_seed.w);
}`;
export const AFTERGLOW_DUST_FRAGMENT=`#version 300 es
precision mediump float;
in vec3 v_color;in vec2 v_moteUV;in float v_alpha,v_kind;out vec4 fragColor;
void main(){vec2 p=abs(v_moteUV);float edge=v_kind>.5?min(p.x,p.y)-.28:max(p.x,p.y)-.76;float shape=1.-smoothstep(-fwidth(edge),fwidth(edge),edge);fragColor=vec4(v_color*v_alpha*shape,0.);}
`;
