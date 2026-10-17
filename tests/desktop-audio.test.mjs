import test from 'node:test';import assert from 'node:assert/strict';import {createRequire} from 'node:module';
import {DesktopAudio,LocalMediaSession} from '../public/desktop-audio.js';import {Reactor} from '../public/reactor.js';import {preferencesWithDefaults} from '../public/default-preferences.js';import {KALEIDOSCOPE_MODES,kaleidoscopeIndex} from '../public/kaleidoscope.js';
const {installDesktopAudio}=createRequire(import.meta.url)('../electron/desktop-audio.cjs');
function fixture(){
 const events={},video={readyState:'live',stop(){this.readyState='ended';}},audioTrack={...video,addEventListener(name,fn){events[name]=fn;}};
 const stream={getVideoTracks:()=>[video],getAudioTracks:()=>[audioTrack],getTracks:()=>[video,audioTrack]},changes=[],reactor={async connect(){},setDesktopStream(s){this.stream=s;}},audio={paused:false,pause(){this.paused=true;}},bridge={async prepareDesktopAudio(){},async stopDesktopAudio(){}},mediaDevices={async getDisplayMedia(){return stream;}};
 const capture=new DesktopAudio({reactor,audio,bridge,mediaDevices,onChange:s=>changes.push(s)});return {capture,reactor,audio,stream,video,audioTrack,changes,events,mediaDevices};
}
test('desktop capture releases video immediately, pauses local music, and releases audio on stop or ended',async()=>{
 const f=fixture();await f.capture.start();assert.equal(f.capture.state,'listening');assert.equal(f.video.readyState,'ended');assert.equal(f.audioTrack.readyState,'live');assert.equal(f.audio.paused,true);assert.equal(f.reactor.stream,f.stream);f.events.ended();assert.equal(f.capture.state,'off');assert.equal(f.reactor.stream,null);assert.equal(f.audioTrack.readyState,'ended');
});
test('cancel during permission or connection never leaves a live capture behind',async()=>{
 const f=fixture();let resolve;f.mediaDevices.getDisplayMedia=()=>new Promise(r=>resolve=r);const start=f.capture.start();for(let i=0;i<5&&!resolve;i++)await Promise.resolve();f.capture.stop();resolve(f.stream);await start;assert.equal(f.capture.state,'off');assert.equal(f.audioTrack.readyState,'ended');assert.equal(f.reactor.stream,null);
 const bad=fixture();bad.mediaDevices.getDisplayMedia=async()=>{throw Error('denied');};await assert.rejects(bad.capture.start(),/denied/);assert.equal(bad.capture.state,'off');assert.equal(bad.audio.paused,false);
});
test('loopback analysis never reaches speakers with nonzero gain and EQ is local only',()=>{
 const node=name=>({name,outputs:[],gain:{value:0,setTargetAtTime(){},cancelScheduledValues(){},setValueAtTime(v){this.value=v;}},connect(n){this.outputs.push(n);},disconnect(){this.outputs=[];}});
 const r={setPlaybackGain:Reactor.prototype.setPlaybackGain,source:node('local'),desktopSource:node('desktop'),microphoneSource:node('microphone'),analyser:node('fft'),midAnalyser:node('mid'),fastAnalyser:node('fast'),filters:[node('low'),node('mid'),node('high')],context:{currentTime:0,destination:node('speakers'),createGain:()=>node('silent')}};
 Reactor.prototype.eq.call(r,[3,0,-2]);assert.equal(r.analysisSink.gain.value,0);assert.deepEqual(r.desktopSource.outputs,[r.analyser]);assert.deepEqual(r.microphoneSource.outputs,[r.analyser]);assert.deepEqual(r.fastAnalyser.outputs,[r.analysisSink]);assert.deepEqual(r.filters[2].outputs,[r.levelGain]);assert.deepEqual(r.levelGain.outputs,[r.fadeGain]);assert.deepEqual(r.fadeGain.outputs,[r.context.destination]);
 r.desktopSource=null;Reactor.prototype.eq.call(r,[0,0,0]);assert.deepEqual(r.source.outputs,[r.analyser]);assert.deepEqual(r.fastAnalyser.outputs,[r.levelGain]);assert.deepEqual(r.fadeGain.outputs,[r.context.destination]);assert.deepEqual(r.analysisSink.outputs,[]);
});
test('native capture grants only a recent, single-use, user initiated top-frame Windows request',()=>{
 const handlers={},session={setPermissionCheckHandler:f=>handlers.check=f,setPermissionRequestHandler:f=>handlers.permission=f,setDisplayMediaRequestHandler:f=>handlers.display=f},frame={url:'http://127.0.0.1:38723/'},wc={session,mainFrame:frame},win={webContents:wc,on(){}},ipcMain={handle:(_c,f)=>handlers.ipc=f,removeHandler(){}};let now=10;
 installDesktopAudio({ipcMain,win,url:'http://127.0.0.1:38723',platform:'win32',now:()=>now});const event={sender:wc,senderFrame:frame},request={frame,securityOrigin:'http://127.0.0.1:38723',audioRequested:true,userGesture:true};let granted;
 const ask=r=>handlers.display(r,s=>granted=s);
 ask(request);assert.equal(granted,null);assert.throws(()=>handlers.ipc({...event,senderFrame:{}},'prepare'));
 handlers.ipc(event,'prepare');ask({...request,userGesture:false});assert.equal(granted,null);
 handlers.ipc(event,'prepare');ask({...request,frame:{}});assert.equal(granted,null);
 handlers.ipc(event,'prepare');ask(request);assert.equal(granted.audio,'loopback');assert.equal(granted.video,frame);ask(request);assert.equal(granted,null);
 handlers.ipc(event,'prepare');now+=6000;ask(request);assert.equal(granted,null);
 assert.equal(handlers.check(wc,'media',request.securityOrigin,{isMainFrame:true}),false);
});
test('all kaleidoscope patterns validate, persist through preference normalization and reject unknown modes',()=>{
 for(const [i,m]of KALEIDOSCOPE_MODES.entries()){assert.equal(kaleidoscopeIndex(m.id),i);assert.equal(preferencesWithDefaults({kaleidoscopeMode:m.id}).kaleidoscopeMode,m.id);}
 assert.equal(preferencesWithDefaults({kaleidoscopeMode:'unknown'}).kaleidoscopeMode,'facets');
});


