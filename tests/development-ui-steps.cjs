module.exports=async({run,click,shot,until,win,mobile=false})=>{
 const assert=require('node:assert/strict');
 const openSettings=()=>click(mobile?'#settings':'#room-sound');
 const close=()=>click(mobile?'#sheet-close':'#dialog [data-action=close-dialog]');
 await until("document.querySelector('.library-activity-button').hidden");
 await run("(async()=>{const {beginActivity}=await import('/library-activity.js');window.finishProbeActivity=beginActivity('lyricsRequest');})()");
 assert.ok(await run("document.querySelector('.library-activity-button').getBoundingClientRect().width<=40"),'Activity remains a subtle icon');
 assert.equal(await run("document.querySelector('.library-activity-button').textContent"),'');
 await click('.library-activity-button');
 assert.ok(await run(`document.querySelector('#library-activity-panel').matches(':popover-open')`));
 await shot((mobile?'phone':'pc')+'-activity');
 await run("finishProbeActivity()");
 await until("document.querySelector('.library-activity-button').hidden");
 assert.ok(await run("document.querySelector('#library-activity-panel').matches(':popover-open')"),'Completion does not dismiss a panel being read');
 await click('[data-activity-close]');
 await openSettings();await click('[data-settings-page=accessibility]');
 await run("(async()=>{const {beginActivity}=await import('/library-activity.js');window.finishProbeActivity=beginActivity('lyricsRequest');})()");
 assert.ok(await run("document.querySelector('.library-activity-button').parentElement.classList.contains('library-activity-home')"),'Activity keeps its main-screen home');
 assert.equal(await run("document.querySelectorAll('dialog .library-activity-button').length"),0,'No activity icon in submenus');
 await run('finishProbeActivity()');
 if(!mobile){
  await run(`(async()=>{const {createNotifier}=await import('/menu-kit.js');const notice=createNotifier(document.querySelector('#toasts'),{host:()=>document.querySelector('#dialog'),duration:1500});notice('A readable notification');notice('   ');})()`);
  await shot('pc-dialog-notification');
  assert.ok(await run(`(()=>{const t=[...document.querySelectorAll('.toast')].find(n=>n.textContent==='A readable notification'),r=t.getBoundingClientRect(),d=document.querySelector('#dialog').getBoundingClientRect();return t.textContent==='A readable notification'&&r.left>=d.left&&r.right<=d.right;})()`),'Notification text remains inside the dialog');
 }
 const attr=mobile?'data-pref':'data-preference';
 await run(`(()=>{const s=document.querySelector('[${attr}=textSize]');s.value='large';s.dispatchEvent(new Event('${mobile?'input':'change'}',{bubbles:true}));})()`);
 await until(`document.documentElement.dataset.textSize==='large'`);
 await shot((mobile?'phone':'pc')+'-large-accessibility');
 win.webContents.sendInputEvent({type:'keyDown',keyCode:'Tab'});win.webContents.sendInputEvent({type:'keyUp',keyCode:'Tab'});
 assert.ok(await run(`!!document.activeElement.closest('dialog[open]')`),'Keyboard focus remains inside the settings dialog');
 await close();
 if(mobile)await click('#library');else await click('#close-room');
 await click(mobile?'[data-smart-open]':'[data-view=smart]');assert.equal(await run("document.querySelectorAll('[data-smart-view]').length"),8);await click('.collection-create summary');await click('[data-smart-template=unheard]');
 await shot((mobile?'phone':'pc')+'-smart-editor');
 await run(`document.querySelector('[data-smart-form] [name=name]').value='Development collection';document.querySelector('[data-smart-form]').requestSubmit()`);
 await until(`!!document.querySelector('[data-smart-edit]')`);await shot((mobile?'phone':'pc')+'-smart-collections');
 await click('[data-smart-edit]');await run(`(()=>{const e=document.querySelector('[data-smart-form] [name=artist]');e.value='Artist who does not exist';e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
 assert.ok(await run(`document.querySelector('[data-smart-preview-play]').disabled`),'No-match preview cannot play an unrelated queue');
 if(mobile)await close();else await click('#close-library');
 await openSettings();await click('[data-settings-page=transfer]');await until(`!!document.querySelector('[data-transfer-import]')`);await shot((mobile?'phone':'pc')+'-transfer');
 if(!mobile){
  await run(`(async()=>{const snap=await(await fetch('/api/transfer')).json(),mod=await import('/portable-settings.js'),t=snap.tracks[0];window.transferFixture=mod.exportPortable({preferences:{textSize:'large'},sources:[],tracks:[{...t,album:'Imported fixture album',metadataLocks:{album:true}}]});const original=HTMLInputElement.prototype.click;HTMLInputElement.prototype.click=function(){if(this.type==='file'){HTMLInputElement.prototype.click=original;Object.defineProperty(this,'files',{value:[new File([JSON.stringify(window.transferFixture)],'settings.json',{type:'application/json'})]});this.onchange();}else original.call(this);};})()`);
  await click('[data-transfer-import]');await until(`!!document.querySelector('[data-transfer-apply]')`);
  await shot('pc-import-preview');await click('[data-transfer-apply]');await until(`!!document.querySelector('[data-transfer-export]')`);
  assert.ok(await run(`document.querySelector('[data-transfer-status]').textContent.includes('kept for later')`),'Import reports conflicts and preserves them for review');
 }
 await close();await openSettings();await click('[data-settings-page=accessibility]');
 await run(`(()=>{const s=document.querySelector('[${attr}=textSize]');s.value='standard';s.dispatchEvent(new Event('${mobile?'input':'change'}',{bubbles:true}));})()`);
 await close();
 if(!mobile){
  await click('[data-listening-mode=music]');
  await run(`document.querySelector('#room-sound').dispatchEvent(new PointerEvent('pointermove',{bubbles:true,clientX:innerWidth-15,clientY:40,pointerType:'mouse'}))`);
  await until(`getComputedStyle(document.querySelector('.edition-frame')).animationPlayState==='running'`);
  assert.equal(await run(`document.querySelector('#music-cover-play').tagName`),'DIV');
  assert.equal(await run(`document.querySelectorAll('.edition-ledger dd').length`),3);
  await shot('pc-music-history');
  await click('[data-listening-mode=visualizer]');
 }
};
