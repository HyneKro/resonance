const clamp=(x,min=0,max=1)=>Math.max(min,Math.min(max,x));
export function wheelVolume(value,{deltaY,deltaMode=0,shiftKey=false},quantize=true){
  const pixels=deltaY*(deltaMode===1?16:deltaMode===2?300:1);
  const next=clamp(value-clamp(pixels,-180,180)*(shiftKey?.00004:.0002));
  return quantize?Math.round(next*1000)/1000:next;
}
export function swipeDirection(dx,dy){return Math.abs(dx)>=72&&Math.abs(dx)>Math.abs(dy)*1.5?Math.sign(dx):0;}
export function gestureAxis(dx,dy){if(Math.hypot(dx,dy)<22)return '';return Math.abs(dx)>Math.abs(dy)*1.35?'x':Math.abs(dy)>Math.abs(dx)*1.35?'y':'';}
export function seekPosition(start,dy,duration,fine=false){if(!Number.isFinite(duration)||duration<=0||!Number.isFinite(start)||!Number.isFinite(dy))return null;const distance=Math.sign(dy)*Math.max(0,Math.abs(dy)-22);return clamp(start-distance*(fine?.07:.35),0,Math.max(0,duration-.05));}
export function gestureSurface(target){return !target.closest('.constellation,button:not(.dance-companion),input,select,textarea,summary,a,dialog,.wallpaper-options,.artwork-credits,.room-dock,.desktop-audio-dock,.room-top,.visual-tools,.app-shell,#desktop-titlebar');}

