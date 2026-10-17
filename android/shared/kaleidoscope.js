export const KALEIDOSCOPE_MODES=Object.freeze([
 {id:'facets',label:'Crystal · sixfold'},
 {id:'petals',label:'Petals · eightfold'},
 {id:'mandala',label:'Mandala · twelvefold'},
 {id:'spiral',label:'Spiral bloom'},
 {id:'tunnel',label:'Prism tunnel'},
 {id:'mirrors',label:'Liquid mirrors'},
 {id:'rosette',label:'Rosette · fivefold'},
 {id:'diamonds',label:'Diamond lattice'},
 {id:'honeycomb',label:'Honeycomb'},
 {id:'rings',label:'Orbital rings'},
 {id:'binary',label:'Binary blooms'},
 {id:'cathedral',label:'Cathedral · sixteenfold'}
]);
export const kaleidoscopeMode=value=>KALEIDOSCOPE_MODES.some(m=>m.id===value)?value:'facets';
export const kaleidoscopeIndex=value=>KALEIDOSCOPE_MODES.findIndex(m=>m.id===kaleidoscopeMode(value));

// Slot zero is the unmodified scene. Dissolve complete views, not their UV
// coordinates: interpolating folds would stretch the image across the screen.
export class KaleidoscopeBlend {
 constructor(){this.weights=new Float32Array(KALEIDOSCOPE_MODES.length+1);this.from=new Float32Array(this.weights.length);this.target=-1;this.elapsed=0;this.active=false;}
 update(dt,{enabled=false,mode,reduced=false}={}){
  const target=enabled?kaleidoscopeIndex(mode)+1:0;
  if(this.target<0){this.target=target;this.weights[target]=1;return this.weights;}
  if(target!==this.target){
   // Retarget from the visible mixture, including an interrupted fade.
   this.from.set(this.weights);this.target=target;this.elapsed=0;this.active=true;
  }
  if(!this.active)return this.weights;
  this.elapsed+=Number.isFinite(dt)?Math.max(0,Math.min(.1,dt)):0;
  const progress=Math.min(1,this.elapsed/(reduced?.2:.9));
  const blend=progress*progress*(3-2*progress);
  for(let i=0;i<this.weights.length;i++)this.weights[i]=this.from[i]*(1-blend)+(i===target?blend:0);
  if(progress===1){this.weights.fill(0);this.weights[target]=1;this.active=false;}
  return this.weights;
 }
}

export function installKaleidoscopeMenu(select){
 const button=document.createElement('button'),menu=document.createElement('div');
 button.type='button';button.className='pattern-trigger';button.setAttribute('role','combobox');button.setAttribute('aria-label','Kaleidoscope pattern');button.setAttribute('aria-haspopup','listbox');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','kaleidoscope-patterns');
 menu.id='kaleidoscope-patterns';menu.className='pattern-menu';menu.setAttribute('popover','auto');menu.setAttribute('role','listbox');menu.setAttribute('aria-label','Kaleidoscope patterns');
 const options=KALEIDOSCOPE_MODES.map((mode,i)=>{const option=document.createElement('button');option.type='button';option.id='pattern-'+mode.id;option.tabIndex=-1;option.setAttribute('role','option');option.dataset.index=i;option.textContent=mode.label;menu.append(option);return option;});
 select.hidden=true;select.tabIndex=-1;select.setAttribute('aria-hidden','true');select.after(button,menu);let index=0;
 const opened=()=>menu.matches(':popover-open');
 const close=(focus=false)=>{if(opened())menu.hidePopover();button.setAttribute('aria-expanded','false');button.removeAttribute('aria-activedescendant');if(focus)button.focus({preventScroll:true});};
 const mark=()=>{options.forEach((el,i)=>el.classList.toggle('highlighted',i===index));button.setAttribute('aria-activedescendant',options[index].id);options[index].scrollIntoView({block:'nearest'});};
 const sync=()=>{const selected=kaleidoscopeIndex(select.value);button.textContent=KALEIDOSCOPE_MODES[selected].label;options.forEach((el,i)=>el.setAttribute('aria-selected',String(i===selected)));if(select.closest('.kaleidoscope-options')?.hidden)close();};
 const open=()=>{if(opened())return;const box=button.getBoundingClientRect(),width=Math.min(284,innerWidth-24),below=innerHeight-box.bottom-12,above=box.top-12;menu.style.width=width+'px';menu.style.left=Math.max(12,Math.min(innerWidth-width-12,box.right-width))+'px';const down=below>=240||below>=above;menu.style.maxHeight=Math.min(360,down?below:above)+'px';menu.style.top=down?box.bottom+8+'px':'auto';menu.style.bottom=down?'auto':innerHeight-box.top+8+'px';menu.showPopover();button.setAttribute('aria-expanded','true');index=kaleidoscopeIndex(select.value);mark();};
 const choose=i=>{select.value=KALEIDOSCOPE_MODES[i].id;select.dispatchEvent(new Event('change',{bubbles:true}));sync();close(true);};
 let openOnPointerDown=false;button.addEventListener('pointerdown',()=>openOnPointerDown=opened());
 button.addEventListener('click',e=>{e.preventDefault();(openOnPointerDown||opened())?close():open();openOnPointerDown=false;});
 button.addEventListener('keydown',e=>{if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();if(!opened()){open();return;}if(e.key==='Enter'||e.key===' '){choose(index);return;}index=e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowUp'?-1:1)+options.length)%options.length;mark();}if(e.key==='Tab')close();});
 options.forEach((option,i)=>{option.addEventListener('mousedown',e=>e.preventDefault());option.addEventListener('click',()=>choose(i));});
 document.addEventListener('keydown',e=>{if(opened()&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();close(true);}},true);
 document.addEventListener('pointerdown',e=>{if(opened()&&!menu.contains(e.target)&&!button.contains(e.target))close();},true);
 menu.addEventListener('toggle',()=>{button.setAttribute('aria-expanded',String(opened()));if(!opened())button.removeAttribute('aria-activedescendant');});
 select.closest('details')?.addEventListener('toggle',()=>{if(!select.closest('details').open)close();});
 window.addEventListener('resize',()=>close());select.addEventListener('change',sync);sync();return {sync,close};
}
