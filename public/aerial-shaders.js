// A dark material study: refractive glass, veined stone, polished metals and
// luminous droplets. All surfaces and light cards are procedural and local.
const STUDIO=`
uniform vec4 u_spheres[24];uniform float u_sphereCount,u_fluidPass;
uniform vec4 u_camera,u_roles,u_light,u_studio,u_particle;uniform vec2 u_resolution;
uniform vec4 u_bursts[12],u_aerialBands[24],u_aerialTone;uniform float u_burstPower[12],u_beadCount,u_beadDensity,u_currentSegments,u_currentGlobal;
uniform float u_currentPhase[24],u_contacts[24];
uniform vec2 u_aerial;uniform vec3 u_colorA,u_colorB,u_colorC,u_palette[6];uniform float u_focalLength,u_particleStyle,u_intensity,u_spectrumLight[48],u_spectrum[48],u_energy;
mat2 turn(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}
float tilt(){return clamp(u_camera.y,-.46,1.25)+.25;}
vec3 view(vec3 p){p.xz=turn(u_camera.x)*p.xz;p.yz=turn(tilt())*p.yz;return p;}
vec3 unview(vec3 p){p.yz=turn(-tilt())*p.yz;p.xz=turn(-u_camera.x)*p.xz;return p;}
vec3 camera(){return vec3(0.,0.,7.2+u_camera.z*.19);}
vec3 eye(){return unview(camera());}
float lens(){return 2.3*u_focalLength/1.9*min(1.,u_resolution.x/u_resolution.y*1.32);}
vec3 ray(vec2 uv){return unview(normalize(vec3((uv*2.-1.)*vec2(u_resolution.x/u_resolution.y,1.)+vec2(0.,-.025),-lens())));}
float hash(float p){return fract(sin(p*127.13+31.7)*43758.5453);}
float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);float n=dot(i,vec3(1.,57.,113.));return mix(mix(mix(hash(n),hash(n+1.),f.x),mix(hash(n+57.),hash(n+58.),f.x),f.y),mix(mix(hash(n+113.),hash(n+114.),f.x),mix(hash(n+170.),hash(n+171.),f.x),f.y),f.z);}
vec4 detail(float id){return u_aerialBands[int(mod(id,24.))];}
vec3 hsv(vec3 c){vec4 K=vec4(0.,-1./3.,2./3.,-1.),p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)),q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r));float d=q.x-min(q.w,q.y);return vec3(abs(q.z+(q.w-q.y)/(6.*d+.000001)),d/(q.x+.000001),q.x);}
vec3 rgb(vec3 h){return h.z*mix(vec3(1.),clamp(abs(fract(h.x+vec3(0.,2./3.,1./3.))*6.-3.)-1.,0.,1.),h.y);}
vec3 pigment(float id){
 if(u_particleStyle<.5)return vec3(.75);if(u_particleStyle>1.5&&u_particleStyle<2.5)return .5+.5*cos(6.2831853*(mod(id*5.,48.)/48.+vec3(0.,.67,.33)));
 vec4 d=detail(id);int i=int(mod(floor(id*1.71),6.));vec3 c=mix(u_palette[i],u_palette[(i+2)%6],clamp(d.y*.55+d.z*.32,0.,.9));vec3 h=hsv(max(c,vec3(.002)));
 // Colour follows spectral balance and each body's notes, with a continuous
 // hue path. There is no timed rainbow cycle or discrete palette switch.
 h.x+=(u_aerialTone.x-.45)*.75+(d.x-d.y)*.14+u_aerialTone.z*.06;
 h.y=clamp(h.y*1.45+.08,.12,1.);h.z=.72+u_aerialTone.w*.28;return rgb(h);
}
vec3 paper(){return mix(vec3(.016,.018,.022),vec3(.0015,.002,.003),u_aerial.y);}
float band(float id){return detail(id).x;}
float contact(float id){return u_contacts[int(id<24.?id:mod(id-24.,u_sphereCount))];}
vec3 shape(int id){if(id>=24)return vec3(1.);float i=float(id),t=u_studio.x;vec4 d=detail(i);vec3 q=sin(vec3(i*1.7,i*2.3+2.,i*.7+4.)+t*vec3(1.3,1.1,.9)+d.y*1.8);vec3 axes=vec3(1.)+q*(.018+d.x*.23+d.z*.08)+vec3(-.04,.08,-.04)*u_roles.x+vec3(.035,-.075,.035)*contact(i);axes.y=min(axes.y,max(.1,(u_spheres[id].y+1.8)/u_spheres[id].w));return axes;}
float envelope(float age,float life){return smoothstep(0.,.42,age)*(1.-smoothstep(life-1.,life,age));}
float beadFade(int id){
 if(id<24)return 1.;float i=float(id-24);
 if(i>=u_beadCount){int b=int((i-u_beadCount)/8.);return u_bursts[b].w<0.?0.:envelope(u_bursts[b].w,4.5);}
 float life=7.+hash(i+4.)*8.,age=mod(u_studio.x+hash(i+33.)*life,life);
 return envelope(age,life)*(1.-smoothstep(u_beadDensity-.08,u_beadDensity+.08,i/u_beadCount));
}
vec4 sphere(int id){
 if(id<24)return u_spheres[id];
 float i=float(id-24),a=hash(i),b=hash(i+43.),c=hash(i+91.),fade=beadFade(id),t=u_studio.x;vec3 p;
 if(i>=u_beadCount){int event=int((i-u_beadCount)/8.);float age=max(0.,u_bursts[event].w),power=u_burstPower[event],angle=a*6.283;
  p=u_bursts[event].xyz+vec3(cos(angle),.8+b,sin(angle))*(.08+age*(.18+power*.6))+vec3(sin(age*1.7+a*9.)*age*.08,age*age*.035,cos(age*1.3+b*9.)*age*.08);
 }else{
  int parent=int(mod(i,u_sphereCount));vec4 s=u_spheres[parent];float phase=a*6.283+t*(.18+b*.32),polar=b*6.283+t*.12;
  float radius=s.w+.12+c*c*(1.+u_roles.x*.4)+u_studio.y*.12*u_particle.z;
  p=s.xyz+vec3(cos(phase)*sin(polar),cos(polar),sin(phase)*sin(polar))*radius;
 }
 p.y=-1.73+abs(p.y+1.73);
 return vec4(p,max(.00001,(.009+pow(hash(i+12.),3.)*.043)*u_particle.y*sqrt(fade)));
}
vec3 environment(vec3 r,float rough){
 vec3 c=mix(paper()*2.,vec3(.045,.05,.065),smoothstep(-.2,.65,r.y));
 // Rectangular key and tall rim cards give glass/chrome a readable contour.
 vec3 key=normalize(vec3(-2.8,4.4,3.2));float a=dot(r,key),sx=dot(r,normalize(vec3(3.2,0.,2.8))),sy=dot(r,normalize(cross(key,normalize(vec3(3.2,0.,2.8)))));
 float box=(1.-smoothstep(.48-rough*.20,.51+rough*.25,abs(sx)))*(1.-smoothstep(.29-rough*.18,.32+rough*.2,abs(sy)))*step(.5,a);
 vec3 rim=normalize(vec3(3.,1.3,-1.8));float strip=pow(max(0.,dot(r,rim)),mix(150.,8.,rough));
 return c+mix(vec3(1.8,1.74,1.63),pigment(1.)*2.5,.82)*box*(1.+u_roles.z*1.4)+pigment(6.)*strip*(1.3+u_roles.x*3.+u_studio.y*1.5);
}
float intersect(vec3 ro,vec3 rd,vec4 s){vec3 oc=ro-s.xyz;float b=dot(oc,rd),h=b*b-dot(oc,oc)+s.w*s.w;return h>0.?-b-sqrt(h):-1.;}
float visibility(vec3 p,int skip){
 vec3 l=normalize(vec3(-3.,6.,4.)-p);float shade=1.;
 for(int i=0;i<24;i++){if(float(i)>=u_sphereCount)break;if(i==skip)continue;vec4 s=u_spheres[i];vec3 d=s.xyz-p;float t=dot(d,l);if(t<.015)continue;float pen=.06+t*.24;shade*=mix(.32,1.,smoothstep(s.w-pen,s.w+pen,length(d-l*t)));}return shade;
}
vec3 baseColor(int id){float k=mod(float(id-4),8.);return id<4?pigment(float(id))*.25:k<.5||k>3.5&&k<4.5?vec3(.67,.71,.74):k<1.5?vec3(.83,.48,.12):pigment(float(id))*.36;}
vec3 simpleSurface(vec3 p,vec3 n,vec3 rd,int id){
 float diffuse=max(0.,dot(n,normalize(vec3(-3.,6.,4.)-p))),f=pow(1.-max(0.,dot(n,-rd)),5.);
 vec3 b=baseColor(id);return b*(.16+diffuse*.8)+environment(reflect(rd,n),.12)*(.12+f*.45);
}
vec3 transmitted(vec3 ro,vec3 rd,int skip){
 float near=100.;int found=-1;
 for(int i=0;i<24;i++){if(float(i)>=u_sphereCount)break;if(i==skip)continue;float t=intersect(ro,rd,u_spheres[i]);if(t>.02&&t<near){near=t;found=i;}}
 if(found>=0){vec3 p=ro+rd*near;return simpleSurface(p,normalize(p-u_spheres[found].xyz),rd,found);}
 return mix(paper()*.85,environment(rd,.65),.25);
}
float pressure(vec3 p){float wave=0.;for(int i=0;i<12;i++){float age=u_bursts[i].w;if(age<0.)continue;float front=length(p-u_bursts[i].xyz)-age*1.9;wave+=exp(-front*front*32.)*u_burstPower[i]*envelope(age,4.5)*exp(-age*.8);}return wave;}
vec3 surface(vec3 p,vec3 n,vec3 rd,int id){
 float k=mod(float(id-4),8.),glass=id>=24?1.-step(.72,hash(float(id))):step(1.5,k)*step(k,2.5)+step(5.5,k)*step(k,6.5),gold=step(.5,k)*step(k,1.5),stone=id>=4?1.-step(.5,k):0.,emissive=id>=24?step(.72,hash(float(id))):id<4?0.:step(2.5,k)*step(k,3.5)+step(6.5,k),metal=id<4?1.:gold+step(4.5,k)*step(k,5.5);
 float t=u_studio.x,b=band(float(id));vec4 notes=detail(float(id));vec3 local=p-(id<24?u_spheres[id].xyz:sphere(id).xyz);
 float flow=sin(local.x*(7.+notes.y*4.)+sin(local.z*9.+t*.9)*1.2+t*.65)+sin(local.y*11.-local.z*5.-t*.65);
 float vein=0.;if(stone>.5)vein=pow(1.-abs(sin(local.x*14.+local.y*6.+noise(local*5.+vec3(t*.17))*9.+noise(local*12.)*2.+notes.y*3.)),9.);
 vec3 base=baseColor(id);base=mix(base,base*(pigment(float(id))*.78+.22),id<24?.38+notes.y*.32:.25);base=mix(base,mix(base,vec3(.04,.06,.08),vein*.9),stone);
 // Moving microstructure changes reflected light without needing a texture map.
 n=normalize(n+vec3(cos(local.z*21.+t),sin(local.x*19.-t*.7),cos(local.y*23.+flow))*(.012+stone*.04+b*.025));
 vec3 v=-rd,l=normalize(vec3(-3.,6.,4.)-p);float nv=max(.001,dot(n,v)),f=pow(1.-nv,5.),rough=mix(.42,.045,max(glass,metal));
 float diffuse=max(0.,dot(n,l)),shadow=id<24?visibility(p+n*.012,id):1.;
 vec3 refl=environment(reflect(rd,n),rough),color=base*(.13+.1*max(0.,n.y)+diffuse*.96*shadow);
 float spec=pow(max(0.,dot(n,normalize(l+v))),mix(18.,130.,1.-rough));color+=vec3(1.,.97,.92)*spec*.14*shadow;
 color=mix(color,refl*mix(pigment(float(id))*.9+.08,mix(vec3(1.,.69,.25),pigment(float(id)),.25+u_energy*.35),gold)+base*.10,metal*.92);
 if(glass>.5){vec3 refracted=refract(rd,n,.73);vec3 through=transmitted(p+refracted*.22,refracted,id);color=mix(through*mix(vec3(.9),pigment(float(id)),.38),refl,.07+f*.88);color+=pigment(float(id))*pow(f,.5)*(.15+b*.55)+vec3(.18)*spec;}
 color+=(id<4?1.:0.)*(.5+.5*cos(vec3(0.,2.1,4.2)+nv*9.+flow*.6))*(.03+f*.22);
 vec3 tint=pigment(float(id));float reactive=b*2.5+notes.z*1.4+u_roles.x*.6+u_roles.z*.45+u_studio.y*.7*u_light.z;
 float filaments=pow(.5+.5*sin(flow*3.+local.y*35.-t*2.2+notes.y*5.),16.);
 float cells=pow(noise(local*42.+vec3(t*.3,-t*.4,t*.2)),8.),wave=pressure(p),impact=contact(float(id));
 float latitude=pow(.5+.5*cos(n.y*20.+flow*.7),10.);
 color+=tint*(f*f*(.10+reactive*.55)+stone*vein*(.03+b*.65)+filaments*(.025+notes.y*.18)+cells*notes.z*2.+wave*(.25+f*.9)+impact*(f*.7+latitude*.35+cells*.8));
 color=mix(color,tint*(.18+reactive*2.5)*(.48+.35*nv+filaments*.30)+vec3(spec)*.15,clamp(emissive,0.,1.));
 color+=base*u_roles.x*.18+refl*u_roles.y*.14;
 float grain=hash(floor(p.x*440.)+floor(p.y*440.)*17.+floor(p.z*440.)*31.);
 return max(vec3(0.),color*(.987+grain*.026)*(.96+.04*clamp(u_intensity,0.,3.)));
}
vec4 liquid(vec3 p){
 vec3 delta=p-u_spheres[0].xyz;float len=length(delta);vec4 field=vec4(delta/max(len,.00001),len-u_spheres[0].w);
 for(int i=1;i<4;i++){delta=p-u_spheres[i].xyz;len=length(delta);vec4 next=vec4(delta/max(len,.00001),len-u_spheres[i].w);float k=max(.012,u_aerial.x*.34),h=clamp(.5+.5*(next.w-field.w)/k,0.,1.);field=vec4(mix(next.xyz,field.xyz,h),mix(next.w,field.w,h)-k*h*(1.-h));}
 float amp=.004+u_roles.x*.024+band(0.)*.030,t=u_studio.x;vec3 q=p*vec3(9.,8.,7.)+vec3(t*1.4,-t*1.1,t*.9),s=sin(q),c=cos(q);
 field.w-=amp*s.x*s.y*s.z;field.xyz-=amp*vec3(9.*c.x*s.y*s.z,8.*s.x*c.y*s.z,7.*s.x*s.y*c.z);
 if(-1.79-p.y>field.w)return vec4(0.,-1.,0.,-1.79-p.y);return field;
}
vec3 floorColor(vec3 p,vec3 rd){
 float contact=1.;vec3 reflected=reflect(rd,vec3(0.,1.,0.));float nearest=100.;int found=-1;
 for(int i=0;i<24;i++){if(float(i)>=u_sphereCount)break;vec4 s=u_spheres[i];float height=max(.025,s.y+1.8-s.w),planar=length(p.xz-s.xz);contact*=1.-.55*exp(-planar*planar/(s.w*s.w*.67+height*.32))*s.w/(height+s.w);
 float t=intersect(p+vec3(0.,.008,0.),reflected,s);if(t>.01&&t<nearest){nearest=t;found=i;}}
 vec3 col=paper()*(.55+.4*visibility(p,-1))*contact;
 if(found>=0){vec3 q=p+reflected*nearest;vec3 reflectedColor=simpleSurface(q,normalize(q-u_spheres[found].xyz),reflected,found);vec3 oc=p-u_spheres[found].xyz;float b=dot(oc,reflected),h=b*b-dot(oc,oc)+u_spheres[found].w*u_spheres[found].w;float feather=smoothstep(0.,max(.002,u_spheres[found].w*u_spheres[found].w*.3),h);float strength=mix(.26,.32,u_aerial.y)*exp(-nearest*.16)*feather;col=mix(col,reflectedColor,strength);}
 col+=pigment(6.)*(.002+u_roles.x*.004)*exp(-length(p.xz)*.22);return col;
}
`;
export const AERIAL_BACKGROUND=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
${STUDIO}
void main(){vec3 ro=eye(),rd=ray(v_uv);float t=(-1.8-ro.y)/rd.y;vec3 col=paper()*(.94+.1*v_uv.y);if(t>0.&&rd.y<-.001){vec3 p=ro+rd*t;col=mix(col,floorColor(p,rd),exp(-max(0.,t-8.)*.035));}fragColor=vec4(col,1.);}`;
export const AERIAL_VERTEX=`#version 300 es
precision highp float;flat out int v_id;
${STUDIO}
void main(){
 int id=gl_VertexID/6,corner=gl_VertexID%6;v_id=id;
 vec2 q=corner==0?vec2(-1.,-1.):corner==1?vec2(1.,-1.):corner==2?vec2(-1.,1.):corner==3?vec2(-1.,1.):corner==4?vec2(1.,-1.):vec2(1.,1.);
 vec4 s=sphere(id);s.w*=1.46;
 if(u_fluidPass>.5){vec3 lo=vec3(100.),hi=vec3(-100.);for(int i=0;i<4;i++){lo=min(lo,u_spheres[i].xyz-u_spheres[i].w-.3);hi=max(hi,u_spheres[i].xyz+u_spheres[i].w+.3);}s=vec4((lo+hi)*.5,length(hi-lo)*.5);}
 vec3 c=view(s.xyz)-camera();float depth=-c.z,bound=s.w*lens()/max(.2,depth-s.w)*(1.+length(c.xy)/max(.2,depth));
 vec2 xy=c.xy*lens()/max(.2,depth)+q*bound;xy.y+=.025;xy.x/=u_resolution.x/u_resolution.y;gl_Position=vec4(xy,0.,1.);
}`;
export const AERIAL_FRAGMENT=`#version 300 es
precision highp float;flat in int v_id;out vec4 fragColor;
${STUDIO}
void main(){
 vec3 ro=eye(),rd=ray(gl_FragCoord.xy/u_resolution),p,n;float t,alpha=1.;
 if(u_fluidPass>.5){
  vec3 lo=vec3(100.),hi=vec3(-100.);for(int i=0;i<4;i++){lo=min(lo,u_spheres[i].xyz-u_spheres[i].w-.3);hi=max(hi,u_spheres[i].xyz+u_spheres[i].w+.3);}
  vec3 inv=1./(mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))*max(abs(rd),vec3(.000001))),a=(lo-ro)*inv,b=(hi-ro)*inv,enter=min(a,b),leave=max(a,b);t=max(.01,max(enter.x,max(enter.y,enter.z)));float far=min(leave.x,min(leave.y,leave.z));if(t>far)discard;
  // Frequency displacement changes the field's slope. Conservative steps avoid
  // skipping thin parts of the surface and making them flash out for one frame.
  vec4 f;bool hit=false;for(int i=0;i<88;i++){p=ro+rd*t;f=liquid(p);if(f.w<.0015){hit=true;break;}t+=max(.00065,f.w*.48);if(t>far)break;}if(!hit)discard;n=normalize(f.xyz);
 }else{if(v_id<4&&u_aerial.x>.03)discard;float fade=beadFade(v_id);if(fade<.002)discard;vec4 s=sphere(v_id);vec3 axes=shape(v_id),oc=(ro-s.xyz)/axes,dir=rd/axes;float a=dot(dir,dir),b=dot(oc,dir),h=b*b-a*(dot(oc,oc)-s.w*s.w);if(h<=0.)discard;t=(-b-sqrt(h))/a;if(t<=.01)discard;p=ro+rd*t;n=normalize((p-s.xyz)/(axes*axes));alpha=smoothstep(0.,max(.000001,fwidth(h)),h)*fade;}
 float depth=camera().z-view(p).z;gl_FragDepth=(1.002002-.2002002/depth)*.5+.5;
 fragColor=vec4(surface(p,n,rd,v_id),alpha);
}`;

// Thin, spatial currents thread around the sculpture; they are not a backdrop
// overlay and correctly pass behind the opaque bodies at every camera angle.
export const AERIAL_CURRENT_VERTEX=`#version 300 es
precision highp float;out vec2 v_current;flat out float v_stream;
${STUDIO}
// Only integrated, periodic phases drive travel; music never multiplies elapsed time.
vec3 current(float id,float x){
 if(id>=u_currentGlobal){float strand=id-u_currentGlobal,body=floor(strand/2.);int i=int(body);float phase=u_currentPhase[i];vec4 s=u_spheres[i],d=detail(body);float angle=x*6.283+phase+body*1.4,polar=.8+mod(strand,2.)*1.4+sin(angle*3.+phase+d.y*.5)*(.12+d.x*.14);vec3 n=vec3(cos(angle)*sin(polar),cos(polar),sin(angle)*sin(polar));return s.xyz+n*shape(i)*(s.w*1.018+.012);}
 float phase=u_currentPhase[int(id)],angle=x*5.2+id*1.71+phase,r=1.6+id*.20+sin(x*12.+phase*2.+id)*(.18+u_roles.x*.20);return vec3(cos(angle)*r,-.25+sin(x*9.4+id*1.3+phase*2.)*(.55+u_roles.z*.45),sin(angle)*r*.6);}
