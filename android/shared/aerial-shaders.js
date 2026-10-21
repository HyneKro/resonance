// A procedural photographic studio: analytic solid/glass bodies, one bounded
// smooth-union liquid surface, and small beads. No downloaded environment maps.
const STUDIO=`
uniform vec4 u_spheres[24];uniform float u_sphereCount,u_fluidPass;
uniform vec4 u_camera,u_roles,u_light,u_studio,u_particle;uniform vec2 u_resolution;
uniform vec2 u_aerial;uniform vec3 u_colorA,u_colorB,u_colorC;uniform float u_focalLength,u_particleStyle,u_intensity,u_spectrumLight[48];
mat2 turn(float a){return mat2(cos(a),sin(a),-sin(a),cos(a));}
float tilt(){return clamp(u_camera.y,-.08,1.25)+.25;}
vec3 view(vec3 p){p.xz=turn(u_camera.x)*p.xz;p.yz=turn(tilt())*p.yz;return p;}
vec3 unview(vec3 p){p.yz=turn(-tilt())*p.yz;p.xz=turn(-u_camera.x)*p.xz;return p;}
vec3 camera(){return vec3(0.,0.,7.2+u_camera.z*.19);}
vec3 eye(){return unview(camera());}
float lens(){return 2.3*u_focalLength/1.9*min(1.,u_resolution.x/u_resolution.y*1.32);}
vec3 ray(vec2 uv){return unview(normalize(vec3((uv*2.-1.)*vec2(u_resolution.x/u_resolution.y,1.)+vec2(0.,-.025),-lens())));}
float hash(float p){return fract(sin(p*127.13+31.7)*43758.5453);}
vec3 pigment(float id){if(u_particleStyle<.5)return vec3(.75);if(u_particleStyle>1.5&&u_particleStyle<2.5)return .5+.5*cos(6.2831853*(mod(id*5.,48.)/48.+vec3(0.,.67,.33)));return clamp(mix(mix(u_colorA,u_colorB,step(.45,hash(id))),u_colorC,step(.74,hash(id+7.))),.025,1.);}
vec3 paper(){return mix(mix(vec3(.78,.76,.72),pigment(0.)*.38+vec3(.52),.28),vec3(.008,.012,.014)+pigment(0.)*.012,u_aerial.y);}
vec4 sphere(int id){
 if(id<24)return u_spheres[id];
 float i=float(id-24),a=hash(i),b=hash(i+43.),c=hash(i+91.);int parent=int(mod(i,u_sphereCount));vec4 s=u_spheres[parent];
 float t=u_studio.x*u_studio.z,phase=a*6.283+t*(.18+b*.32),polar=b*6.283+t*.12;
 float radius=s.w+.08+c*c*(.75+u_roles.x*.26*step(.01,u_studio.z))+u_studio.y*.22*u_particle.z*step(.01,u_studio.z);
 vec3 offset=vec3(cos(phase)*sin(polar),cos(polar),sin(phase)*sin(polar))*radius;
 vec3 p=s.xyz+offset;p.y=-1.76+abs(p.y+1.76);
 return vec4(p,(.006+pow(hash(i+12.),4.)*.033)*u_particle.y);
}
vec3 environment(vec3 r,float rough){
 vec3 c=mix(vec3(.065,.075,.085),mix(paper()*.94,vec3(.18,.2,.23),u_aerial.y),smoothstep(-.2,.65,r.y));
 // Rectangular key and tall rim cards give glass/chrome a readable contour.
 vec3 key=normalize(vec3(-2.8,4.4,3.2));float a=dot(r,key),sx=dot(r,normalize(vec3(3.2,0.,2.8))),sy=dot(r,normalize(cross(key,normalize(vec3(3.2,0.,2.8)))));
 float box=(1.-smoothstep(.48-rough*.20,.51+rough*.25,abs(sx)))*(1.-smoothstep(.29-rough*.18,.32+rough*.2,abs(sy)))*step(.5,a);
 vec3 rim=normalize(vec3(3.,1.3,-1.8));float strip=pow(max(0.,dot(r,rim)),mix(150.,8.,rough));
 return c+vec3(1.8,1.74,1.63)*box+vec3(.8,.91,1.)*strip;
}
float intersect(vec3 ro,vec3 rd,vec4 s){vec3 oc=ro-s.xyz;float b=dot(oc,rd),h=b*b-dot(oc,oc)+s.w*s.w;return h>0.?-b-sqrt(h):-1.;}
float visibility(vec3 p,int skip){
 vec3 l=normalize(vec3(-3.,6.,4.)-p);float shade=1.;
 for(int i=0;i<24;i++){if(float(i)>=u_sphereCount)break;if(i==skip)continue;vec4 s=u_spheres[i];vec3 d=s.xyz-p;float t=dot(d,l);if(t<.015)continue;float pen=.06+t*.24;shade*=mix(.32,1.,smoothstep(s.w-pen,s.w+pen,length(d-l*t)));}return shade;
}
vec3 baseColor(int id){float k=mod(float(id),7.);return k<1.5||id<4?mix(vec3(.035),pigment(float(id))*.55,.88):k<4.5?vec3(.81,.82,.79):mix(vec3(.09),pigment(float(id)),.28);}
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
vec3 surface(vec3 p,vec3 n,vec3 rd,int id){
 float k=mod(float(id),7.),glass=step(5.5,k),metal=id<4?1.:step(4.5,k)*step(k,5.5),pearl=step(3.5,k)*step(k,4.5);
 vec3 base=baseColor(id),v=-rd,l=normalize(vec3(-3.,6.,4.)-p);float nv=max(.001,dot(n,v)),f=pow(1.-nv,5.),rough=mix(.62,.06,max(glass,metal));
 float diffuse=max(0.,dot(n,l)),shadow=id<24?visibility(p+n*.012,id):1.;
 vec3 refl=environment(reflect(rd,n),rough),color=base*(.13+.1*max(0.,n.y)+diffuse*.96*shadow);
 float spec=pow(max(0.,dot(n,normalize(l+v))),mix(18.,130.,1.-rough));color+=vec3(1.,.97,.92)*spec*.14*shadow;
 color=mix(color,refl*mix(vec3(.62),pigment(float(id))*.7+.2,.65)+base*.14,metal*.86);
 if(glass>.5){vec3 refracted=refract(rd,n,.73);vec3 through=transmitted(p+refracted*.22,refracted,id);color=mix(through*mix(vec3(.9),pigment(float(id)),.11),refl,.09+f*.85);color+=vec3(.1)*spec;}
 color+=pearl*(.5+.5*cos(vec3(0.,2.1,4.2)+nv*9.))*(.025+f*.18);
 float band=u_spectrumLight[int(mod(float(id)*5.,48.))];
 color+=mix(vec3(.72),pigment(float(id)),.3)*(band*.16+u_roles.z*.045*(.2+f));
 color+=base*u_roles.x*.07+refl*u_roles.y*.035+spec*u_studio.y*u_light.z*.3;
 float grain=hash(floor(p.x*440.)+floor(p.y*440.)*17.+floor(p.z*440.)*31.);
 return max(vec3(0.),color*(.987+grain*.026)*(.96+.04*clamp(u_intensity,0.,3.)));
}
vec4 liquid(vec3 p){
 vec3 delta=p-u_spheres[0].xyz;float len=length(delta);vec4 field=vec4(delta/max(len,.00001),len-u_spheres[0].w);
 for(int i=1;i<4;i++){delta=p-u_spheres[i].xyz;len=length(delta);vec4 next=vec4(delta/max(len,.00001),len-u_spheres[i].w);float k=max(.012,u_aerial.x*.34),h=clamp(.5+.5*(next.w-field.w)/k,0.,1.);field=vec4(mix(next.xyz,field.xyz,h),mix(next.w,field.w,h)-k*h*(1.-h));}
 if(-1.79-p.y>field.w)return vec4(0.,-1.,0.,-1.79-p.y);return field;
}
vec3 floorColor(vec3 p,vec3 rd){
 float contact=1.;vec3 reflected=reflect(rd,vec3(0.,1.,0.));float nearest=100.;int found=-1;
 for(int i=0;i<24;i++){if(float(i)>=u_sphereCount)break;vec4 s=u_spheres[i];float height=max(.025,s.y+1.8-s.w),planar=length(p.xz-s.xz);contact*=1.-.55*exp(-planar*planar/(s.w*s.w*.67+height*.32))*s.w/(height+s.w);
 float t=intersect(p+vec3(0.,.008,0.),reflected,s);if(t>.01&&t<nearest){nearest=t;found=i;}}
 vec3 col=paper()*(.55+.4*visibility(p,-1))*contact;
 if(found>=0){vec3 q=p+reflected*nearest;vec3 reflectedColor=simpleSurface(q,normalize(q-u_spheres[found].xyz),reflected,found);vec3 oc=p-u_spheres[found].xyz;float b=dot(oc,reflected),h=b*b-dot(oc,oc)+u_spheres[found].w*u_spheres[found].w;float feather=smoothstep(0.,max(.002,u_spheres[found].w*u_spheres[found].w*.3),h);float strength=mix(.26,.32,u_aerial.y)*exp(-nearest*.16)*feather;col=mix(col,reflectedColor,strength);}
 col+=vec3(.02)*exp(-length(p.xz)*.22);return col;
}
`;
export const AERIAL_BACKGROUND=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
${STUDIO}
void main(){vec3 ro=eye(),rd=ray(v_uv);float t=(-1.8-ro.y)/rd.y;vec3 col=paper()*(.94+.1*v_uv.y);if(t>0.&&rd.y<-.001){vec3 p=ro+rd*t;col=mix(col,floorColor(p,rd),exp(-max(0.,t-8.)*.035));}col+=pigment(0.)*u_roles.z*.015;fragColor=vec4(col,1.);}`;
export const AERIAL_VERTEX=`#version 300 es
precision highp float;flat out int v_id;
${STUDIO}
void main(){
 int id=gl_VertexID/6,corner=gl_VertexID%6;v_id=id;
 vec2 q=corner==0?vec2(-1.,-1.):corner==1?vec2(1.,-1.):corner==2?vec2(-1.,1.):corner==3?vec2(-1.,1.):corner==4?vec2(1.,-1.):vec2(1.,1.);
 vec4 s=sphere(id);
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
  vec4 f;bool hit=false;for(int i=0;i<56;i++){p=ro+rd*t;f=liquid(p);if(f.w<.0015){hit=true;break;}t+=max(.001,f.w*.85);if(t>far)break;}if(!hit)discard;n=normalize(f.xyz);
 }else{if(v_id<4&&u_aerial.x>.03)discard;vec4 s=sphere(v_id);t=intersect(ro,rd,s);if(t<=.01)discard;p=ro+rd*t;n=normalize(p-s.xyz);vec3 oc=ro-s.xyz;float b=dot(oc,rd),h=b*b-dot(oc,oc)+s.w*s.w;alpha=smoothstep(0.,max(.00001,fwidth(h)),h);}
 float depth=camera().z-view(p).z;gl_FragDepth=(1.002002-.2002002/depth)*.5+.5;
 fragColor=vec4(surface(p,n,rd,v_id),alpha);
}`;