test('failed analysis connection or an ended source does not pause existing local playback',async()=>{
 for(const disconnected of [false,true]){const f=fixture();f.reactor.connect=async()=>{if(disconnected)f.audioTrack.stop();else throw Error('audio context failed');};await assert.rejects(f.capture.start());assert.equal(f.capture.state,'off');assert.equal(f.audio.paused,false);assert.equal(f.reactor.stream,null);assert.equal(f.audioTrack.readyState,'ended');}
});
test('cancelling a pending mode change never opens capture afterward',async()=>{
 const f=fixture();let resolve,requests=0;f.capture.beforeStart=()=>new Promise(r=>resolve=r);f.mediaDevices.getDisplayMedia=async()=>{requests++;return f.stream;};const start=f.capture.start();assert.equal(f.capture.state,'starting');f.capture.stop();resolve();await start;assert.equal(requests,0);assert.equal(f.capture.state,'off');assert.equal(f.audio.paused,false);
});
test('Windows media keys and stale callbacks cannot restart local music during desktop capture',()=>{
 const handlers={},calls=[],session={setActionHandler:(name,fn)=>handlers[name]=fn,setPositionState:()=>calls.push('clearPosition')};
 const media=new LocalMediaSession(session,{play:()=>calls.push('play'),nexttrack:()=>calls.push('next')}),metadata={title:'Local song'};
 media.update({metadata,playing:true});assert.equal(session.playbackState,'playing');const oldPlay=handlers.play;
 media.update({desktop:true,metadata});assert.equal(session.metadata,null);assert.equal(session.playbackState,'none');assert.equal(handlers.play,null);oldPlay();assert.ok(!calls.includes('play'));
 media.update({desktop:true,metadata,playing:false});assert.equal(handlers.nexttrack,null);
 media.update({metadata,playing:false});assert.equal(session.metadata,metadata);assert.equal(session.playbackState,'paused');handlers.play();assert.equal(calls.at(-1),'play');
});

