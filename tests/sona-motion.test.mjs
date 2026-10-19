import test from 'node:test';
import assert from 'node:assert/strict';
import {DanceMotion,CompanionClock,SONA_ROUTINES,REST_POSE,SPRITE_FPS,COMPANION_FPS,clipDurations,SONA_TIMING} from '../public/companion-motion.js';
import {SONA_CLIPS,SONA_SHEETS,spriteFootAnchor} from '../public/companion-atlas.js';
const advance=(m,seconds,options={},fps=60)=>{let p;for(let i=0;i<seconds*fps;i++)p=m.update(1/fps,options);return p;};

test('scheduled sprite routines cover every active dance row and never exceed 12 illustrated poses per second',()=>{
 for(const fps of [24,60,165])for(const bpm of [65,120,180,300]){
  const m=new DanceMotion(),phrases=new Set(),rows=new Set();let old='',changes=0;
  advance(m,40,{active:true,bpm,confidence:1,loudness:.7},fps);m.beats=0;
  for(let i=0;i<fps*150;i++){
   const f=m.update(1/fps,{active:true,bpm,confidence:1,loudness:.7});phrases.add(f.name);rows.add(f.row);
   assert.ok(f.row>=0&&f.row<8&&Number.isInteger(f.row));assert.ok(f.frame>=0&&f.frame<8&&Number.isInteger(f.frame));assert.ok(Object.values(f.pose).every(Number.isFinite));
   const key=f.row+':'+f.frame;if(key!==old)changes++;old=key;
  }
  assert.deepEqual([...phrases].sort(),[...SONA_ROUTINES].sort());assert.deepEqual([...rows].sort(),SONA_ROUTINES.map(name=>SONA_CLIPS[name].row).sort());assert.ok(changes<=150*SPRITE_FPS+12,`sprite rate ${changes/150}`);
 }
});

test('24 Hz redraw budget and fixed animation timing do not depend on monitor refresh',()=>{
 const beats=[];
 for(const hz of [30,60,120,144,165,240]){
  const clock=new CompanionClock();let drawn=0,seconds=0;for(let i=0;i<=hz*10;i++){const dt=clock.step(i*1000/hz);if(dt!==null){drawn++;seconds+=dt;}}
  assert.ok(Math.abs(seconds-10)<.04);assert.ok(drawn>=COMPANION_FPS*10-1&&drawn<=COMPANION_FPS*10+2,`${hz} Hz drew ${drawn}`);
  const m=new DanceMotion();advance(m,12,{active:true,bpm:174,confidence:1},hz);beats.push(m.beats);
 }
 assert.ok(Math.max(...beats)-Math.min(...beats)<1e-8);const clock=new CompanionClock();clock.step(0);assert.ok(clock.step(5000)<=.1);clock.reset();assert.equal(clock.step(8000),0);
});

test('sprite idle, sleep, wake, greeting, pickup, held and landing remain interruptible',()=>{
 const m=new DanceMotion();assert.equal(advance(m,1).state,'idle');const asleep=advance(m,36);assert.equal(asleep.state,'sleep');assert.equal(asleep.row,8);assert.ok(asleep.frame>=0&&asleep.frame<8);
 m.look(0,0,true);assert.equal(m.update(1/24).state,'idle');m.press();assert.equal(m.update(1/24).state,'pressed');m.click();assert.equal(m.update(1/24).state,'clicked');assert.ok(advance(m,.35).pose.spark>.2);
 m.pickUp();assert.equal(m.update(1/24).state,'pickup');assert.equal(advance(m,.45).state,'held');m.move(100);assert.equal(advance(m,2).state,'held');m.drop();assert.equal(m.update(1/24).state,'drop');assert.equal(advance(m,1).state,'idle');
 m.pickUp();m.drop();m.pickUp();m.cancel();assert.equal(m.update(1/24).state,'idle');m.look(0,0,false);advance(m,36);assert.notEqual(m.update(1/24,{active:true}).state,'sleep');
});

test('dance cycles visit every authored pose and interactions use their own art',()=>{
 assert.equal(SONA_SHEETS.reduce((n,s)=>n+s.rows*s.columns,0),104);
 for(const name of SONA_ROUTINES){
  const m=new DanceMotion();m.setAppearance('sona');const phrase=SONA_ROUTINES.indexOf(name),clip=m.clips[name],frames=[];
  let elapsed=0;const durations=clipDurations(clip,m.bpm);
  for(let i=0;i<durations.length;i++){m.beats=phrase*16+(elapsed+durations[i]/2)*m.bpm/60;frames.push(m.update(0,{active:true,mode:'dancing',loudness:.7}).frame);elapsed+=durations[i];}
  assert.deepEqual(frames,clip.frames||[0,1,2,3,4,5,6,7]);
  if(['hand-wave','side-sway'].includes(name))assert.equal(clip.beats,4);
 }
 const m=new DanceMotion();for(const [method,row]of [['click',9],['pickUp',10],['drop',11]]){m[method]();assert.equal(m.update(0).row,row);}
 m.pickUp();assert.equal(advance(m,.5).row,10);
 const held=new Set();for(let i=0;i<96;i++)held.add(m.update(1/24).frame);assert.deepEqual([...held].sort(),[3,4,5,6,7]);
});

