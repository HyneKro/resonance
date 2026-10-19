// Runs in the isolated PC and Android browser fixtures, using their real shared modules.
module.exports=async function menuBehaviors(){
 const {rememberPanel,createNotifier,runAction,capturePanel}=await import('/menu-kit.js');
 const {paintMapMarkers}=await import('/constellation-navigation.js');
 const checks=[],check=(name,pass)=>{checks.push({name,pass:!!pass});if(!pass)throw Error(name);};
 const root=document.createElement('div');root.style.cssText='position:fixed;inset:20px;z-index:999999;background:#17131e;overflow:auto;height:200px';document.body.append(root);
 const markup=value=>`<form id="probe-form"><input name="title" value="Original"><input name="album" value="${value}"><button type="submit">Save</button></form><div style="height:1000px"></div>`;
 try{
  root.innerHTML=markup('Old album');const title=root.querySelector('[name=title]');title.value='An unfinished correction';title.focus();title.setSelectionRange(3,10);root.scrollTop=123;
  const restore=rememberPanel(root);root.innerHTML=markup('New researched album');restore();
  check('Refresh preserves unfinished edit, cursor and focus',document.activeElement===root.querySelector('[name=title]')&&document.activeElement.value==='An unfinished correction'&&document.activeElement.selectionStart===3&&document.activeElement.selectionEnd===10);
  check('Refresh accepts new values in untouched fields',root.querySelector('[name=album]').value==='New researched album');
  check('Refresh preserves scroll position',root.scrollTop===123);
  const input=root.querySelector('[name=title]'),back=capturePanel(root);root.replaceChildren();back();
  check('Back restores the original controls and unsaved edits',root.querySelector('[name=title]')===input&&input.value==='An unfinished correction');
  let calls=0,release;const button=root.querySelector('button'),pending=runAction(button,()=>{calls++;return new Promise(r=>release=r);},'Saving…');
  await runAction(button,()=>calls++,'Saving…');
  check('Repeated save submits once with busy feedback',calls===1&&button.disabled&&button.getAttribute('aria-busy')==='true'&&button.textContent==='Saving…');
  release();await pending;check('Successful save restores the control',!button.disabled&&!button.hasAttribute('aria-busy')&&button.textContent==='Save');
  try{await runAction(button,()=>Promise.reject(Error('Fixture failure')),'Saving…');}catch{}
  check('Failed save can be retried',!button.disabled&&!button.dataset.pending&&button.textContent==='Save');
  const dialog=document.createElement('dialog'),toasts=document.createElement('div');root.append(dialog);dialog.showModal();
  const notify=createNotifier(toasts,{host:()=>dialog,duration:10000});notify('Saved');notify('Saved');check('Repeated notices are deduplicated in the dialog top layer',toasts.parentElement===dialog&&toasts.children.length===1);
  notify('Two');notify('Three');notify('Four');check('Notices stay bounded',toasts.children.length===3&&toasts.firstElementChild.textContent==='Two');dialog.close();dialog.remove();
  const labels=document.createElement('div');root.append(labels);const marker=i=>({id:'artist:'+i,name:'Artist '+i,x:30,y:30,width:100,height:32,color:'#abcdef',type:'artist'});
  paintMapMarkers(labels,[marker(0),marker(1)]);const stable=labels.firstElementChild;paintMapMarkers(labels,[marker(0),marker(2)]);
  check('Stationary map markers reuse their controls',labels.firstElementChild===stable);
  stable.focus();for(let i=3;i<1000;i+=3)paintMapMarkers(labels,[marker(i),marker(i+1),marker(i+2)]);
  check('Exploring 1,000 artists keeps a bounded label list and keyboard focus',labels.children.length<=4&&document.activeElement===stable);
  button.focus();paintMapMarkers(labels,[marker(1001)]);check('Unused focused marker is released after focus moves',labels.children.length===1);
 }finally{root.remove();}
 return checks;
};
