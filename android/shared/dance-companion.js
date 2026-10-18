import {interfaceAccents} from './interface-accent.js';
import {companionPosition,companionBounds,companionPoint,companionPlacement,companionHairColors} from './companion-model.js';
import {CompanionRenderer} from './companion-renderer.js';
import {appearanceInfo} from './companion-appearances.js';
import {DanceMotion,CompanionClock,CompanionPlayback} from './companion-motion.js';
export {DanceMotion} from './companion-motion.js';
export function installDanceCompanion({reactor,audio,savePosition=async()=>{},onError=()=>{}}){
 const room=document.querySelector('#listening-room'),element=document.createElement('button');element.type='button';element.className='dance-companion';element.setAttribute('aria-label','Sona · dance companion');element.setAttribute('aria-describedby','companion-help');element.setAttribute('aria-pressed','false');element.hidden=true;
 element.innerHTML='<span class="dance-sprite"><canvas aria-hidden="true"></canvas></span>';
 const help=document.createElement('span');help.id='companion-help';help.className='companion-help';help.textContent='Click your companion to say hello. Hold or drag to pick up; release to set down. Space or Enter picks up and drops; arrow keys move, Shift moves finely, Escape cancels. Scroll and right-drag still control your music. Your placement is remembered.';room.append(element,help);
 const sprite=element.firstElementChild,motion=new DanceMotion(),clock=new CompanionClock(),playback=new CompanionPlayback(),renderer=new CompanionRenderer(sprite.firstElementChild,()=>{motion.setAppearance(renderer.appearance);render(0);},onError);
 let enabled=false,position=null,savedKey='',bounds=companionBounds(1280,720,124),point={x:0,y:0},drag=null,keyboardOrigin,followTheme=true,paletteSource,colors=interfaceAccents(null),targetColors=colors,hairColors=companionHairColors(null),raf=0,holdTimer,saveTimer;
 function place(){point=companionPoint(position,bounds);element.style.transform=`translate3d(${point.x.toFixed(2)}px,${point.y.toFixed(2)}px,0)`;}
 function resize(){
  if(element.hidden)return;const box=room.getBoundingClientRect(),size=Math.max(element.offsetWidth,element.offsetHeight),top=room.querySelector('.room-top')?.getBoundingClientRect(),dock=room.querySelector('.room-dock')?.getBoundingClientRect();
  bounds=companionBounds(box.width,box.height,size,Math.max(12,(top?.bottom||box.top+68)-box.top+8),Math.max(12,box.bottom-(dock?.top||box.bottom-116)+8));place();
 }
 const visible=()=>enabled&&!element.hidden&&!reactor.musicOnly&&!reactor.sceneSuspended&&!room.hidden&&!document.hidden;
 function render(dt){
  if(!visible())return;
  const source=followTheme&&!reactor.desktopSource?reactor.coverColors:null;if(source!==paletteSource){paletteSource=source;targetColors=interfaceAccents(source);}
  const blend=reactor.reduced?1:1-Math.exp(-dt/1.1);colors=colors.map((c,i)=>c.map((v,j)=>v+(targetColors[i][j]-v)*blend));
  const scene=reactor.visualColors||(!reactor.desktopSource&&reactor.coverPalette!==false?reactor.coverColors:null)||reactor.dynamics?.output?.colors;
  const hairTarget=companionHairColors(followTheme?scene:null),hairBlend=reactor.reduced?1:1-Math.exp(-dt/.45);
  hairColors=hairColors.map((c,i)=>c.map((v,j)=>v+(hairTarget[i][j]-v)*hairBlend));
  const active=playback.update(reactor.audioActive,reactor.visualSync?.delayMs||0,performance.now());
  const frame=motion.update(dt,{active,reduced:reactor.reduced,frozen:reactor.frozen});
  element.dataset.state=frame.state;element.dataset.pose=frame.name;renderer.draw(frame,colors,hairColors);sprite.classList.add('painted');
 }
 function tick(now){raf=0;if(!visible()){clock.reset();return;}const dt=clock.step(now);if(dt!==null)render(dt);raf=requestAnimationFrame(tick);}
 function syncClock(){if(visible()){if(!raf){clock.reset();raf=requestAnimationFrame(tick);}}else{cancelAnimationFrame(raf);raf=0;clock.reset();}}
 const persist=()=>{clearTimeout(saveTimer);const value=position;saveTimer=setTimeout(()=>{void Promise.resolve().then(()=>savePosition(value)).catch(()=>onError('Could not save Sona’s position. Try moving her again.'));},160);};
 function cancel(){
  clearTimeout(holdTimer);
  if(drag){position=drag.origin;const id=drag.id;drag=null;if(element.hasPointerCapture(id))element.releasePointerCapture(id);}
  if(keyboardOrigin!==undefined){position=keyboardOrigin;keyboardOrigin=undefined;}
  motion.cancel();element.setAttribute('aria-pressed','false');place();render(0);
 }
 function pickUp(){clearTimeout(holdTimer);if(drag)drag.picked=true;motion.pickUp();element.setAttribute('aria-pressed','true');render(0);}
 function drop(){motion.drop();element.setAttribute('aria-pressed','false');render(0);persist();}
 element.addEventListener('pointerdown',e=>{
  // A left/right chord belongs to the music gesture cancellation handler.
  if(e.button!==0||(e.buttons&2)||!e.isPrimary||!enabled||reactor.musicOnly)return;
  e.preventDefault();e.stopPropagation();if(drag||keyboardOrigin!==undefined)cancel();resize();
  drag={id:e.pointerId,x:e.clientX,y:e.clientY,start:{...point},origin:position,lastX:e.clientX,picked:false};element.setPointerCapture(e.pointerId);element.focus({preventScroll:true});motion.press();render(0);
  holdTimer=setTimeout(()=>{if(drag)pickUp();},180);
 });
 element.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.id){const rect=element.getBoundingClientRect();motion.look((e.clientX-rect.left-rect.width/2)/(rect.width/2),(e.clientY-rect.top-rect.height*.4)/(rect.height/2),true);return;}
  if(e.buttons&2){cancel();return;}
  e.preventDefault();e.stopPropagation();if(!drag.picked&&Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>4)pickUp();
  if(drag.picked){position=companionPlacement({x:drag.start.x+e.clientX-drag.x,y:drag.start.y+e.clientY-drag.y},bounds);motion.move(e.clientX-drag.lastX);drag.lastX=e.clientX;place();}
 });
 element.addEventListener('pointerleave',()=>motion.look(0,0,false));
 element.addEventListener('pointerup',e=>{
  if(!drag||e.pointerId!==drag.id||e.button!==0)return;e.preventDefault();e.stopPropagation();clearTimeout(holdTimer);const picked=drag.picked;drag=null;if(element.hasPointerCapture(e.pointerId))element.releasePointerCapture(e.pointerId);if(picked)drop();else{motion.click();render(0);}
 });
 element.addEventListener('pointercancel',cancel);element.addEventListener('lostpointercapture',()=>{if(drag)cancel();});
 element.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(e.detail===0&&keyboardOrigin===undefined){motion.click();render(0);}});
 element.addEventListener('keydown',e=>{
  if(e.altKey||e.ctrlKey||e.metaKey)return;
  if([' ','Enter','Escape','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();e.stopPropagation();}else return;
  if(e.key==='Escape'){cancel();return;}
  if(e.key===' '||e.key==='Enter'){if(e.repeat)return;if(keyboardOrigin!==undefined){keyboardOrigin=undefined;drop();}else{keyboardOrigin=position;pickUp();}return;}
  const step=e.shiftKey?3:16,dx=e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0,dy=e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0;
  position=companionPlacement({x:point.x+dx,y:point.y+dy},bounds);motion.move(dx);place();if(keyboardOrigin===undefined){motion.drop();persist();}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(drag||keyboardOrigin!==undefined)){e.preventDefault();e.stopImmediatePropagation();cancel();}},true);
 window.addEventListener('blur',()=>{if(drag||keyboardOrigin!==undefined)cancel();});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)cancel();syncClock();});
 document.addEventListener('resonance-scene-visibility',syncClock);
 new ResizeObserver(resize).observe(room);window.addEventListener('resize',resize);
 new MutationObserver(syncClock).observe(room,{attributes:true,attributeFilter:['hidden']});
 return {apply(p){
  enabled=p.danceCompanion===true;const hidden=!enabled||p.musicOnly===true;if(hidden)cancel();element.hidden=help.hidden=hidden;followTheme=p.coverInterface!==false;
  const appearance=appearanceInfo(p.companionAppearance);renderer.wantedAppearance=appearance.id;element.setAttribute('aria-label',appearance.label+' · dance companion');element.dataset.appearance=appearance.id;
  const incoming=companionPosition(p.dancePosition),key=JSON.stringify(incoming);if(key!==savedKey){savedKey=key;if(!drag&&keyboardOrigin===undefined)position=incoming;}
  if(!hidden){renderer.load();resize();render(0);}syncClock();
 },reset(){cancel();position=null;savedKey='null';place();persist();}};
}