test('foot registration ignores wide raised hands and nearly transparent stray pixels',()=>{
 const w=100,h=100,pixels=new Uint8ClampedArray(w*h*4),rect=(x0,y0,x1,y1,a=255)=>{for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)pixels[(y*w+x)*4+3]=a;};
 rect(35,30,65,85);rect(32,85,43,93);rect(57,85,68,93);const standing=spriteFootAnchor(pixels,w,h);
 rect(0,25,45,34);rect(99,99,100,100,100);assert.deepEqual(spriteFootAnchor(pixels,w,h),standing);assert.equal(standing.y,93);assert.ok(Math.abs(standing.x-50)<.01);
 assert.deepEqual(spriteFootAnchor(new Uint8ClampedArray(w*h*4),w,h),{x:50,y:90});
});

test('a jump lifts through its apex and returns to the foot baseline without a loop snap',()=>{
 const m=new DanceMotion(),base=SONA_ROUTINES.indexOf('soft-bounce')*16,heights=[];
 for(let i=0;i<=8;i++){m.beats=base+i*SONA_CLIPS['soft-bounce'].beats/8;heights.push(m.update(0,{active:true,mode:'dancing'}).pose.y);}
 assert.ok(Math.abs(heights[0])<.01);assert.ok(heights[4]<-9);assert.ok(Math.abs(heights[8])<.01);
});

test('music tempo and loudness cannot speed up, distort or alter a Sona routine',()=>{
 const calm=new DanceMotion(),busy=new DanceMotion();
 for(let i=0;i<24*120;i++){
  const a=calm.update(1/24,{active:true,bpm:55,confidence:1,loudness:.02});
  const b=busy.update(1/24,{active:true,bpm:i%40<20?300:72,confidence:i%3?1:0,loudness:i%20/20});
  assert.deepEqual(b,a);assert.equal(a.pose.scaleX,1);assert.equal(a.pose.scaleY,1);assert.equal(a.pose.rotation,0);
 }
});

test('routine changes preserve sprite proportions without a transition effect',()=>{
 const m=new DanceMotion();advance(m,2,{active:true});
 for(let phrase=0;phrase<SONA_ROUTINES.length;phrase++){
  m.beats=phrase*16;
  for(let i=0;i<12;i++){const f=m.update(i?1/24:0,{active:true,mode:'dancing'});assert.equal(f.name,SONA_ROUTINES[phrase]);assert.equal(f.pose.scaleX,1);assert.equal(f.pose.scaleY,1);}
 }
 assert.equal(m.update(0,{active:true,reduced:true}).pose.scaleY,1);
});

test('eye-closes remain brief at slow tempo and a resting Sona starts awake before blinking',()=>{
 for(const bpm of [55,70,120,180]){
  const durations=clipDurations(SONA_CLIPS['soft-bounce'],bpm);
  assert.ok(durations[6]<=.15);assert.ok(durations.every(t=>t>=1/12-1e-9));
  assert.ok(Math.abs(durations.reduce((a,b)=>a+b,0)-SONA_CLIPS['soft-bounce'].beats*60/bpm)<1e-8);
 }
 const m=new DanceMotion();advance(m,4.5,{active:true});assert.equal(m.update(0,{active:false}).frame,0);
 const idleFrames=[];for(let i=0;i<6*120;i++)idleFrames.push(m.update(1/120).frame);
 assert.ok(idleFrames.includes(3)&&idleFrames.includes(4)&&idleFrames.includes(5));
 assert.ok(idleFrames.filter(f=>f===4).length/120<.12);
 m.press();assert.equal(advance(m,1).frame,0);assert.equal(m.update(0).row,12);
 for(const [method,row,closed]of [['click',9,3],['drop',11,3]]){
  m[method]();let closedTime=0,seen=[];
  for(let i=0;i<120;i++){const f=m.update(1/120);if(f.row===row){seen.push(f.frame);if(f.frame===closed)closedTime+=1/120;}}
  assert.ok(closedTime>0&&closedTime<=.12);assert.equal(new Set(seen).size,8);
 }
});

test('carrying leans gradually around the head and landing settles before returning to a neutral dance phase',()=>{
 const m=new DanceMotion();m.pickUp();advance(m,.5);const before=m.update(0).pose;
 m.move(100);const instant=m.update(0).pose;assert.equal(instant.rotation,before.rotation);
 const carried=advance(m,.1).pose;assert.ok(carried.rotation>instant.rotation);assert.equal(carried.pivotY,36);
 m.drop();const released=m.update(0);assert.equal(released.pose.rotation,carried.rotation);
 m.beats=7.5;const landed=advance(m,1,{active:true,bpm:120,confidence:1});assert.ok(landed.state.startsWith('dancing'));assert.ok(landed.beats<1);assert.equal(landed.frame,0);
});

test('pause, freeze and reduced motion stop dance progression and keep static sprite poses',()=>{
 const m=new DanceMotion();advance(m,4,{active:true});const beats=m.beats;advance(m,2,{active:false});assert.equal(m.beats,beats);
 for(const option of [{reduced:true},{frozen:true}]){const a=advance(m,2,{active:true,...option}),b=advance(m,2,{active:true,...option});assert.equal(m.beats,beats);assert.equal(a.frame,b.frame);assert.deepEqual(a.pose,REST_POSE);assert.deepEqual(a.pose,b.pose);}
 advance(m,2,{active:true});assert.ok(m.beats>beats);
});
