// Updating controls in place preserves scrolling, focus and pending gestures.
export function syncPreferenceControls(patch){
 for(const control of document.querySelectorAll('[data-pref]')){
  const key=control.dataset.pref;if(!Object.hasOwn(patch,key))continue;
  if(control.type==='checkbox')control.checked=!!patch[key];
  else if(control.value!==String(patch[key]))control.value=String(patch[key]);
 }
 for(const output of document.querySelectorAll('[data-value]'))if(Object.hasOwn(patch,output.dataset.value))output.textContent=patch[output.dataset.value];
 if(Object.hasOwn(patch,'visualSyncOffsetMs')){const exact=document.querySelector('[data-offset-number]');if(exact)exact.value=patch.visualSyncOffsetMs;}
}

export function installSettingSliderGestures(){
 let drag=null,nativeGuard=null;
 const range=target=>target.matches?.('input[type="range"][data-pref],input[type="range"][data-lighting-setting]');
 document.addEventListener('pointerdown',e=>{
  if(e.pointerType!=='touch'||!range(e.target))return;
  // Avoid the native jump-to-touch before we know whether this is scrolling.
  e.preventDefault();
  nativeGuard={control:e.target,value:e.target.value};
  drag={id:e.pointerId,control:e.target,x:e.clientX,y:e.clientY,value:Number(e.target.value),width:Math.max(1,e.target.getBoundingClientRect().width-16),horizontal:false};
 });
 document.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(!drag.horizontal){
   if(Math.abs(dy)>=8&&Math.abs(dy)>=Math.abs(dx)){drag=null;return;}
   if(Math.abs(dx)<8||Math.abs(dx)<Math.abs(dy)*1.25)return;
   drag.horizontal=true;drag.control.setPointerCapture(e.pointerId);
  }
  e.preventDefault();
  const control=drag.control,min=Number(control.min)||0,max=control.max===''?100:Number(control.max),step=control.step==='any'?0:Number(control.step)||1;
  let value=Math.max(min,Math.min(max,drag.value+dx/drag.width*(max-min)));
  if(step)value=min+Math.round((value-min)/step)*step;
  const next=String(Number(Math.max(min,Math.min(max,value)).toFixed(6)));
  if(control.value!==next){control.value=next;if(nativeGuard?.control===control)nativeGuard.value=next;control.dispatchEvent(new Event('input',{bubbles:true}));}
 },{passive:false});
 // WebView's native range handling also changes values during touchstart,
 // independently of pointerdown. Only our confirmed horizontal drag commits.
 const ignoreNativeJump=e=>{if(e.isTrusted&&nativeGuard?.control===e.target){e.target.value=nativeGuard.value;e.stopImmediatePropagation();}};
 document.addEventListener('input',ignoreNativeJump,true);document.addEventListener('change',ignoreNativeJump,true);
 const finish=e=>{if(!drag||e.pointerId!==drag.id)return;const current=drag;drag=null;if(e.type==='pointerup'&&current.horizontal)current.control.dispatchEvent(new Event('change',{bubbles:true}));};
 document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
 const release=()=>{const ended=nativeGuard;setTimeout(()=>{if(nativeGuard===ended)nativeGuard=null;},0);};
 document.addEventListener('touchend',release,{passive:true});document.addEventListener('touchcancel',release,{passive:true});
 document.addEventListener('keydown',()=>nativeGuard=null,true);
 window.addEventListener('blur',()=>{drag=null;nativeGuard=null;});
}
