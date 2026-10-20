import {hashText} from './track-character.js';
export const SCULPTURE_NAMES=['Tidal ribbons','Orbital shell','Solar corona','Branching bloom','Silken bell','Crystal knot','Manta veil','Nautilus sail','Möbius current','Double helix','Armillary sphere','Gravity lantern','Phoenix wings','Magnetic crown','Solar helix','Seedpod lattice','Orchid spiral','Coral chalice','Chrysalis','Whisper canopy','Infinity veil','Trefoil knot','Gyroid lantern','Diamond braid','Lorenz butterfly','Rössler current','Figure-eight knot','Cinquefoil weave','Hopf garland','Enneper flower'];
export const sculptureChoice=value=>value==='auto'?'auto':typeof value==='string'&&/^form-\d+$/.test(value)&&Number(value.slice(5))<SCULPTURE_NAMES.length?value:'auto';
export function expandedSculpture(profile,chapter){const key=profile.seed+'|new-forms|'+(chapter?.kind||'')+'|'+(chapter?.start||0);return hashText(key)%5===0?24+(hashText(key+'|form')>>>8)%6:null;}
export function sculptureFor(profile){const primary=Math.max(...profile.themes)-Math.min(...profile.themes)<.015?(hashText(profile.seed+'|theme')>>>8)%6:profile.themes.indexOf(Math.max(...profile.themes)),variant=(hashText(profile.seed+'|sculpture-2')>>>8)%4;return variant===0?primary:6+primary*3+variant-1;}
export class SculptureMorph{
 constructor(){this.from=0;this.to=0;this.progress=1;this.pending=null;this.initialized=false;this.fromSignature=this.toSignature=[.5,.5,.5,.5];}
 update(target,dt,{frozen=false,reduced=false,signature=[.5,.5,.5,.5]}={}){
  const key=JSON.stringify([target,signature]),next={target,signature:[...signature],key};
  if(!this.initialized){this.from=this.to=target;this.fromSignature=this.toSignature=[...signature];this.key=key;this.initialized=true;}
  if(frozen)return this.value();
  if(reduced){this.from=this.to=target;this.fromSignature=this.toSignature=[...signature];this.key=key;this.progress=1;this.pending=null;return this.value();}
  if(key!==this.key){if(this.progress<1)this.pending=next;else this.begin(next);}else this.pending=null;
  this.progress=Math.min(1,this.progress+Math.max(0,Math.min(.1,dt))/4);
  if(this.progress===1&&this.pending)this.begin(this.pending);
  return this.value();
 }
 begin(next){this.from=this.to;this.fromSignature=this.toSignature;this.to=next.target;this.toSignature=next.signature;this.key=next.key;this.pending=null;this.progress=0;}
 value(){return [this.from,this.to,this.progress*this.progress*(3-2*this.progress),1];}
}

