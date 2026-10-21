// Shared positions keep every filament attached as the entire web breathes.
const WEB=`
uniform sampler2D u_nodes,u_edges;
uniform vec2 u_resolution;
uniform vec4 u_world,u_camera,u_roles,u_particle,u_light,u_signals[8];
uniform vec3 u_palette[6];
uniform float u_focalLength,u_movement,u_pixel,u_signalTime,u_spectrumLight[48],u_shimmer;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(float n){return fract(sin(n*127.1)*43758.5453);}
vec3 cool(){return mix(vec3(.035,.36,.55),u_palette[1],.13);}
vec3 warm(){return mix(vec3(1.,.32,.10),u_palette[4],.12);}
float frequency(float t){float x=clamp(t,0.,1.)*47.;int i=int(x);return mix(u_spectrumLight[i],u_spectrumLight[min(47,i+1)],fract(x));}
vec3 junction(int id){
 vec3 p=texelFetch(u_nodes,ivec2(id,0),0).xyz;float t=u_world.z;
 float bass=u_roles.x*u_movement,lead=u_roles.z*u_movement;
 p.y+=sin(p.x*1.5+p.z*.6-t*.85)*(.09+bass*.22)+sin(p.z*2.4+p.x*.7+t*.5)*lead*.12;
 p.z+=sin(p.x*.82-p.y*.9+t*.55)*(.10+bass*.24);
 p.x+=sin(p.y*1.7+p.z-t*.4)*(.035+lead*.10);
 p.xy=rot(sin(t*.12)*.045)*p.xy;
 return p*clamp(u_particle.x,.65,1.5);
}
vec4 projectWeb(vec3 p){
 p.xz=rot(u_camera.x)*p.xz;p.yz=rot(u_camera.y)*p.yz;p.xy=rot(u_camera.w)*p.xy;
 float d=5.4+u_camera.z-p.z;return vec4(p.x*u_focalLength/(u_resolution.x/u_resolution.y),p.y*u_focalLength,d*1.002002-.2002002,d);
}
float impulse(vec4 distance){
 float light=0.;for(int i=0;i<8;i++){
  vec4 event=u_signals[i];float age=u_signalTime-event.x;
  float travel=distance[int(event.z)]-age*2.8;
  light+=event.y*exp(-travel*travel*12.)*exp(-max(0.,age)*.42)*step(0.,age);
 }return min(1.5,light)*clamp(u_light.z*5.,0.,2.);
}
`;
export const SYNAPSE_THREAD_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_segments,u_threadLayer;
out vec3 v_color;out float v_alpha,v_edge;
void main(){
 int c=gl_VertexID%6,cell=gl_VertexID/6,segments=int(u_segments),id=cell/segments;
 if(u_threadLayer>.5)id*=3;
 vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
 float t=(float(cell%segments)+float(c==1||c==4||c==5))/u_segments,side=c==0||c==1||c==4?-1.:1.;
 vec3 pa=junction(a),pb=junction(b),p=mix(pa,pb,t);
 p.y+=sin(t*3.14159)*sin(edge.w*21.+u_world.z*.7)*min(.07,edge.z*.12)*u_roles.z*u_movement;
 p+=sin(t*3.14159)*vec3(sin(edge.w*71.),cos(edge.w*45.),sin(edge.w*35.))*min(.09,edge.z*.2)*u_threadLayer;
 vec4 clip=projectWeb(p),ca=projectWeb(pa),cb=projectWeb(pb);
 vec2 tangent=(cb.xy/cb.w-ca.xy/ca.w)*u_resolution,normal=normalize(vec2(-tangent.y,tangent.x)+vec2(.00001));
 float blur=smoothstep(.25,2.4,abs(clip.w-5.25));
 float width=(.55+blur*2.8)*max(.7,u_pixel);
 clip.xy+=normal*side*width*2./u_resolution*clip.w;gl_Position=clip;v_edge=side;
 vec4 da=texelFetch(u_nodes,ivec2(a,1),0),db=texelFetch(u_nodes,ivec2(b,1),0);
 // Min of the two arriving fronts prevents a shortcut across a graph cycle.
 float pulse=impulse(min(da+edge.z*t,db+edge.z*(1.-t)));
 float lit=frequency(fract(edge.w*3.7));
 v_color=mix(cool(),warm(),clamp(pulse*.85+step(.965,edge.w)*.45,0.,1.));
 v_alpha=(.085+lit*.17+pulse*.85+u_roles.w*.025)*(1.-blur*.74);
 v_alpha*=mix(.42,1.,smoothstep(3.4,5.,clip.w))*(1.-smoothstep(.9,3.,edge.z)*.80);
 v_alpha*=1.-u_threadLayer*.65;
}`;
export const SYNAPSE_THREAD_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_alpha,v_edge;out vec4 fragColor;
void main(){float a=exp(-v_edge*v_edge*3.4)*v_alpha;fragColor=vec4(v_color*a,0.);}`;