export function installListeningControls({isDesktop=()=>false,audio,savePlayer,nextTrack,safe,libraryOpen,icon}){
  const $=s=>document.querySelector(s),room=$('#listening-room'),popup=$('#volume-panel'),opener=$('#volume-details'),number=$('#volume-exact'),hud=$('#gesture-hud');
  const sliders=[$('#volume'),$('#room-volume'),$('#precise-volume')];let lastNonzero=audio.volume||.7,saveTimer,hudTimer,drag=null;
  const percent=()=>Math.round(audio.volume*1000)/10;
  function save(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>void savePlayer(),180);}
  function showHUD(label,value){clearTimeout(hudTimer);hud.hidden=false;$('#gesture-label').textContent=label;$('#gesture-level').style.width=`${clamp(value)*100}%`;hudTimer=setTimeout(()=>hud.hidden=true,1200);}
  function sync(){
    const v=audio.muted?0:audio.volume;if(v>0)lastNonzero=v;
    for(const el of sliders){el.value=v;el.style.setProperty('--progress',`${v*100}%`);el.setAttribute('aria-valuetext',`${Math.round(v*1000)/10} percent`);}
    $('#volume-percent').textContent=`${Math.round(v*100)}%`;opener.setAttribute('aria-label',`Volume ${Math.round(v*1000)/10} percent · fine adjustment`);
    if(document.activeElement!==number)number.value=Math.round(v*1000)/10;
    $('#volume-mute').setAttribute('aria-label',v>0?'Mute music':'Unmute music');$('#volume-mute').setAttribute('aria-pressed',String(v===0));
    $('#volume-mute').innerHTML=icon('volume')+(v===0?'<span class="mute-slash" aria-hidden="true"></span>':'');
  }
  function setVolume(value,feedback=false){if(!Number.isFinite(value))return;audio.muted=false;audio.volume=clamp(Math.round(value*1000)/1000);sync();save();if(feedback)showHUD(`Volume · ${percent()}%`,audio.volume);}
  function closeVolume(focus=false){popup.hidden=true;opener.setAttribute('aria-expanded','false');if(focus)opener.focus();}
  opener.onclick=()=>{const open=popup.hidden;popup.hidden=!open;opener.setAttribute('aria-expanded',String(open));if(open){number.value=percent();$('#precise-volume').focus();}};
  $('#volume-mute').onclick=()=>setVolume(audio.muted||audio.volume===0?lastNonzero:0);
  for(const el of sliders)el.oninput=()=>setVolume(Number(el.value));
  const commit=()=>{if(number.value.trim()!==''&&Number.isFinite(number.valueAsNumber))setVolume(number.valueAsNumber/100);number.value=percent();};
  number.addEventListener('change',commit);number.addEventListener('blur',commit);
  number.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();commit();number.select();}});
  for(const [id,delta]of [['volume-down',-.01],['volume-up',.01]])$("#"+id).onclick=()=>{setVolume(audio.volume+delta);number.value=percent();};
  audio.addEventListener('volumechange',sync);sync();
  const settingsClose=()=>{document.body.classList.remove('visual-settings-open');$('.visual-tools').inert=true;$('#room-visual-settings').setAttribute('aria-expanded','false');};
  document.addEventListener('click',e=>{
    if(!popup.hidden&&!e.target.closest('.volume-control'))closeVolume();
    if(document.querySelector('dialog[open]')||e.target.closest('.dance-companion'))return;
    let dismissed=false;
    if(document.body.classList.contains('library-open')&&!e.target.closest('.app-shell')){libraryOpen(false);dismissed=true;}
    if(document.body.classList.contains('visual-settings-open')&&!e.target.closest('.visual-tools,#room-visual-settings')){settingsClose();dismissed=true;}
    // The dismissing click must not also press play, skip a song or reopen an overlay.
    if(dismissed){e.preventDefault();e.stopImmediatePropagation();}
  },true);
  const background=(target,allowSettings=false)=>!room.hidden&&!$('#dialog').open&&!document.body.classList.contains('library-open')&&(allowSettings||!document.body.classList.contains('visual-settings-open'))&&gestureSurface(target)&&room.contains(target);
  let wheelLevel=audio.volume,lastWheel=0;
  room.addEventListener('wheel',e=>{
    if(!background(e.target,true)||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY))return;e.preventDefault();
    if(isDesktop()){showHUD('Desktop volume · adjust in the source app or Windows',1);return;}
    const now=performance.now(),level=audio.muted?0:audio.volume;
    if(now-lastWheel>350||Math.abs(level-wheelLevel)>.00051)wheelLevel=level;
    wheelLevel=wheelVolume(wheelLevel,e,false);lastWheel=now;setVolume(wheelLevel,true);
  },{passive:false});
  function cancel(){if(drag){const id=drag.id;drag=null;if(room.hasPointerCapture(id))room.releasePointerCapture(id);hud.hidden=true;}}
  let cancelledByChord=false;
  const cancelChord=e=>{if(!drag)return;e.preventDefault();e.stopPropagation();cancelledByChord=true;cancel();showHUD('Gesture cancelled',0);};
  // A second mouse button produces mousedown/pointermove, not always pointerdown.
  room.addEventListener('mousedown',e=>{if(e.button===0)cancelChord(e);},true);
  room.addEventListener('click',e=>{if(cancelledByChord){e.preventDefault();e.stopImmediatePropagation();cancelledByChord=false;}},true);
  window.addEventListener('mouseup',e=>{if(e.buttons===0)setTimeout(()=>cancelledByChord=false,0);});
  const timeText=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  room.addEventListener('pointerdown',e=>{if(e.button!==2||!background(e.target,true))return;e.preventDefault();if(isDesktop()){showHUD('Desktop playback · control it in its app',1);return;}drag={id:e.pointerId,x:e.clientX,y:e.clientY,axis:'',start:audio.currentTime,src:audio.currentSrc};room.setPointerCapture(e.pointerId);});
  room.addEventListener('pointermove',e=>{if(isDesktop()){cancel();return;}if(!drag||e.pointerId!==drag.id)return;if(e.buttons&1){cancelChord(e);return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.axis||=gestureAxis(dx,dy);if(drag.axis==='y'){const target=seekPosition(drag.start,dy,audio.duration,e.shiftKey);if(target!==null)showHUD(`Release to seek · ${timeText(target)} / ${timeText(audio.duration)}`,target/audio.duration);}else if(Math.hypot(dx,dy)>14)showHUD(swipeDirection(dx,dy)?dx>0?'Release → next track':'Release ← previous track':'Slide left / right to skip · up / down to seek',Math.abs(dx)/72);});
  room.addEventListener('pointerup',e=>{if(isDesktop()){cancel();return;}if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y,axis=drag.axis||gestureAxis(dx,dy),same=drag.src===audio.currentSrc,target=axis==='y'?seekPosition(drag.start,dy,audio.duration,e.shiftKey):null,direction=axis==='x'?swipeDirection(dx,dy):0;cancel();if(!same)return;if(target!==null){audio.currentTime=target;save();showHUD(`Seek · ${timeText(target)}`,target/audio.duration);}else if(direction){showHUD(direction>0?'Next track →':'← Previous track',1);void safe(()=>nextTrack(direction,false,true))();}});
  room.addEventListener('pointercancel',cancel);room.addEventListener('lostpointercapture',cancel);window.addEventListener('blur',cancel);
  room.addEventListener('contextmenu',e=>{if(drag||cancelledByChord||background(e.target,true))e.preventDefault();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();if(!popup.hidden){e.preventDefault();closeVolume(true);}}},true);
  return {setVolume,closeVolume,sync};
}
