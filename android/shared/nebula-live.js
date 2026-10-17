// Layered nebular volume: slow parallax, dust lanes, folded wisps and fine luminous ridges.
export const NEBULA_LIVE=`#version 300 es
precision highp float;in vec2 v_uv;out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time,u_driftTime,u_energy,u_intensity,u_drive;
uniform vec4 u_low,u_high,u_form;
uniform vec3 u_colorA,u_colorB,u_colorC,u_accents,u_transients,u_palette[6];
uniform vec3 u_liquid;uniform vec4 u_cloud,u_signature,u_character,u_roles,u_rhythm,u_light;
uniform vec4 u_recipeA,u_recipeB,u_camera;
uniform float u_focalLength;
uniform float u_themes[6],u_shimmer,u_movement;
mat2 rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=noise(p)*a;p=rot(.61)*p*2.03+7.13;a*=.5;}return v;}
vec3 pigment(float phase){float x=fract(phase)*6.;int i=int(floor(x));return mix(u_palette[i],u_palette[(i+1)%6],smoothstep(0.,1.,fract(x)));}
float contour(float x,float width){float d=abs(fract(x+.5)-.5);return 1.-smoothstep(width,width+max(fwidth(x),.001),d);}
void main(){
 vec2 uv=(v_uv-.5)*vec2(u_resolution.x/u_resolution.y,1.);
 uv=rot(u_camera.w*.3)*uv+vec2(sin(u_camera.x),sin(u_camera.y))*.09;
 uv/=1.+max(0.,-u_camera.z)*.06;
 uv*=mix(1.,1.9/u_focalLength,.25);
 float t=u_time,r=length(uv);
 uv=rot(u_signature.z*3.14)*uv*u_cloud.x;
 t+=u_signature.x*33.;
 float bass=(u_low.x*.45+u_low.y*.55)*u_drive,mid=(u_low.w*.4+u_high.x*.6)*u_drive;
 float shape=u_form.x,texture=u_form.y,flow=u_form.z*u_cloud.z,fluid=u_liquid.x*(1.+u_themes[0]*.5),iridescence=u_liquid.y,depth=u_liquid.z;
 // Bass compresses the space; attacks send bounded ripples through the cloud.
 vec2 p=rot(t*.027+sin(r*5.-t*.16)*flow*.22)*uv*(2.8-shape*.9-bass*.20);
 // Continuous, asymmetrical flow recipes: no polar petals, square folds or mirrored
 // coordinate domains. Themes tint the material; each song supplies its own currents.
 p*=vec2(.84+u_recipeA.x*.36,1.16-u_recipeA.x*.32);
 vec2 seed=u_recipeA.yz*8.+u_signature.xy*3.;
 vec2 eddies=vec2(noise(p*.67+seed+vec2(t*.015,0.)),noise(p*.73+seed.yx+vec2(4.2,-t*.012)))-.5;
 p+=eddies*(.3+u_recipeA.w*.75+fluid*.16);
 p+=normalize(uv+vec2(.0001))*sin(r*14.-t*1.1)*(u_accents.x*.028+bass*.018)*exp(-r*.6);
 p+=vec2(sin(uv.y*7.+t*.12),cos(uv.x*6.-t*.11))*mid*.025;
 // Slow, continuous stream-function warping gives the clouds a viscous circulating current.
 vec2 current=vec2(sin(p.y*1.7-t*.047)+cos(p.x*.8+p.y*.6+t*.032),cos(p.x*1.4+t*.039)-sin(p.y*.9-p.x*.5-t*.028));
 p+=current*(.09+fluid*.25+u_recipeA.w*.16)*u_cloud.z+seed;
 float drift=.55+u_recipeB.x*.85;
 // Speed is integrated on the CPU; only the small, bounded identity offset
 // depends on the current recipe. Never rescale elapsed session time here.
 float driftTime=u_driftTime+u_signature.x*33.*drift;
 vec2 q=vec2(fbm(p+vec2(driftTime*.067,-driftTime*.05)),fbm(p+4.3-driftTime*.065));
 vec2 w=vec2(fbm(p+(1.6+texture*1.8+u_recipeB.y*1.5+mid*.15)*q+vec2(1.7,t*.040)),fbm(p+(2.+u_recipeA.z*1.5)*q+vec2(-t*.035,8.2)));
 float f=fbm(p+(1.9+shape*1.5+u_recipeB.y*1.8)*w+mid*.08*u_movement);
 float cloud=pow(f,1.9+u_recipeB.z*.8)*exp(-r*.7);
 float filament=pow(1.-abs(sin((f+w.y*.2)*(13.+texture*7.+u_recipeB.w*13.))),10.+u_recipeB.z*6.);
 // Two planes moving at different depths, with negative space carved between them.
 float far=fbm(uv*2.1+vec2(-t*.018,t*.013)+w*.4);
 float dust=fbm(p*(1.2+u_recipeA.y*.7)+q*(2.+u_recipeB.z*1.3)+vec2(t*.022,-t*.019));
 float wisps=fbm(p*(2.3+u_recipeB.w*2.2)+w*(3.2+u_recipeA.w*1.6)+vec2(-t*.016,t*.024));
 float ridges=pow(clamp(1.-abs(wisps-.48)*8.,0.,1.),8.);
 float fine=pow(clamp(1.-abs(sin(wisps*85.+f*12.)),0.,1.),14.);
 float window=exp(-r*.65)*smoothstep(.22,.64,f);
 vec3 deep=pigment(far*.38+w.y*.16+u_themes[4]*.2),body=pigment(w.x*.62+f*.26+u_signature.w*.15),rim=pigment(wisps*.9+w.y*.18+u_themes[2]*.2);
 vec3 col=deep*.008;
 col+=deep*pow(far,3.)*.32;
 col+=mix(deep*.42,body,w.x)*cloud*(1.25+u_recipeA.x*.85+u_energy*1.5+u_roles.w*.5);
 col*=1.-smoothstep(.47,.72,dust)*.62;
 col+=rim*ridges*window*(.025+u_recipeA.w*.09+mid*.065);
 col+=pigment(wisps+.24)*fine*u_cloud.w*window*(.016+u_high.z*.045+u_transients.z*.022);
 col+=rim*filament*cloud*(.19+u_high.y*.40+u_accents.y*.20);
 // Thin-film interference follows the same smooth domain as the cloud; no animated random seed.
 float thickness=f*(4.7+u_recipeB.w*2.1)+w.x*(1.7+u_recipeA.z)+wisps*.24;
 vec3 interference=.5+.5*cos(thickness*(5.+iridescence*2.)+vec3(0.,2.1,4.2)+t*.035);
 vec3 oil=pigment(thickness*.17+interference.z*.15);
 float edge=contour(thickness*2.15,.045);
 vec2 normal=vec2(dFdx(thickness),dFdy(thickness))*u_resolution.y;
 float sheen=pow(clamp(dot(normalize(vec3(-normal*.32,1.)),normalize(vec3(-.5,.7,1.))),0.,1.),16.);
 // Nested capillary seams, prismatic oil shelves and deep folded valleys share one flow field.
 // Pixel derivatives keep the fine engraving stable when rendering at lower resolutions.
 float seams=contour(wisps*24.+f*3.5+w.x*.8,.022);
 float terraces=contour(thickness*5.3+sin(wisps*12.)*.15,.024);
 float veinMask=smoothstep(.30,.53,f)*(1.-smoothstep(.55,.76,dust));
 float glints=pow(clamp(dot(normalize(vec3(-normal*.52,1.)),normalize(vec3(.4,-.5,1.))),0.,1.),34.);
 col+=oil*(edge*.17+sheen*.23+terraces*.065)*window*iridescence*(.35+u_recipeB.z*.40+mid*.65);
 col+=pigment(wisps*.8+.35)*seams*u_cloud.w*veinMask*(.018+u_high.y*.023+u_transients.y*.013)*(1.+depth*.5);
 col+=rim*glints*veinMask*(.014+u_high.z*.035)*iridescence;
 col*=1.-contour(thickness*1.05+.25,.095)*window*.16*depth;
 col*=1.-smoothstep(.43,.69,dust)*depth*.19;
 col+=pigment(far+.42)*pow(far,5.)*depth*.35;
 col+=mix(u_colorA,u_colorC,.5)*ridges*window*(bass*.055+u_roles.x*.025);
 col+=u_colorA*exp(-r*6.)*(.05+u_accents.x*.06);
 col+=rim*(seams*veinMask*.07+glints*.14)*u_light.z*max(u_transients.y,u_transients.z)*u_cloud.w;
 // Leave a little darkness behind the foreground sculpture.
 col*=mix(.68,1.,smoothstep(.05,.55,r));
 col=1.-exp(-col*1.55*sqrt(u_intensity));
 col*=1.-smoothstep(.3,1.3,r)*.4;
 col+=(hash(gl_FragCoord.xy)-.5)/255.;fragColor=vec4(col,1.);
}`;
