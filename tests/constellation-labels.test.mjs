import test from 'node:test';
import assert from 'node:assert/strict';
import {AnchoredLabels} from '../public/constellation-labels.js';
import {createProjector} from '../public/constellation-space.js';
const bounds={x:20,y:80,width:1000,height:600};
const label=(id,x=400,y=300)=>({id,x,y,width:120,height:32,priority:40});
const settle=(layout,items,n=60)=>{let out;for(let i=0;i<n;i++)out=layout.update(items,bounds);return out;};

test('mouse hover never displaces persistent star or genre labels',()=>{
 const layout=new AnchoredLabels(),fixed=settle(layout,[label('genre')])[0];
 for(let i=0;i<120;i++){
  const out=layout.update([label('genre'),{...label('hover-'+i,390+i%24,300),priority:10}],bounds);
  const current=out.find(x=>x.id==='genre');
  assert.equal(current.x,fixed.x);assert.equal(current.y,fixed.y);assert.equal(current.opacity,1);
 }
 assert.ok(layout.states.size<=2,'transient hover labels do not accumulate');
});
test('camera orbit, pan and zoom move labels by exactly their world anchor projection',()=>{
 const layout=new AnchoredLabels(),world=[100,80,160];
 for(let i=0;i<240;i++){
  const p=createProjector({yaw:i*.003,pitch:i*.001,zoom:.8+i*.003,center:[i*.1,0,0]},1000,600,80)(world);
  const out=layout.update([label('star',p.x,p.y+26)],bounds);
  for(const item of out){assert.equal(item.x+item.width/2,p.x);assert.equal(item.y,p.y+26);}
 }
});
test('crowded labels fade without swapping slots; newcomers wait for stable clearance',()=>{
 const layout=new AnchoredLabels();settle(layout,[label('a'),label('b',650)]);
 let out=layout.update([label('b',450),label('a')],bounds);
 assert.ok(out.find(x=>x.id==='b').opacity<1);
 assert.equal(out.find(x=>x.id==='b').x,390);
 out=settle(layout,[label('b',450),label('a')]);assert.deepEqual(out.map(x=>x.id),['a']);
 for(let i=0;i<40;i++){
  out=layout.update([label('a'),label('b',i%2?650:450)],bounds);
  assert.ok(!out.some(x=>x.id==='b'),'a short gap must not flash another caption');
 }
 assert.ok(settle(layout,[label('a'),label('b',650)]).some(x=>x.id==='b'));
});
test('labels disappear at screen edges instead of sliding along them; reduced motion and disposal are bounded',()=>{
 const layout=new AnchoredLabels();settle(layout,[label('a')]);
 for(let x=400;x>0;x-=3)for(const item of layout.update([label('a',x)],bounds))assert.equal(item.x,x-60);
 assert.deepEqual(settle(layout,[label('a',0)]),[]);
 assert.deepEqual(layout.update([label('a',-100)],bounds,{reduced:true}),[]);
 layout.clear();assert.equal(layout.states.size,0);
});
