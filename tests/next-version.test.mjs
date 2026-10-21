import test from 'node:test';
import assert from 'node:assert/strict';
import {SceneCamera,CAMERA_SPEED,CAMERA_ZOOM,cameraUniform} from '../public/scene-camera.js';
import {repairArtistCredits,artistNames,hasArtist} from '../public/artist-credits.js';
import {resolveVisualSync,visualSyncDevices} from '../public/visual-sync.js';
import {DEFAULT_PREFERENCES,preferencesWithDefaults} from '../public/default-preferences.js';

test('camera starts unchanged; orbit, reset and rail stay smooth and bounded',()=>{
 const camera=new SceneCamera();assert.deepEqual(camera.update(.016),[0,0,0,0]);
 camera.drag(100,10000);let previous=camera.update(1/60);assert.ok(previous[0]>0&&previous[0]<.5);
 for(let i=0;i<120;i++)previous=camera.update(1/60);
 for(let i=0;i<1800;i++){const next=camera.update(1/60,{rail:true,speed:2,features:{loudness:i%2,bands:[0,1]}});assert.ok(Math.abs(next[0]-previous[0])<.012);assert.ok(Math.abs(next[1]-camera.pitch)<=.8);assert.ok(next.every(Number.isFinite));previous=next;}
 assert.deepEqual(camera.update(.1,{frozen:true}),previous);
 camera.reset();for(let i=0;i<120;i++)camera.update(1/60);assert.ok(camera.pose.slice(0,2).every(p=>Math.abs(Math.sin(p.value))<.0001));assert.ok(camera.pose.slice(2).every(p=>Math.abs(p.value)<.0001));
});
test('vertical orbit crosses poles and complete turns without wrapping, reversal or rail override',()=>{
 for(const direction of [-1,1]){
  const camera=new SceneCamera();let previous=0;
  for(let i=0;i<1200;i++){camera.drag(0,2*direction);const pose=camera.update(1/120);assert.ok((pose[1]-previous)*direction>=0);assert.ok(Math.abs(pose[1]-previous)<.011);previous=pose[1];}
  assert.ok(Math.abs(previous)>Math.PI*3,'more than one complete vertical orbit');
  const pitch=camera.pitch;for(let i=0;i<120;i++)camera.update(1/60,{rail:true,speed:20});assert.equal(camera.pitch,pitch,'rail preserves the manual vertical orbit');
  const before=camera.pose[1].value;camera.reset();assert.ok(Math.abs(camera.pitch-before)<=Math.PI,'reset takes the nearest orientation');
 }
});
test('rail keeps its full range with a default one third of 6.67 and eases speed changes',()=>{
 assert.equal(CAMERA_SPEED.max,20);assert.ok(Math.abs(CAMERA_SPEED.default-6.67/3)<.005);
 const camera=new SceneCamera();let previous=0;for(let i=0;i<600;i++){const pose=camera.update(1/60,{rail:true,speed:20,features:{loudness:1,bands:[0,1]}});assert.ok(pose[0]>=previous);assert.ok(pose[0]-previous<.081);previous=pose[0];}
 assert.ok(camera.speed.value>4.7);const fast=camera.speed.value;camera.update(1/60,{rail:true,speed:.2});assert.ok(camera.speed.value>fast*.9,'no sudden stop on a speed adjustment');
});