void main(){int corner=gl_VertexID%6,segment=gl_VertexID/6;float stream=floor(float(segment)/u_currentSegments),index=mod(float(segment),u_currentSegments);float end=corner==1||corner==4||corner==5?1.:0.,side=corner==0||corner==1||corner==4?-1.:1.;float x=(index+end)/u_currentSegments;vec3 p=current(stream,x),tangent=normalize(current(stream,x+.001)-p),across=normalize(cross(tangent,normalize(eye()-p)));vec3 c=view(p)-camera();float depth=max(.1,-c.z),width=max(.0018+u_roles.x*.0007+band(stream)*.0015,1.5*depth/(lens()*u_resolution.y));p+=across*side*width;c=view(p)-camera();vec2 xy=c.xy*lens()/depth;xy.y+=.025;xy.x/=u_resolution.x/u_resolution.y;gl_Position=vec4(xy,1.002002-.2002002/depth,1.);v_current=vec2(x,side);v_stream=stream;}`;
export const AERIAL_CURRENT_FRAGMENT=`#version 300 es
precision highp float;in vec2 v_current;flat in float v_stream;out vec4 fragColor;
${STUDIO}
void main(){float body=v_stream<u_currentGlobal?v_stream:floor((v_stream-u_currentGlobal)/2.);vec4 d=detail(body);float phase=u_currentPhase[int(body)],pulse=pow(.5+.5*sin(v_current.x*18.-phase*2.+v_stream),3.),fade=(1.-smoothstep(.35,1.,abs(v_current.y)))*smoothstep(0.,.10,v_current.x)*(1.-smoothstep(.90,1.,v_current.x));vec3 color=pigment(body+2.)*(.06+pulse*(.18+d.x*1.25+d.z*.25)+d.y*.14)*fade;fragColor=vec4(color,0.);}`;
