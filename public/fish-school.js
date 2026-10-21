// A small, persistent boid population. Fixed steps, local neighbours and reusable
// storage keep the work bounded; rendering interpolates between simulation steps.
const STEP=1/24,GRID=16,CELL=.6;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export class FishSchool {
  constructor(count=384){
    this.count=clamp(Math.floor(count)||160,16,384);this.clock=null;this.carry=0;this.phase=0;this.steps=0;
    const n=this.count;this.state=new Float32Array(n*6);this.previous=new Float32Array(n*6);this.next=new Float32Array(n*6);
    this.texture=new Float32Array(n*8);this.heads=new Int16Array(GRID**3);this.links=new Int16Array(n);
    let seed=8271;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let i=0;i<n;i++){
      const a=random()*Math.PI*2,r=.55+Math.sqrt(random())*.85,y=Math.sin(a*2.)*.28+(random()-.5)*(.25+Math.sin(a)**2*.55);
      this.state.set([Math.cos(a)*r,y,Math.sin(a)*r*.55-.7,-Math.sin(a)*.45,0,Math.cos(a)*.3],i*6);
    }
    this.previous.set(this.state);this.sample(0);
  }
  suspend(){this.clock=null;}
  update(clock,roles={}){
    if(!Number.isFinite(clock))return this.texture;
    const elapsed=this.clock===null?0:clock-this.clock;this.clock=clock;
    // Inactive tabs and a changed scene never create a long catch-up frame.
    this.carry+=elapsed>0&&elapsed<.25?Math.min(.1,elapsed):0;
    const bass=clamp(Number(roles.bass)||0,0,1),lead=clamp(Number(roles.lead)||0,0,1);
    while(this.carry>=STEP){this.step(bass,lead);this.carry-=STEP;}
    this.sample(this.carry/STEP);return this.texture;
  }
  cell(value){return clamp(Math.floor(value/CELL+GRID/2),0,GRID-1);}
  step(bass,lead){
    const s=this.state,n=this.count,heads=this.heads,links=this.links;heads.fill(-1);this.previous.set(s);this.phase+=STEP;this.steps++;
    for(let i=0;i<n;i++){const at=i*6,key=this.cell(s[at])+GRID*(this.cell(s[at+1])+GRID*this.cell(s[at+2]));links[i]=heads[key];heads[key]=i;}
    for(let i=0;i<n;i++){
      const at=i*6,x=s[at],y=s[at+1],z=s[at+2],vx=s[at+3],vy=s[at+4],vz=s[at+5];
      let sx=0,sy=0,sz=0,ax=0,ay=0,az=0,cx=0,cy=0,cz=0,near=0;
      const gx=this.cell(x),gy=this.cell(y),gz=this.cell(z);
      for(let zz=Math.max(0,gz-1);zz<=Math.min(GRID-1,gz+1);zz++)for(let yy=Math.max(0,gy-1);yy<=Math.min(GRID-1,gy+1);yy++)for(let xx=Math.max(0,gx-1);xx<=Math.min(GRID-1,gx+1);xx++){
        for(let j=heads[xx+GRID*(yy+GRID*zz)];j>=0;j=links[j]){
          if(j===i)continue;const b=j*6,dx=x-s[b],dy=y-s[b+1],dz=z-s[b+2],d2=dx*dx+dy*dy+dz*dz;
          if(d2>.36)continue;near++;cx+=s[b];cy+=s[b+1];cz+=s[b+2];ax+=s[b+3];ay+=s[b+4];az+=s[b+5];
          if(d2<.035){const repel=.018/Math.max(.002,d2);sx+=dx*repel;sy+=dy*repel;sz+=dz*repel;}
        }
      }
      const radius=1.05+bass*.28,radial=Math.hypot(x,(z+.7)*1.4),pull=(radial-radius)*.7;
      let fx=-(z+.7)*.42-x*pull+sx,fy=-y*.75+Math.sin(x*1.8+this.phase*.5)*(.08+lead*.10)+sy,fz=x*.30-(z+.7)*pull+sz;
      if(near){fx+=(ax/near-vx)*.65+(cx/near-x)*.2;fy+=(ay/near-vy)*.65+(cy/near-y)*.2;fz+=(az/near-vz)*.65+(cz/near-z)*.2;}
      const accel=Math.max(1,Math.hypot(fx,fy,fz)/1.1);let nx=vx+fx/accel*STEP,ny=vy+fy/accel*STEP,nz=vz+fz/accel*STEP;
      const speed=Math.hypot(nx,ny,nz)||1,target=clamp(speed,.28,.52+bass*.20),ratio=target/speed;nx*=ratio;ny*=ratio;nz*=ratio;
      this.next.set([x+nx*STEP,y+ny*STEP,z+nz*STEP,nx,ny,nz],at);
    }
    this.state=this.next;this.next=s;
  }
  sample(t){
    const n=this.count;for(let i=0;i<n;i++)for(let k=0;k<3;k++){
      this.texture[i*4+k]=this.previous[i*6+k]+(this.state[i*6+k]-this.previous[i*6+k])*t;
      this.texture[n*4+i*4+k]=this.previous[i*6+3+k]+(this.state[i*6+3+k]-this.previous[i*6+3+k])*t;
    }
    return this.texture;
  }
}