test('camera zoom follows music with a hard cap of 3 and a compensating field of view',()=>{
 assert.equal(CAMERA_ZOOM.max,3);
 for(const rail of [false,true]){
  const camera=new SceneCamera();let previous=0;
  for(let i=0;i<600;i++){const pose=camera.update(1/165,{rail,zoom:true});assert.ok(Math.abs(pose[2]-previous)<.04,'entry has inertia');previous=pose[2];}assert.equal(camera.zoom.value,0,'silence does not zoom');assert.equal(camera.focalLength,1.9);
  const quiet=previous;
  for(let i=0;i<600;i++){const pose=camera.update(1/165,{rail,zoom:true,zoomIntensity:99,features:{loudness:i%2,bands:[0,1]}});assert.ok(Math.abs(pose[2]-previous)<.03,'alternating audio does not shake the camera');assert.ok(pose[2]>-3.8,'depth remains comfortable');assert.ok(camera.zoom.value<=3&&camera.focalLength>=1.9/1.54);previous=pose[2];}
  assert.ok(previous<quiet-.8,'loud music takes the camera deeper');assert.ok(camera.focalLength<1.5,'view widens on the way in');
  const lens=camera.focalLength,frozen=camera.update(.1,{zoom:false,frozen:true});assert.equal(frozen[2],previous);assert.equal(camera.focalLength,lens);
  for(let i=0;i<800;i++){const pose=camera.update(1/165,{zoom:true});assert.ok(Math.abs(pose[2]-previous)<.06,'quiet exit also has inertia');previous=pose[2];}
  assert.ok(Math.abs(previous)<.01,'silence returns to the wide view even while the toggle stays on');assert.ok(Math.abs(camera.focalLength-1.9)<.001);
  for(let i=0;i<1000;i++){const pose=camera.update(1/165,{rail,zoom:true,features:{loudness:10,bands:[0,10]}});assert.ok(camera.zoom.value<=3);const visualGain=camera.focalLength/1.9*5.4/(5.4+pose[2]);assert.ok(visualGain<2.25,'FOV offsets the heavy magnification at peak energy');}
  for(let i=0;i<800;i++)camera.update(1/165,{zoom:false,features:{loudness:1,bands:[0,1]}});assert.ok(Math.abs(camera.pose[2].value)<.01,'toggle off works while music is loud');
 }
 const reduced=new SceneCamera(),still=reduced.update(.016,{zoom:true,reduced:true});assert.ok(still[2]<-1&&still[2]>-2.2);assert.deepEqual(reduced.update(.016,{zoom:true,reduced:true,features:{loudness:1,bands:[0,1]}}),still,'reduced motion keeps a gentle static zoom');
});

test('playback zoom does not jump forward to catch up after a delayed frame',()=>{
 const camera=new SceneCamera();let previousGain=1,maximumStep=0;
 for(let i=0;i<400;i++){
  const loud=i<100||i>=200?1:0;
  const pose=camera.update(i%7===0?.1:1/60,{zoom:true,features:{loudness:loud,bands:[0,loud]}});
  const gain=camera.focalLength/1.9*5.4/(5.4+pose[2]);
  maximumStep=Math.max(maximumStep,Math.abs(Math.log(gain/previousGain)));previousGain=gain;
 }
 assert.ok(maximumStep<.021,'100 ms stalls during start, silence and resume cannot cause a large framing step');
 assert.ok(previousGain>1.5,'the smoother entry still reaches the musical zoom');
});

test('camera preferences migrate the previous default once and discard obsolete zoom intensity',()=>{
 assert.equal(DEFAULT_PREFERENCES.cameraZoom,false);assert.equal(DEFAULT_PREFERENCES.cameraSpeed,2.22);
 const migrated=preferencesWithDefaults({cameraSpeed:6.67,cameraZoom:true,cameraZoomIntensity:12});assert.equal(migrated.cameraSpeed,2.22);assert.equal(migrated.cameraZoom,true);assert.ok(!Object.hasOwn(migrated,'cameraZoomIntensity'));
 assert.equal(preferencesWithDefaults({...migrated,cameraSpeed:6.67}).cameraSpeed,6.67,'later custom choices are retained');
 assert.equal(preferencesWithDefaults({cameraSpeed:1.3,cameraZoomIntensity:99}).cameraSpeed,1.3,'existing custom speeds are retained');
 assert.equal(preferencesWithDefaults(migrated).cameraSpeed,2.22);
});
test('camera rail does not amplify travel with listening age or frame rate',()=>{
 const travel=(rate,seconds)=>{const c=new SceneCamera();for(let i=0;i<seconds*rate;i++)c.update(1/rate,{rail:true,features:{loudness:.4}});const before=c.yaw;for(let i=0;i<rate;i++)c.update(1/rate,{rail:true,features:{loudness:.8}});return c.yaw-before;};
 assert.ok(Math.abs(travel(60,15)-travel(60,7200))<1e-5);
 assert.ok(Math.abs(travel(60,15)-travel(165,15))<.001);
 const c=new SceneCamera();for(let i=0;i<100;i++)c.update(.1,{rail:true,reduced:true});assert.deepEqual(c.pose.map(p=>p.value),[0,0,0,0]);
});

