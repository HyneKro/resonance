const overlaps=(a,b,gap)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
const clearance=(box,bounds)=>Math.min(box.x-bounds.x,box.y-bounds.y,bounds.x+bounds.width-box.x-box.width,bounds.y+bounds.height-box.y-box.height);

/** Camera-facing captions anchored to projected world positions. Never pack or
 * clamp text into another slot: crowded labels yield visibility, not position.
 * Existing labels win ties; new ones need sustained space before fading in. */
export class AnchoredLabels {
 constructor(){this.states=new Map();}
 update(candidates,bounds,{dt=1/60,reduced=false,limits={group:8}}={}){
  dt=Math.max(0,Math.min(.1,dt));
  const ids=new Set(candidates.map(c=>c.id));
  for(const id of this.states.keys())if(!ids.has(id))this.states.delete(id);
  const items=candidates.map(c=>{
   let state=this.states.get(c.id);
   if(!state){state={alpha:0,selected:false,clear:0};this.states.set(c.id,state);}
   const box={...c,x:c.x-c.width/2,height:c.height||32};
   return {box,state,margin:clearance(box,bounds)};
  }).filter(({box,margin})=>Number.isFinite(margin)&&box.width>=40&&box.height>0);
  items.sort((a,b)=>(b.box.priority||0)-(a.box.priority||0)||Number(b.state.selected)-Number(a.state.selected)||(b.box.rank||0)-(a.box.rank||0)||String(a.box.id).localeCompare(String(b.box.id)));
  const chosen=[],counts=new Map();
  for(const item of items){
   const {box,state,margin}=item,category=box.category||'group';
   item.wanted=margin>=(state.selected?0:12)&&(counts.get(category)||0)<(limits[category]??Infinity)&&!chosen.some(b=>overlaps(box,b,state.selected?8:18));
   if(item.wanted){chosen.push(box);counts.set(category,(counts.get(category)||0)+1);}
  }
  // Let the outgoing caption fade before another occupies the same space.
  const retiring=items.filter(i=>!i.wanted&&i.state.alpha>.03);
  const result=[];
  for(const {box,state,margin,wanted} of items){
   const clear=wanted&&!retiring.some(i=>i.box.id!==box.id&&overlaps(box,i.box,8));
   state.clear=clear?state.clear+dt:0;
   const target=clear&&(state.alpha>0||state.clear>=.18)?Math.min(1,Math.max(0,margin/18)):0;
   state.selected=!!wanted;
   state.alpha=reduced?target:state.alpha+Math.sign(target-state.alpha)*Math.min(Math.abs(target-state.alpha),dt/(target>state.alpha?.22:.14));
   if(state.alpha>.01)result.push({...box,opacity:state.alpha,interactive:!!wanted&&state.alpha>.5});
  }
  return result;
 }
 clear(){this.states.clear();}
}
