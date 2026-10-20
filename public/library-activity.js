// Read existing work only: this panel never starts scans or network lookups.
const requests=new Map(),listeners=new Set();
const requestKinds={
 lyricsRequest:'lyrics',lyricsSearch:'lyrics',research:'enrich',researchGenres:'genres',
 '/api/track-lyrics':'lyrics','/api/lyrics/search':'lyrics','/api/research/track':'enrich','/api/genres/track':'genres',
};
export function beginActivity(action){
 const key=requestKinds[action.split('?')[0]];if(!key)return ()=>{};
 const row=requests.get(key)||{active:0,done:0,errors:0};
 row.active++;requests.set(key,row);for(const fn of listeners)fn();
 let finished=false;
 return error=>{if(finished)return;finished=true;row.active=Math.max(0,row.active-1);row.done++;if(error)row.errors++;for(const fn of listeners)fn();};
}
const count=v=>Math.max(0,Number(v)||0);
export function activityRows(status={},local={}){
 const definitions=[
  ['scan','Music folders','Scans run when folders are connected or refreshed.'],
  ['sync','Playlist downloads','Choose songs in Playlist downloads to start.'],
  ['enrich','Artists & releases','Looks up missing details when requested.'],
  ['genres','Genre discovery','Run discovery in Library & downloads.'],
  ['covers','Cover artwork','Prepared as music is added.'],
  ['analysis','Sound preparation','Loudness and silent edges are measured locally.'],
  ['character','Track character','Sound details are prepared gradually.'],
  ['lyrics','Lyrics','Checked for selected songs, not the entire library at once.'],
 ];
 return definitions.map(([key,label,idle])=>{
  const j=status[key]||(key==='sync'?status.downloads:null)||{},r=local[key]||{};
  const running=!!(j.running||r.active),errors=Array.isArray(j.errors)?j.errors.length:count(j.errors)+(j.error?1:0);
  const total=count(j.total),done=count(key==='character'?j.searched:j.processed??j.done),hasCount=total>0;
  const progress=hasCount?Math.min(1,done/total):running&&key==='analysis'&&Number.isFinite(j.progress)?Math.max(0,Math.min(1,j.progress)):null;
  let detail=idle;
  if(running){
   detail=hasCount?`${Math.min(done,total)} / ${total} checked · ${Math.max(0,total-done)} remaining`:key==='scan'?`${count(j.found)} files found · scanning…`:key==='analysis'?'Measuring the current file…':key==='lyrics'?'Checking the selected song…':'Working…';
   if(key==='sync')detail=(j.phase==='checking'?'Checking playlist contents · ':'Downloading · ')+detail;
  }else if(hasCount)detail=`${done} / ${total} checked${done<total?' · paused or stopped':' · finished'}`;
  else if(r.done)detail=`${r.done} ${key==='lyrics'?'song checks':'lookups'} this session${r.errors?' · '+r.errors+' could not complete':''}`;
  else if(j.found>0)detail=`${j.found} files found`;
  if(errors)detail+=` · ${errors} ${key==='sync'?'unavailable or failed':'could not complete'}`;
  return {key,label,detail,running,progress,errors:errors+count(r.errors)};
 });
}
export function installLibraryActivity(){
 const button=document.createElement('button');button.type='button';button.className='library-activity-button';
 button.setAttribute('aria-label','Library activity');button.setAttribute('aria-expanded','false');
 button.hidden=true;button.title='Library activity';
 button.innerHTML='<svg class="activity-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8" opacity=".18"/><path d="M12 4a8 8 0 0 1 8 8"/><path d="M12 9v6m-3-4v2m6-2v2"/></svg>';
 const panel=document.createElement('section');panel.id='library-activity-panel';panel.className='library-activity-panel';panel.setAttribute('popover','auto');panel.setAttribute('aria-label','Library activity');
 button.setAttribute('aria-controls',panel.id);
 panel.innerHTML='<header><div><span class="activity-eyebrow">YOUR LIBRARY, TAKING SHAPE</span><h2>Library activity</h2></div><button type="button" data-activity-close aria-label="Close library activity">×</button></header><p class="activity-summary" role="status" aria-live="polite"></p><div class="activity-rows"></div><p class="activity-note">You can keep listening. Counts describe the work currently requested; some songs may have no matching metadata or lyrics. Lyrics are checked when you select a song.</p>';
 const home=document.createElement('span');home.className='library-activity-home';
 const initial=document.querySelector('.room-global')||document.querySelector('.room-top');initial?.append(home);home.append(button);document.body.append(panel);
 let status={},overrides={},signature='';
 const returnFocus=()=>{const fallback=document.querySelector('dialog[open] [data-action=close-dialog],dialog[open] #sheet-close,.room-global #room-sound,.room-top #settings,.topbar button');(button.hidden?fallback:button)?.focus({preventScroll:true});};
 function host(){
  const modal=[...document.querySelectorAll('dialog[open]')].find(n=>n.matches(':modal'));
  return modal?.querySelector('.dialog-heading,.dialog-header,.sheet-head,header')||modal||null;
 }
 function place(){
  const modal=host(),library=document.querySelector('.topbar'),parent=modal||((document.body.classList.contains('library-open')||!document.body.classList.contains('in-room'))&&library?library:home);if(button.parentElement!==parent)parent.append(button);
  if(button.classList.contains('activity-in-dialog')!==!!modal)button.classList.toggle('activity-in-dialog',!!modal);
  if(!panel.matches(':popover-open')&&panel.parentElement!==(modal||document.body))(modal||document.body).append(panel);
 }
 new MutationObserver(place).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
 new MutationObserver(place).observe(document.body,{attributes:true,attributeFilter:['class']});
 function render(){
  const rows=activityRows({...status,...overrides},Object.fromEntries(requests)),busy=rows.filter(r=>r.running).length;
  const focused=document.activeElement===button;button.hidden=!busy;home.hidden=!busy;button.classList.toggle('is-working',busy>0);if(focused&&!busy)returnFocus();
  button.setAttribute('aria-label',busy?`Library activity · ${busy} tasks running`:'Library activity');
  button.title=busy?`Library activity · ${busy} ${busy===1?'task':'tasks'} running`:'Library activity';
  const summary=busy?`${busy} ${busy===1?'task is':'tasks are'} running in the background.`:'No background tasks are running.';
  const message=panel.querySelector('.activity-summary');if(message.textContent!==summary)message.textContent=summary;
  const key=JSON.stringify(rows);if(signature===key)return;signature=key;
  const root=panel.querySelector('.activity-rows');root.replaceChildren();
  for(const row of rows){
   const section=document.createElement('div');section.className='activity-row';section.classList.toggle('is-working',row.running);
   const title=document.createElement('h3');title.textContent=row.label;
   const detail=document.createElement('p');detail.textContent=row.detail;section.append(title,detail);
   if(row.running){const bar=document.createElement('progress');bar.max=1;if(row.progress!==null)bar.value=row.progress;bar.setAttribute('aria-label',row.label);section.append(bar);}
   root.append(section);
  }
 }
 button.onclick=()=>{place();if(panel.matches(':popover-open'))panel.hidePopover();else{panel.showPopover();}};
 panel.querySelector('[data-activity-close]').onclick=()=>{panel.hidePopover();returnFocus();};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.hidePopover();returnFocus();}});
 panel.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
 listeners.add(render);place();render();
 return {update(value){status=value||{};render();},set(key,value){overrides={...overrides,[key]:value};render();}};
}
