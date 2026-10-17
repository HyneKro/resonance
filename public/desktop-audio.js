// No recorder, upload, or monitor output: the stream is used only for analysis.
export class DesktopAudio{
 constructor({reactor,audio,bridge,mediaDevices,beforeStart=async()=>{},onChange=()=>{}}){Object.assign(this,{reactor,audio,bridge,mediaDevices,beforeStart,onChange});this.state='off';this.generation=0;}
 publish(state){this.state=state;this.onChange(state);}
 async start(){
  if(this.state!=='off')return;
  if(!this.bridge?.prepareDesktopAudio||!this.mediaDevices?.getDisplayMedia)throw Error('Open the Windows Resonance app to listen to desktop audio.');
  const generation=++this.generation;let stream;
  this.publish('starting');
  try{
   await this.beforeStart();if(generation!==this.generation)return;
   await this.bridge.prepareDesktopAudio();if(generation!==this.generation)return;
   stream=await this.mediaDevices.getDisplayMedia({video:{frameRate:1,width:16,height:16},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},systemAudio:'include',selfBrowserSurface:'include'});
   // Chromium requires a video track to start capture. Release it immediately.
   for(const track of stream.getVideoTracks())track.stop();
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   if(!stream.getAudioTracks().some(t=>t.readyState==='live'))throw Error('No desktop sound source was available. Check your Windows output device and try again.');
   this.stream=stream;await this.reactor.connect();
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   if(!stream.getAudioTracks().some(t=>t.readyState==='live'))throw Error('Desktop audio disconnected before it was ready. Try listening again.');
   this.reactor.setDesktopStream(stream);this.audio.pause();
   for(const track of stream.getAudioTracks())track.addEventListener('ended',()=>{if(this.stream===stream)this.stop();},{once:true});
   this.publish('listening');
  }catch(error){stream?.getTracks().forEach(t=>t.stop());if(generation===this.generation){this.stop();throw error;}}
  finally{if(generation===this.generation)void this.bridge.stopDesktopAudio?.().catch(()=>{});}
 }
 stop(){++this.generation;const stream=this.stream;this.stream=null;stream?.getTracks().forEach(t=>t.stop());this.reactor.setDesktopStream(null);if(this.state!=='off')this.publish('off');void this.bridge?.stopDesktopAudio?.().catch(()=>{});}
}

// Yield Windows media keys to the app actually playing desktop audio. A stale
// callback is also guarded, so an in-flight media key cannot restart the queue.
export class LocalMediaSession{
 constructor(session,handlers){this.session=session;this.handlers=handlers;this.desktop=null;}
 update({desktop=false,metadata=null,playing=false}){
  if(!this.session)return;
  if(desktop!==this.desktop){this.desktop=desktop;for(const [action,handler] of Object.entries(this.handlers))try{this.session.setActionHandler(action,desktop?null:(...args)=>{if(!this.desktop)return handler(...args);});}catch{}}
  this.session.metadata=desktop?null:metadata;
  this.session.playbackState=desktop?'none':playing?'playing':'paused';
  if(desktop)try{this.session.setPositionState?.();}catch{}
 }
}
