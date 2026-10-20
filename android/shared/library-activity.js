// One activity surface; checks start only from explicit user actions.
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
  ['genres','Genre discovery','Find missing or suggested genres.'],
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
  if(j.message&&!running)detail=j.message;
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
 let status={},overrides={},actions={};const pending=new Set(),entries=new Map();
 const returnFocus=()=>{const fallback=document.querySelector('dialog[open] [data-action=close-dialog],dialog[open] #sheet-close,.room-global #room-sound,.room-top #settings,.topbar button');(button.hidden?fallback:button)?.focus({preventScroll:true});};
 // One fixed home in the main controls. Dialogs retain their own focus and layout.
 function render(){
  const rows=activityRows({...status,...Object.fromEntries(Object.entries(overrides).filter(([key,value])=>value?.running||!status[key]?.running))},Object.fromEntries(requests)),busy=rows.filter(r=>r.running).length;
  const focused=document.activeElement===button;button.hidden=!busy;home.hidden=!busy;button.classList.toggle('is-working',busy>0);if(focused&&!busy)returnFocus();
  button.setAttribute('aria-label',busy?`Library activity · ${busy} tasks running`:'Library activity');
  button.title=busy?`Library activity · ${busy} ${busy===1?'task':'tasks'} running`:'Library activity';
  const summary=busy?`${busy} ${busy===1?'task is':'tasks are'} running in the background.`:'No background tasks are running.';
  const message=panel.querySelector('.activity-summary');if(message.textContent!==summary)message.textContent=summary;
  const root=panel.querySelector('.activity-rows');
  for(const row of rows){
   let entry=entries.get(row.key);
   if(!entry){
    const section=document.createElement('div');section.className='activity-row';
    const head=document.createElement('div');head.className='activity-row-head';
    const title=document.createElement('h3');title.textContent=row.label;
    const action=document.createElement('button');action.type='button';action.dataset.activityRun=row.key;
    const detail=document.createElement('p'),bar=document.createElement('progress');bar.max=1;bar.setAttribute('aria-label',row.label);
    head.append(title,action);section.append(head,detail,bar);root.append(section);
    entry={section,detail,bar,action};entries.set(row.key,entry);
   }
   const {section,detail,bar,action}=entry,spec=actions[row.key]?.();
   section.classList.toggle('is-working',row.running);detail.textContent=row.detail;
   bar.hidden=!row.running;if(row.progress!==null)bar.value=row.progress;else bar.removeAttribute('value');
   action.hidden=!spec;action.textContent=pending.has(row.key)?'Starting…':spec?.label||'';
   action.disabled=!!(pending.has(row.key)||spec?.disabled||row.running&&!spec?.whileRunning);

  }
 }
 const notice=document.createElement('p');notice.className='activity-action-notice';notice.setAttribute('role','status');notice.hidden=true;panel.querySelector('.activity-summary').after(notice);
 panel.addEventListener('click',async e=>{
  const key=e.target.closest('[data-activity-run]')?.dataset.activityRun,spec=actions[key]?.();if(!spec||pending.has(key)||e.target.closest('button').disabled)return;
  pending.add(key);notice.hidden=true;render();
  try{const result=await spec.run();if(typeof result==='string'){notice.textContent=result;notice.hidden=false;}}
  catch(error){notice.textContent=error.message||'This check could not start. Try again.';notice.hidden=false;}
  finally{pending.delete(key);render();}
 });
 function open(){render();if(!panel.matches(':popover-open'))panel.showPopover();panel.querySelector('[data-activity-close]').focus({preventScroll:true});}
 button.onclick=()=>{if(panel.matches(':popover-open'))panel.hidePopover();else{panel.showPopover();}};
 panel.querySelector('[data-activity-close]').onclick=()=>{panel.hidePopover();returnFocus();};
 panel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();panel.hidePopover();returnFocus();}});
 panel.addEventListener('toggle',()=>button.setAttribute('aria-expanded',String(panel.matches(':popover-open'))));
 listeners.add(render);render();
 return {open,close(){if(panel.matches(':popover-open'))panel.hidePopover();},configure(value){actions=value;render();},update(value){status=value||{};render();},set(key,value){if(value==null)delete overrides[key];else overrides={...overrides,[key]:value};render();}};
}

// One file at a time. Playback's priority request can interrupt this work;
// Android checks charging natively on every file and stops when backgrounded.
export function soundPreparation({tracks,load,analyze,profile,update,active=()=>true,wait=ms=>new Promise(r=>setTimeout(r,ms))}){
 let running=false,epoch=0;
 return {get running(){return running;},toggle(){
  if(running){running=false;++epoch;update(null);return 'Preparation paused. The current file may finish saving.';}
  running=true;const token=++epoch;update({running:true,done:0,total:0});
  void (async()=>{
   let done=0,total=0,errors=0;
   try{
    const saved=await load();if(token!==epoch)return;if(saved.canPrepare===false)throw Error('Connect a charger to prepare sound data.');
    const remaining=tracks().filter(t=>t.available!==false&&!saved.profiles?.[t.id]&&!saved.failed?.includes(t.id));total=remaining.length;
    for(const t of remaining){
     if(token!==epoch||!active())break;update({running:true,done,total,errors});
     let value=await analyze(t.id),polls=0;
     while(token===epoch&&active()&&!value.profile&&!value.error&&value.job?.running&&polls++<240){await wait(2000);if(token!==epoch||!active())break;value=await profile(t.id);}
     if(token!==epoch)return;if(!active())break;
     if(!value.profile&&!value.error)throw Error('Preparation paused; another song needed analysis. Resume whenever you like.');
     if(value.error)errors++;done++;
    }
   }catch(error){errors++;if(token===epoch)update({running:false,done,total,errors,message:error.message});return;}
   finally{if(token===epoch)running=false;}
   if(token===epoch)update({running:false,done,total,errors});
  })();
  return 'Preparing missing sound data, one song at a time.';
 }};
}
