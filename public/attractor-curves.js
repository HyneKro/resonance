// Classical Lorenz (10, 28, 8/3) and Rössler (.2, .2, 5.7) flows.
// RK4 is evaluated once at preparation, never once per particle or live frame.
// References: https://sprott.physics.wisc.edu/pubs/paper327.htm
export const ATTRACTOR_SAMPLES=2048;
export const ATTRACTOR_ROWS=2;
const derivative=(p,row)=>row===0?[10*(p[1]-p[0]),p[0]*(28-p[2])-p[1],p[0]*p[1]-8/3*p[2]]:[-p[1]-p[2],p[0]+.2*p[1],.2+p[2]*(p[0]-5.7)];
function step(p,dt,row){
 const a=derivative(p,row),b=derivative(p.map((x,i)=>x+a[i]*dt/2),row),c=derivative(p.map((x,i)=>x+b[i]*dt/2),row),d=derivative(p.map((x,i)=>x+c[i]*dt),row);
 return p.map((x,i)=>x+dt*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
export async function attractorCurves(checkpoint=async()=>{}){
 const data=new Float32Array(ATTRACTOR_SAMPLES*ATTRACTOR_ROWS*4);
 for(let row=0;row<ATTRACTOR_ROWS;row++){
  let p=[1,1,1];const dt=row===0?.008:.035,points=[];
  for(let i=0;i<1200+ATTRACTOR_SAMPLES*2;i++){
   p=step(p,dt,row);
   if(i>=1200&&i%2===0)points.push([...p]);
   if(i%1024===0)await checkpoint();
  }
  const low=[0,1,2].map(axis=>Math.min(...points.map(p=>p[axis]))),high=[0,1,2].map(axis=>Math.max(...points.map(p=>p[axis])));
  const scale=2.65/Math.max(...high.map((x,i)=>x-low[i]));
  for(let i=0;i<points.length;i++){
   const q=points[i].map((x,axis)=>(x-(low[axis]+high[axis])/2)*scale);
   // Put the distinctive butterfly/spiral silhouette in the initial viewing plane.
   data.set(row===0?[q[0],q[2],q[1]*.65,1]:[q[0],q[1],q[2]*.8,1],(row*ATTRACTOR_SAMPLES+i)*4);
  }
 }
 return data;
}
