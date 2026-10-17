// Test-only loopback substitute. A silent oscillator tests app source switching
// in the browser; native loopback is verified independently. Never shipped.
window.resonanceDesktop={installUpdate:async()=>({cancelled:true}),appUpdate:async action=>({current:'1.3.0',phase:location.hash.includes('update-ready')?'ready':'idle',canInstall:true,release:location.hash.includes('update-ready')?{version:'9.9.9',notes:'Test-only update'}:null,message:action==='check'?'You have the latest version.':'Updates are checked automatically.',autoCheck:true,autoDownload:true}),prepareDesktopAudio:async()=>{},disarmDesktopAudio:async()=>{},prepareDesktopMicrophone:async()=>{},cancelDesktopMicrophone:async()=>{},stopDesktopAudio:async()=>{},windowState:async()=>({fullscreen:false}),onWindowState(){},toggleFullscreen:async()=>({fullscreen:false})};
navigator.mediaDevices.getDisplayMedia=async()=>{
 const context=new AudioContext(),tone=context.createOscillator(),destination=context.createMediaStreamDestination();tone.frequency.value=110;tone.connect(destination);tone.start();
 const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);track.stop=()=>{if(track.readyState==='ended')return;stop();tone.stop();void context.close();};return destination.stream;
};

// A synthetic input exercises microphone lifecycle without accessing a device.
navigator.mediaDevices.getUserMedia=async()=>navigator.mediaDevices.getDisplayMedia();
