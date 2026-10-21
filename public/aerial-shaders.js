// Analytic sphere surfaces keep round silhouettes at every quality level.
// Lighting is a procedural studio; no remote textures or environment downloads.
const STUDIO=`
uniform vec4 u_spheres[24];uniform float u_sphereCount;
uniform vec4 u_camera,u_roles,u_light;uniform vec2 u_resolution;
uniform vec3 u_colorA,u_colorB,u_colorC;uniform float u_focalLength,u_particleStyle,u_intensity,u_spectrumLight[48];
mat2 turn(float a){return mat2(cos(a),-sin(a),sin(a),cos(a));}
vec3 view(vec3 p){p.xz=turn(u_camera.x)*p.xz;p.yz=turn(u_camera.y)*p.yz;p.xy=turn(u_camera.w)*p.xy;return p;}
vec3 eye(){return vec3(0.,.5,6.+u_camera.z*.35);}
float lens(){return 2.45*u_focalLength/1.9;}
vec3 ray(vec2 uv){return normalize(vec3((uv*2.-1.)*vec2(u_resolution.x/u_resolution.y,1.)+vec2(0.,-.08),-lens()));}
vec4 sphere(int i){return vec4(view(u_spheres[i].xyz),u_spheres[i].w);}
vec3 pigment(float id){if(u_particleStyle<.5)return vec3(.8);if(u_particleStyle>1.5&&u_particleStyle<2.5)return .5+.5*cos(6.2831853*(mod(id*5.,48.)/48.+vec3(0.,.67,.33)));vec3 tint=mix(u_colorA,u_colorB,.5+.5*sin(id*1.7));tint=mix(tint,u_colorC,.2+.15*sin(id*2.9));return clamp(tint,0.,1.);}
vec3 paper(){return mix(vec3(.66,.60,.51),mix(vec3(.68),pigment(0.),.24),.22);}
vec3 environment(vec3 r,float rough){
 vec3 c=mix(vec3(.19,.15,.12),vec3(.88,.86,.81),smoothstep(-.4,.9,r.y));
 float window=pow(max(0.,dot(r,normalize(vec3(-.65,1.,1.6)))),mix(70.,6.,rough));
 float strip=pow(max(0.,dot(r,normalize(vec3(1.,.3,1.)))),mix(100.,12.,rough));
 return c+vec3(1.1,1.04,.94)*window+vec3(.38,.44,.5)*strip;
}
float visibility(vec3 p,vec3 light,int skip){
 float shadow=1.;vec3 l=normalize(light-p);
 for(int i=0;i<24;i++){
  if(float(i)>=u_sphereCount)break;if(i==skip)continue;
  vec4 s=sphere(i);vec3 delta=s.xyz-p;float t=dot(delta,l);if(t<=.02)continue;
  float distance=length(delta-l*t),penumbra=.14+t*.19;
  shadow*=mix(.27,1.,smoothstep(s.w-penumbra,s.w+penumbra,distance));
 }
 return shadow;
}
vec3 floorColor(vec3 p){
 float shade=visibility(p,vec3(3.,6.,5.),-1);
 float contact=1.;vec3 normal=view(vec3(0.,1.,0.));
 for(int i=0;i<24;i++){
  if(float(i)>=u_sphereCount)break;vec4 s=sphere(i);vec3 delta=p-s.xyz;
  float height=max(.04,dot(s.xyz-view(vec3(0.,-1.8,0.)),normal)-s.w);
  float planar=length(delta-normal*dot(delta,normal));
  contact*=1.-.24*exp(-planar*planar/(s.w*s.w*.75+height*.38))*(s.w/(height+s.w));
 }
 return paper()*(.66+.34*shade)*contact;
}
`;
export const AERIAL_BACKGROUND=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
${STUDIO}
void main(){
 vec3 ro=eye(),rd=ray(v_uv),n=view(vec3(0.,1.,0.));float denom=dot(rd,n);
 float t=dot(view(vec3(0.,-1.8,0.))-ro,n)/denom;
 vec3 color=paper()*(.97+.06*v_uv.y);
 if(t>0.&&abs(denom)>.001){vec3 p=ro+rd*t;color=mix(color,floorColor(p),exp(-max(0.,t-6.)*.07));}
 // Very broad reflected color keeps the studio coherent with the song palette.
 color+=pigment(0.)*.014*u_roles.z+vec3(.012)*u_roles.x;
 fragColor=vec4(color,1.);
}`;
export const AERIAL_VERTEX=`#version 300 es
precision highp float;flat out int v_id;
${STUDIO}
void main(){
 int id=gl_VertexID/6,corner=gl_VertexID%6;v_id=id;
 vec2 q=corner==0?vec2(-1.,-1.):corner==1?vec2(1.,-1.):corner==2?vec2(-1.,1.):corner==3?vec2(-1.,1.):corner==4?vec2(1.,-1.):vec2(1.,1.);
 vec4 s=sphere(id);vec3 c=s.xyz-eye();float depth=-c.z;
 float bound=s.w*lens()/max(.2,depth-s.w)*(1.+length(c.xy)/max(.2,depth));
 vec2 xy=c.xy*lens()/max(.2,depth)+q*bound;xy.y+=.08;xy.x/=u_resolution.x/u_resolution.y;
 gl_Position=vec4(xy,0.,1.);
}`;
export const AERIAL_FRAGMENT=`#version 300 es
precision highp float;flat in int v_id;out vec4 fragColor;
${STUDIO}
void main(){
 vec3 ro=eye(),rd=ray(gl_FragCoord.xy/u_resolution);vec4 s=sphere(v_id);vec3 oc=ro-s.xyz;
 float b=dot(oc,rd),h=b*b-dot(oc,oc)+s.w*s.w;if(h<=0.)discard;
 float t=-b-sqrt(h);if(t<=.1)discard;
 vec3 p=ro+rd*t,n=normalize(p-s.xyz),v=-rd,l=normalize(vec3(3.,6.,5.)-p),halfway=normalize(l+v);
 float depth=ro.z-p.z;gl_FragDepth=(1.002002-.2002002/depth)*.5+.5;
 float id=float(v_id),kind=mod(id,7.),pearl=step(3.5,kind)*step(kind,4.5),metal=step(4.5,kind)*step(kind,5.5),glass=step(5.5,kind);
 vec3 tint=pigment(id),base=mix(vec3(.84,.81,.75),mix(vec3(.67),tint,.62),v_id==0?.035:.24+.2*step(1.5,kind));
 float diffuse=pow(max(0.,(dot(n,l)+.45)/1.45),1.4),shade=visibility(p+n*.01,vec3(3.,6.,5.),v_id);
 float ambient=.13+.10*(n.y*.5+.5),fresnel=pow(1.-max(0.,dot(n,v)),4.);
 vec3 color=base*(ambient+diffuse*.95*shade);
 float rough=mix(.7,.1,max(metal,glass)),spec=pow(max(0.,dot(n,halfway)),mix(16.,120.,1.-rough));
 color+=vec3(1.,.98,.94)*spec*mix(.11,.8,max(metal,glass))*shade;
 vec3 reflection=environment(reflect(rd,n),rough);
 color=mix(color,reflection*mix(vec3(.75,.65,.48),tint,.2),metal*.68);
 vec3 opal=.5+.5*cos(vec3(0.,2.1,4.2)+dot(n,v)*9.+id+u_roles.z*.8);
 color+=pearl*opal*(.035+fresnel*.16);
 // Frosted, optically thick glass: tinted transmission and a strong Fresnel rim.
 vec3 transmission=mix(paper(),environment(refract(rd,n,.75),.65),.35)*mix(vec3(.92),tint,.18);
 color=mix(color,mix(transmission*.85,reflection,.12+fresnel*.7),glass*.9);
 float band=u_spectrumLight[int(mod(id*5.,48.))];
 color+=mix(vec3(.9),tint,.3)*(band*.13+u_roles.z*.035*(.25+spec)+u_roles.y*.035*spec);
 color+=base*u_roles.x*.025*diffuse;
 color*=.96+.04*clamp(u_intensity,0.,3.);
 fragColor=vec4(max(color,vec3(0.)),smoothstep(0.,max(.00001,fwidth(h)*1.2),h));
}`;