test('GPU camera retains smooth sub-frame turns after 48 hours at maximum rail speed',()=>{
 for(const direction of [-1,1]){
  const start=48*3600*4.8*direction,step=direction*4.8/165;
  let previous;
  for(let i=0;i<165;i++){
   const angle=start+i*step,pose=[angle,angle+.3,.25,.07],upload=new Float32Array(cameraUniform(pose));
   assert.ok(Math.abs(upload[0])<Math.PI*2&&Math.abs(upload[1])<Math.PI*2);
   assert.ok(Math.abs(Math.sin(upload[0])-Math.sin(angle))<3e-7);assert.ok(Math.abs(Math.cos(upload[1])-Math.cos(angle+.3))<3e-7);
   assert.equal(pose[0],angle,'upload must not wrap the interpolated camera state');assert.equal(upload[2],.25);
   if(previous!==undefined){const rotation=Math.atan2(Math.sin(upload[0]-previous),Math.cos(upload[0]-previous));assert.ok(Math.abs(rotation-step)<5e-7,'wrap boundaries preserve angular velocity');}previous=upload[0];
  }
 }
});
test('Bluetooth auto delay does not follow the user onto a wired headset',()=>{
 const context={outputLatency:.066,baseLatency:.01},bt={id:'a'.repeat(24),transport:'bluetooth'},wired={id:'b'.repeat(24),transport:'direct'};
 const prefs={visualSyncDevices:{[bt.id]:{mode:'auto',offsetMs:12}}};
 assert.equal(resolveVisualSync(context,prefs,false,bt).delayMs,88);
 assert.equal(resolveVisualSync(context,prefs,false,wired).delayMs,0);
 assert.equal(resolveVisualSync(context,prefs,false,bt).delayMs,88);
 prefs.visualSyncDevices[wired.id]={mode:'direct',offsetMs:3};assert.equal(resolveVisualSync(context,prefs,false,{...wired,transport:'unknown'}).delayMs,3);
 assert.equal(resolveVisualSync(context,{desktopVisualSyncOffsetMs:100,...prefs},true,wired).delayMs,100);
 assert.deepEqual(visualSyncDevices({'bad':{},[bt.id]:{mode:'wrong',offsetMs:9999}}),{[bt.id]:{mode:'auto',offsetMs:1000}});
});
test('repost credits retain the uploader while assigning real performers and guests',()=>{
 const t=repairArtistCredits({artist:'Repost Channel',recordingArtists:['Repost Channel'],channel:'Repost Channel',rawTitle:'Luna - Moonrise (feat. Nova)',title:'Moonrise (feat. Nova)'});
 assert.equal(t.artist,'Luna');assert.equal(t.channel,'Repost Channel');assert.deepEqual(artistNames(t),['Luna','Nova']);assert.ok(hasArtist(t,'Nova'));
 const tagged=repairArtistCredits({...t,artist:'Repost Channel',recordingArtists:['Luna','Nova']});assert.deepEqual(artistNames(tagged),['Luna','Nova']);
 const manual=repairArtistCredits({...t,artist:'My artist',metadataStatus:'manual',musicbrainzArtists:[{name:'Wrong'}]});assert.equal(manual.artist,'My artist');assert.ok(!artistNames(manual).includes('Wrong'));
 assert.deepEqual(artistNames(repairArtistCredits({artist:'Earth, Wind & Fire'})),['Earth, Wind & Fire']);
 assert.deepEqual(artistNames(repairArtistCredits({artist:'Tyler, The Creator',musicbrainzArtists:[{name:'Tyler, The Creator'}]})),['Tyler, The Creator']);
 assert.deepEqual(artistNames(repairArtistCredits({artist:'Luna x Nova feat. Sol'})),['Luna','Nova','Sol']);
});