export const SYNAPSE_NODE_VERTEX=`#version 300 es
precision highp float;
${WEB}
uniform float u_nodeLayer;
out vec3 v_color;out float v_power,v_blur,v_hero;
void main(){
 int id=gl_VertexID;vec4 data;vec3 p;vec4 distance;float fade=1.;
 if(u_nodeLayer>.5){
  vec4 edge=texelFetch(u_edges,ivec2(id%1024,id/1024),0);int a=int(edge.x),b=int(edge.y);
  float t=fract(edge.w+u_world.z*.09);p=mix(junction(a),junction(b),t);
  data=vec4(p,edge.w*.8);distance=min(texelFetch(u_nodes,ivec2(a,1),0)+edge.z*t,texelFetch(u_nodes,ivec2(b,1),0)+edge.z*(1.-t));
  fade=sin(t*3.14159)*.26;
 }else{data=texelFetch(u_nodes,ivec2(id,0),0);p=junction(id);distance=texelFetch(u_nodes,ivec2(id,1),0);}
 gl_Position=projectWeb(p);
 float pulse=impulse(distance),f=frequency(data.w);
 v_blur=smoothstep(.22,2.2,abs(gl_Position.w-5.25));v_hero=step(.86,data.w);
 gl_PointSize=clamp((3.+v_hero*8.+pulse*9.+v_blur*30.)*u_pixel*clamp(u_particle.y,.6,1.8),2.,65.);
 v_color=mix(cool()*1.3,warm(),clamp(v_hero*.8+pulse,0.,1.));
 v_power=(.10+v_hero*.55+f*.50+pulse*2.3+u_shimmer*.1)*(1.-v_blur*.76);
 // Percussion lifts existing hot junctions; only detected attacks launch waves.
 v_power*=(1.+u_roles.y*.35*v_hero*clamp(u_light.z*5.,0.,2.))*fade;
}`;
export const SYNAPSE_NODE_FRAGMENT=`#version 300 es
precision highp float;
in vec3 v_color;in float v_power,v_blur,v_hero;out vec4 fragColor;
void main(){vec2 p=gl_PointCoord*2.-1.;float r=dot(p,p);if(r>1.)discard;
 float core=exp(-r*mix(72.,6.,v_blur)),halo=exp(-r*5.)*.11;
 vec3 color=v_color*(core+halo)*v_power+vec3(1.,.77,.46)*core*v_power*.3*(1.-v_blur);
 fragColor=vec4(color,0.);
}`;

export const SYNAPSE_BACKGROUND=`#version 300 es
precision highp float;
in vec2 v_uv;out vec4 fragColor;
uniform vec4 u_roles;uniform vec3 u_palette[6];
void main(){vec2 p=v_uv-.5;float haze=exp(-dot(p-vec2(-.35,.20),p-vec2(-.35,.20))*4.);
 vec3 blue=mix(vec3(.003,.023,.033),u_palette[1]*.045,.12);
 fragColor=vec4(blue*(.22+haze*.6+u_roles.x*.12),1.);
}`;
