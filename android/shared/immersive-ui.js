export function installImmersiveUI({audio,state,icon,safe,togglePlay,nextTrack,queueDialog,soundDialog,openRoom,closeRoom,closeDialog,savePlayer,details}){
  const $=s=>document.querySelector(s),room=$('#listening-room'),library=$('.app-shell');
  // Native hover tooltips stay off, including controls painted later in the library.
  // Preserve a name for icon-only controls before removing a title used as that name.
  function clearButtonTitles(root){
    if(!(root instanceof Element))return;
    const buttons=root.matches('button[title]')?[root]:[...root.querySelectorAll('button[title]')];
    for(const button of buttons){if(!button.hasAttribute('aria-label')&&!button.hasAttribute('aria-labelledby')&&!button.textContent.trim())button.setAttribute('aria-label',button.title);button.removeAttribute('title');}
  }
  clearButtonTitles(document.body);
  new MutationObserver(records=>{for(const record of records){if(record.type==='attributes')clearButtonTitles(record.target);else for(const node of record.addedNodes)clearButtonTitles(node);}}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['title']});
  let libraryFocus=null,coverKey;
  const format=value=>{const n=Math.max(0,Math.floor(value||0));return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
  function libraryOpen(open){
    document.body.classList.toggle('library-open',open);library.inert=!open;
    $('#close-room').setAttribute('aria-expanded',String(open));
    if(open){document.body.classList.remove('visual-settings-open');$('.visual-tools').inert=true;$('#room-visual-settings').setAttribute('aria-expanded','false');libraryFocus=document.activeElement;library.setAttribute('role','dialog');library.setAttribute('aria-modal','true');library.setAttribute('aria-label','Music library');$('#search').focus();}
    else{library.removeAttribute('role');library.removeAttribute('aria-modal');library.removeAttribute('aria-label');if(libraryFocus?.isConnected)libraryFocus.focus();}
  }
  function updatePlay(){
    const playing=!audio.paused;
    for(const id of ['dock-play']){$('#'+id).innerHTML=icon(playing?'pause':'play');$('#'+id).setAttribute('aria-label',playing?'Pause music':'Play music');}
    $('#music-cover-action').innerHTML=icon(playing?'pause':'play');$('#music-cover-play').setAttribute('aria-label',playing?'Pause music':'Play music');

    room.classList.toggle('music-playing',playing);
  }
  function updateTrack(){
    const track=state.current,button=$('#room-library'),key=track?.artwork||'';
    if(key!==coverKey){
      coverKey=key;button.replaceChildren();button.classList.remove('has-cover');button.innerHTML=icon('music');$('#music-only-cover').innerHTML=icon('music');
      if(key){const img=new Image();img.className='dock-cover';img.alt='';img.src='/artwork/'+encodeURIComponent(key);
        img.onload=()=>{if(coverKey===key){button.replaceChildren(img);button.classList.add('has-cover');$('#music-only-cover').replaceChildren(img.cloneNode());}};
        img.onerror=()=>{if(coverKey===key){button.classList.remove('has-cover');button.innerHTML=icon('music');}};
      }
    }
    button.title=track?`${track.title} · Song details`:'Open library · L';button.setAttribute('aria-label',track?`Details for ${track.title}`:'Open music library');button.removeAttribute('aria-expanded');
    $('#dock-title').textContent=state.current?.title||'Find your frequency';
    $('#dock-artist').textContent=state.current?.artist||state.current?.channel||'Open your library to begin';
    $('#music-only-title').textContent=$('#dock-title').textContent;$('#music-only-artist').textContent=$('#dock-artist').textContent;
    $('#room-favorite').setAttribute('aria-pressed',String(!!state.current?.favorite));
    $('#room-favorite').setAttribute('aria-label',state.current?.favorite?'Unfavorite current track':'Favorite current track');
    $('#room-shuffle').setAttribute('aria-pressed',String(state.shuffle));
    $('#room-repeat').setAttribute('aria-label',`Repeat: ${['off','queue','one song'][state.repeat]}`);$('#room-repeat').setAttribute('aria-pressed',String(state.repeat>0));
  }
  function updateTime(){
    const total=Number.isFinite(audio.duration)?audio.duration:state.current?.duration||0;
    $('#room-seek').max=total||100;$('#room-seek').value=audio.currentTime;
    $('#room-seek').style.setProperty('--progress',`${total?audio.currentTime/total*100:0}%`);
    $('#room-elapsed').textContent=format(audio.currentTime);$('#room-duration').textContent=format(total);
  }
  $('#room-library').onclick=()=>state.current?details(state.current.id):closeRoom();$('#close-library').onclick=openRoom;
  $('#room-queue').onclick=queueDialog;$('#dock-play').onclick=safe(togglePlay);
  $('#room-previous').onclick=safe(()=>nextTrack(-1));$('#room-next').onclick=safe(()=>nextTrack());
  $('#room-favorite').onclick=()=>$('#now-favorite').click();
  $('#room-shuffle').onclick=()=>{$('#shuffle').click();updateTrack();};$('#room-repeat').onclick=()=>{$('#repeat').click();updateTrack();};
  $('#room-visual-settings').onclick=()=>{
    const open=!document.body.classList.contains('visual-settings-open');document.body.classList.toggle('visual-settings-open',open);
    $('#room-visual-settings').setAttribute('aria-expanded',String(open));$('.visual-tools').inert=!open;if(open)$('[data-preference=autoDirection]').focus();
  };
  $('#room-seek').oninput=e=>{if(Number.isFinite(audio.duration))audio.currentTime=Math.min(audio.duration,Math.max(0,Number(e.target.value)));};
  audio.addEventListener('play',updatePlay);audio.addEventListener('pause',updatePlay);
  audio.addEventListener('timeupdate',updateTime);audio.addEventListener('loadedmetadata',updateTime);
  $('#dialog').addEventListener('close',()=>{$('#dialog').removeAttribute('data-panel');state.dialog='';});
  document.addEventListener('keydown',e=>{
    if(room.hidden||e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey)return;
    if(document.body.classList.contains('library-open')&&!$('#dialog').open){
      if(e.key==='Tab'){
        const focusable=[...library.querySelectorAll('button:not(:disabled),a[href],input,select,[tabindex="0"]')].filter(el=>el.getClientRects().length);
        if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }return;
    }
    if(['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
    if(e.key.toLowerCase()==='q'){e.preventDefault();if($('#dialog').open&&state.dialog==='The next chapter')closeDialog();else if(!$('#dialog').open)queueDialog();}
    if(e.key.toLowerCase()==='l'&&!$('#dialog').open){e.preventDefault();closeRoom();}
  });
  $('.visual-tools').inert=true;updatePlay();updateTrack();updateTime();
  return {libraryOpen,updateTrack};
}