test('microphone joins analysis only; stopping capture or cancelling permission releases every track',async()=>{
 const f=fixture();f.capture.bridge.prepareDesktopMicrophone=async()=>{};f.reactor.setMicrophoneStream=s=>f.reactor.mic=s;
 await f.capture.start();let resolve;f.mediaDevices.getUserMedia=()=>new Promise(r=>resolve=r);
 const micTrack={readyState:'live',stop(){this.readyState='ended';},addEventListener(){}};
 const mic={getAudioTracks:()=>[micTrack],getTracks:()=>[micTrack]};
 const pending=f.capture.microphone(true);await Promise.resolve();f.capture.stop();resolve(mic);await pending;
 assert.equal(micTrack.readyState,'ended');assert.equal(f.reactor.mic,null);
 const g=fixture();g.capture.bridge.prepareDesktopMicrophone=async()=>{};g.reactor.setMicrophoneStream=s=>g.reactor.mic=s;g.mediaDevices.getUserMedia=async()=>{throw Error('denied');};
 await g.capture.start();await assert.rejects(g.capture.microphone(true),/denied/);assert.equal(g.capture.state,'listening');assert.equal(g.audioTrack.readyState,'live');g.capture.stop();
});

test('microphone permission is audio-only, top-frame, short-lived, and requires active desktop listening',()=>{
 const h={},session={setPermissionCheckHandler:f=>h.check=f,setPermissionRequestHandler:f=>h.permission=f,setDisplayMediaRequestHandler:f=>h.display=f},frame={url:'http://127.0.0.1:38723/'},wc={session,mainFrame:frame,getURL:()=>frame.url},win={webContents:wc,on(){}},ipcMain={handle:(_c,f)=>h.ipc=f,removeHandler(){}};let now=100;
 installDesktopAudio({ipcMain,win,url:frame.url,platform:'win32',now:()=>now});const event={sender:wc,senderFrame:frame},origin='http://127.0.0.1:38723';
 assert.throws(()=>h.ipc(event,'prepare-microphone'),/Start desktop/);h.ipc(event,'prepare');h.display({frame,securityOrigin:origin,audioRequested:true,userGesture:true},()=>{});h.ipc(event,'disarm');h.ipc(event,'prepare-microphone');
 assert.equal(h.check(wc,'media',origin,{isMainFrame:true,mediaType:'audio'}),true);assert.equal(h.check(wc,'media',origin,{isMainFrame:true,mediaType:'video'}),false);assert.equal(h.check(wc,'media','https://example.com',{isMainFrame:true,mediaType:'audio'}),false);
 let granted;h.permission(wc,'media',v=>granted=v,{requestingUrl:frame.url,isMainFrame:true,mediaTypes:['video','audio']});assert.equal(granted,false);
 h.permission(wc,'media',v=>granted=v,{requestingUrl:frame.url,isMainFrame:true,mediaTypes:['audio']});assert.equal(granted,true);
 h.permission(wc,'media',v=>granted=v,{requestingUrl:frame.url,isMainFrame:true,mediaTypes:['audio']});assert.equal(granted,false);
 h.ipc(event,'prepare-microphone');now+=6000;assert.equal(h.check(wc,'media',origin,{mediaType:'audio',isMainFrame:true}),false);h.ipc(event,'stop');assert.throws(()=>h.ipc(event,'prepare-microphone'));
});
