// Test-only loopback substitute. A silent oscillator tests app source switching
// in the browser; native loopback is verified independently. Never shipped.
window.resonanceDesktop={prepareDesktopAudio:async()=>{},stopDesktopAudio:async()=>{},windowState:async()=>({fullscreen:false}),onWindowState(){},toggleFullscreen:async()=>({fullscreen:false})};
navigator.mediaDevices.getDisplayMedia=async()=>{
 const context=new AudioContext(),tone=context.createOscillator(),destination=context.createMediaStreamDestination();tone.frequency.value=110;tone.connect(destination);tone.start();
 const track=destination.stream.getAudioTracks()[0],stop=track.stop.bind(track);track.stop=()=>{if(track.readyState==='ended')return;stop();tone.stop();void context.close();};return destination.stream;
};
