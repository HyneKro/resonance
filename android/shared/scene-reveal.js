// Keep the static sleeve above the rebuilding graphics until a complete frame
// has actually been drawn. Cancelling a return must also cancel its old fade.
export class SceneReveal{
 constructor(root=document.body,{schedule=(fn,delay)=>setTimeout(fn,delay),unschedule=id=>clearTimeout(id)}={}){this.root=root;this.schedule=schedule;this.unschedule=unschedule;this.pending=false;this.generation=0;}
 setLoading(loading){
  const status=this.root?.querySelector?.(this.source==='constellation'?'#scene-loading':'#visualizer-loading'),button=this.root?.querySelector?.(this.source==='constellation'?'#room-visualizer, #visualizer-mode':'#music-only');
  if(status){status.hidden=!loading;const label=status.querySelector('[data-loading-label]');if(label)label.textContent=loading?'Preparing your visualizer…':'';}
  if(loading)button?.setAttribute('aria-busy','true');else button?.removeAttribute('aria-busy');
 }
 begin(source='music'){this.cancel();this.source=source;this.pending=true;this.root?.classList.add(source==='constellation'?'constellation-return':'visualizer-return','visualizer-preparing');this.setLoading(true);}
 ready(reduced=false){
  if(!this.pending)return;this.pending=false;
  this.root?.classList.remove('visualizer-preparing');this.setLoading(false);
  if(reduced){this.cancel();return;}
  const generation=this.generation;
  this.timer=this.schedule(()=>{if(generation===this.generation)this.cancel();},500);
 }
 cancel(){this.generation++;this.unschedule(this.timer);this.timer=null;this.pending=false;this.root?.classList.remove('visualizer-return','constellation-return','visualizer-preparing');this.setLoading(false);}
}