// Every form uses the same persistent (u,v) sample map, so transitions retain particles.
export const EXTRA_SCULPTURES=`
uniform sampler2D u_attractors;
vec3 curvePoint(float phase,int row){float x=clamp(phase,0.,1.)*2047.;int i=int(floor(x));return mix(texelFetch(u_attractors,ivec2(i,row),0).xyz,texelFetch(u_attractors,ivec2(min(2047,i+1),row),0).xyz,fract(x));}
vec3 extraSculpture(float id,float u,float v,float t,float response,vec3 original,vec4 signature){
 float A=signature.x,B=signature.y,C=signature.z,D=signature.w;
 float width=.18+B*.38,turn=1.5+C*1.5,breath=u_roles.x*.12+u_rhythm.z*u_particle.z*.06;
 float vv=v*PI,ring=1.+breath;vec3 q=original;
 if(id<5.5)return original;
 if(id<6.5){float sail=sin(u)*(.9+.5*abs(v));q=vec3(sail*1.6,v*.85+cos(u*2.+t*.05)*.18,cos(u)*.4+v*v*(.3+sin(u)*.4));}
 else if(id<7.5){float a=u*1.4,r=.25+u/TAU*(.95+A*.4);q=vec3(cos(a)*r,sin(a)*r,v*(.18+.45*u/TAU)+sin(a*2.)*.18);}
 else if(id<8.5){float r=ring+v*cos(u*.5)*(.3+B*.3);q=vec3(cos(u)*r,sin(u)*r,v*sin(u*.5)*(.45+C*.3));}
 else if(id<9.5){float a=u*turn+v*PI;q=vec3(cos(a)*(.5+A*.25), (u/TAU-.5)*2.8,sin(a)*(.5+A*.25));q+=vec3(cos(a),0.,sin(a))*v*.18;}
 else if(id<10.5){float a=u+v*turn;q=vec3(cos(a)*ring,sin(a)*cos(vv)*ring,sin(a)*sin(vv)*ring);q*=vec3(1.+A*.25,.8+B*.3,.8+C*.4);}
 else if(id<11.5){float waist=.3+.75*pow(abs(v),.7);q=vec3(cos(u)*waist,v*1.15,sin(u)*waist);q.xz=rot(v*turn+t*.035)*q.xz;}
 else if(id<12.5){float wing=sin(u),r=1.+v*.35;q=vec3(wing*r*1.7,cos(u)*.35+pow(abs(wing),.65)*.8+v*.35,sin(u*2.)*.45+v*v*.3);}
 else if(id<13.5){float r=ring+cos(u*(4.+floor(A*4.)))*(.18+B*.2)+v*.17;q=vec3(cos(u)*r,sin(u)*r,v*.7+sin(u*2.+vv)*.2);}
 else if(id<14.5){float a=u*2.,r=.8+v*.3;q=vec3(cos(a)*r,sin(a)*r,(u/TAU-.5)*1.7+v*.3);}
 else if(id<15.5){float r=sqrt(max(0.,1.-v*v))*(.7+A*.5);q=vec3(cos(u)*r,v*1.35,sin(u)*r);q.xz=rot(v*turn)*q.xz;q+=normalize(q+vec3(.001))*sin(u*8.+vv*5.)*.045;}
 else if(id<16.5){float petal=.75+.35*cos(u*(3.+floor(A*3.)));q=vec3(cos(u)*petal*(1.+v*.3),sin(u)*petal*(1.+v*.3),sin(u*3.+vv)*.55+v*.4);}
 else if(id<17.5){float r=.25+(v+1.)*.4+.10*sin(u*7.+v*4.);q=vec3(cos(u)*r,v*.9,sin(u)*r);q.y+=sin(u*3.)*.12;}
 else if(id<18.5){float r=.22+sqrt(max(0.,1.-v*v))*(.5+A*.3);q=vec3(cos(u)*r,v*1.45,sin(u)*r*.8);q.x+=sin(v*3.+t*.04)*.25;}
 else if(id<19.5){float r=(v+1.)*.65;q=vec3(cos(u)*r,sin(u)*r,cos(r*2.)*.65+sin(u*5.)*r*.13);}
 else if(id<20.5){float denom=1.+cos(u)*cos(u);q=vec3(sin(u)/denom*2.,sin(u)*cos(u)/denom*2.,v*.55+cos(u)*.25);q.xy+=vec2(cos(u),sin(u))*v*.2;}
 else if(id<21.5){float r=.8+.3*cos(u*3.);q=vec3(r*cos(u*2.),r*sin(u*2.),.4*sin(u*3.));q+=vec3(cos(u*2.)*cos(vv),sin(u*2.)*cos(vv),sin(vv))*width*.55;}
 else if(id<22.5){q=vec3(cos(u)*(1.+v*.2),sin(u)*(1.+v*.2),sin(u*3.+vv*2.)*.5+v*.4);q.xy=rot(sin(vv)*.5)*q.xy;}
 else if(id<23.5){float a=u*2.,r=.75+v*.26;q=vec3(cos(a)*r,sin(a)*r,sin(u*3.)*.7+v*.2);q.xy=rot(v*.5)*q.xy;}
 if(id>23.5&&id<25.5){
  int row=id<24.5?0:1;float phase=u/TAU;q=curvePoint(phase,row);
  vec3 tangent=normalize(curvePoint(min(1.,phase+.001),row)-curvePoint(max(0.,phase-.001),row)+vec3(.00001));
  vec3 normal=normalize(cross(tangent,abs(tangent.z)>.9?vec3(0.,1.,0.):vec3(0.,0.,1.)));
  q+=normal*v*(.025+B*.028)+cross(tangent,normal)*sin(vv)*.012;
 }else if(id>25.5&&id<26.5){float r=.86+.32*cos(u*2.);q=vec3(r*cos(u*3.),r*sin(u*3.),.42*sin(u*4.));q+=vec3(cos(u*3.)*cos(vv),sin(u*3.)*cos(vv),sin(vv))*(.08+B*.06);}
 else if(id>26.5&&id<27.5){float r=.88+.28*cos(u*5.);q=vec3(r*cos(u*2.),r*sin(u*2.),.42*sin(u*5.));q+=vec3(cos(u*2.)*cos(vv),sin(u*2.)*cos(vv),sin(vv))*.12;}
 else if(id>27.5&&id<28.5){float ringId=floor((v*.5+.5)*7.),theta=ringId/7.*TAU;q=vec3(.76*cos(u)+.63,.76*sin(u),.12*sin(u*2.));q.xz=rot(.72)*q.xz;q.xy=rot(theta)*q.xy;q+=normalize(q+vec3(.01))*fract((v*.5+.5)*7.)*.065;}
 else if(id>28.5){float radius=.12+(v+1.)*.43,x=cos(u)*radius,y=sin(u)*radius;q=vec3(x-x*x*x/3.+x*y*y,y-y*y*y/3.+y*x*x,(x*x-y*y)*.72);q.xy*=1.15;}
 q*=vec3(.86+A*.28,.88+B*.24,.85+C*.3);
 q+=field(q*(2.+D*2.),t*.07)*(.015+response*.055)*u_movement;
 return q;
}
`;
