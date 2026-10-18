import {COMPANION_APPEARANCES,appearanceInfo} from './companion-appearances.js';

// A compact searchable dropdown; artwork is not fetched for every menu item.
export function installCompanionPicker(select){
 const trigger=document.createElement('button'),menu=document.createElement('div'),search=document.createElement('input'),list=document.createElement('div');
 trigger.type='button';trigger.className='pattern-trigger companion-trigger';trigger.setAttribute('aria-label','Companion appearance');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','companion-choices');
 menu.className='pattern-menu companion-menu';menu.setAttribute('popover','auto');
 search.type='search';search.placeholder='Find a character…';search.setAttribute('aria-label','Find a companion');search.setAttribute('role','combobox');search.setAttribute('aria-autocomplete','list');search.setAttribute('aria-controls','companion-choices');search.setAttribute('aria-expanded','true');
 list.id='companion-choices';list.setAttribute('role','listbox');list.setAttribute('aria-label','Companion appearances');
 const empty=document.createElement('p');empty.textContent='No matching character';empty.hidden=true;
 menu.append(search,list,empty);select.after(trigger,menu);select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 let active=0,visible=[];
 const opened=()=>menu.matches(':popover-open');
 const close=()=>{if(opened())menu.hidePopover();trigger.setAttribute('aria-expanded','false');};
 const buttons=COMPANION_APPEARANCES.map((appearance,i)=>{const button=document.createElement('button');button.type='button';button.id='companion-choice-'+appearance.id;button.setAttribute('role','option');button.tabIndex=-1;button.textContent=appearance.label;button.disabled=appearance.ready===false;button.setAttribute('aria-disabled',String(button.disabled));button.addEventListener('click',()=>{select.value=appearance.id;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();trigger.focus({preventScroll:true});});list.append(button);return button;});
 function mark(){buttons.forEach((b,i)=>b.classList.toggle('highlighted',i===active));const b=buttons[active];if(b){search.setAttribute('aria-activedescendant',b.id);const top=b.offsetTop,bottom=top+b.offsetHeight;if(top<menu.scrollTop+search.offsetHeight)menu.scrollTop=Math.max(0,top-search.offsetHeight);else if(bottom>menu.scrollTop+menu.clientHeight)menu.scrollTop=bottom-menu.clientHeight;}}
 function filter(){const text=search.value.trim().toLocaleLowerCase();buttons.forEach(b=>b.hidden=!b.textContent.toLocaleLowerCase().includes(text));visible=buttons.map((b,i)=>!b.hidden&&!b.disabled?i:-1).filter(i=>i>=0);active=visible.includes(active)?active:visible[0];empty.hidden=buttons.some(b=>!b.hidden);mark();}
 function sync(){trigger.textContent=appearanceInfo(select.value).label;buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(COMPANION_APPEARANCES[i].id===select.value)));if(select.closest('[data-companion-options]')?.hidden)close();}
 function open(){const box=trigger.getBoundingClientRect(),width=Math.min(310,innerWidth-24),below=innerHeight-box.bottom-16,above=box.top-16,down=below>=260||below>=above;menu.style.width=width+'px';menu.style.left=Math.max(12,Math.min(innerWidth-width-12,box.right-width))+'px';menu.style.maxHeight=Math.max(120,Math.min(380,down?below:above))+'px';menu.style.top=down?box.bottom+8+'px':'auto';menu.style.bottom=down?'auto':innerHeight-box.top+8+'px';menu.showPopover();trigger.setAttribute('aria-expanded','true');search.value='';active=COMPANION_APPEARANCES.findIndex(a=>a.id===select.value);filter();search.focus({preventScroll:true});}
 let openOnPointerDown=false;trigger.addEventListener('pointerdown',()=>openOnPointerDown=opened());
 trigger.addEventListener('click',e=>{e.preventDefault();(openOnPointerDown||opened())?close():open();openOnPointerDown=false;});
 search.addEventListener('input',filter);
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();trigger.focus({preventScroll:true});return;}if(!['ArrowDown','ArrowUp','Home','End','Enter'].includes(e.key))return;e.preventDefault();e.stopPropagation();if(!visible.length)return;if(e.key==='Enter'){buttons[active]?.click();return;}const i=visible.indexOf(active);active=e.key==='Home'?visible[0]:e.key==='End'?visible.at(-1):visible[(i+(e.key==='ArrowUp'?-1:1)+visible.length)%visible.length];mark();});
 menu.addEventListener('toggle',()=>trigger.setAttribute('aria-expanded',String(opened())));
 trigger.addEventListener('keydown',e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();open();}});
 document.addEventListener('keydown',e=>{if(opened()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();trigger.focus({preventScroll:true});}},true);
 select.addEventListener('change',sync);select.closest('details')?.addEventListener('toggle',()=>{if(!select.closest('details').open)close();});window.addEventListener('resize',close);sync();return {sync,close};
}
