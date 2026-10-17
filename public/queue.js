// Playback order is independent of the current view. A cursor makes repeated cycles unambiguous.
export class ContinuousQueue {
  constructor(tracks=()=>[]){this.tracks=tracks;this.items=[];this.cursor=0;this.context=[];this.history=[];this.failed=new Set();this.repeat=0;}
  available(){return new Map(this.tracks().filter(t=>t.available&&!this.failed.has(t.id)).map(t=>[t.id,t]));}
  start(id,ids,shuffle=false){
    this.failed.clear();const available=this.available();let list=[...new Set([...(ids||[]),id])].filter(x=>available.has(x));
    const at=list.indexOf(id);list=[...list.slice(at),...list.slice(0,at)];
    if(shuffle)for(let i=list.length-1;i>1;i--){const j=1+Math.floor(Math.random()*i);[list[i],list[j]]=[list[j],list[i]];}
    this.items=list;this.context=[...list];this.cursor=0;this.ensure();
  }
  restore(saved){
    const known=new Set(this.tracks().map(t=>t.id));
    this.history=Array.isArray(saved.history)?saved.history.filter(e=>e&&known.has(e.id)&&typeof e.session==='string'&&Number.isFinite(e.at)).slice(-200):
      this.tracks().filter(t=>t.id!==saved.id&&Number.isFinite(t.lastPlayed)&&t.lastPlayed>0).sort((a,b)=>a.lastPlayed-b.lastPlayed).slice(-200).map(t=>({id:t.id,session:'earlier-'+t.id+'-'+t.lastPlayed,at:t.lastPlayed}));
    const available=this.available(),old=saved.queue||[],at=Number.isInteger(saved.queueIndex)&&old[saved.queueIndex]===saved.id?saved.queueIndex:old.indexOf(saved.id);
    this.items=old.filter(id=>available.has(id));this.cursor=old.slice(0,Math.max(0,at)).filter(id=>available.has(id)).length;
    if(this.items[this.cursor]!==saved.id){this.items.unshift(saved.id);this.cursor=0;}
    this.context=[...new Set(saved.queueContext?.length?saved.queueContext:this.items)].filter(id=>available.has(id));this.ensure();
  }
  select(id,index){
    if(Number.isInteger(index)&&this.items[index]===id)this.cursor=index;
    else{let at=this.items.indexOf(id,this.cursor);if(at<0)at=this.items.indexOf(id);if(at<0){this.items.splice(this.cursor+1,0,id);at=this.cursor+1;}this.cursor=at;}
    this.ensure();
  }
  ensure(){
    if(!this.items.length)return;const available=this.available();
    const future=this.items.slice(this.cursor+1).filter(id=>available.has(id));this.items.splice(this.cursor+1,Infinity,...future);
    // Retain a useful Back history without letting an all-day session grow indefinitely.
    if(this.cursor>60){this.items.splice(0,this.cursor-60);this.cursor=60;}
    if(this.items.length-this.cursor-1>=5)return;
    const current=available.get(this.items[this.cursor])||this.tracks().find(t=>t.id===this.items[this.cursor]);
    if(this.repeat===1){const cycle=this.context.filter(id=>available.has(id));if(cycle.length){while(this.items.length-this.cursor-1<8)this.items.push(...cycle);return;}}
    const genres=new Set((current?.genre||'').toLowerCase().split(/[,;]/).map(x=>x.trim()).filter(Boolean));
    const affinity=t=>(t.kind===current?.kind?100:0)+(t.sourceId===current?.sourceId?10:0)+(t.artist&&t.artist===current?.artist?5:0)+(t.genre||'').toLowerCase().split(/[,;]/).filter(x=>genres.has(x.trim())).length*8;
    const candidates=[...available.values()].sort((a,b)=>affinity(b)-affinity(a)||(a.lastPlayed||0)-(b.lastPlayed||0)||a.id.localeCompare(b.id));
    if(!candidates.length)return;
    while(this.items.length-this.cursor-1<8){
      const recent=this.items.slice(-Math.min(50,Math.max(1,candidates.length-1))),blocked=new Set(recent);
      const next=candidates.find(t=>!blocked.has(t.id))||candidates.find(t=>t.id!==this.items.at(-1))||candidates[0];
      this.items.push(next.id);
    }
  }
  next(direction=1){
    this.ensure();let at=this.cursor+direction;const available=this.available();
    while(at>=0&&at<this.items.length&&!available.has(this.items[at]))at+=direction;
    return at>=0&&at<this.items.length?at:null;
  }
  remove(index){if(index<=this.cursor||index>=this.items.length)return;this.items.splice(index,1);this.ensure();}
  move(index,delta){const to=index+delta;if(index<=this.cursor||to<=this.cursor||to>=this.items.length)return;[this.items[index],this.items[to]]=[this.items[to],this.items[index]];}
  add(id){if(!this.available().has(id))return false;if(this.items.slice(this.cursor+1).includes(id))return false;this.items.splice(this.cursor+1,0,id);return true;}
  // A queue cursor includes skipped songs. Only successful playback enters history.
  recordPlayed(id,session,at=Date.now()){
    if(!session||!this.available().has(id)||this.history.some(e=>e.session===session))return false;
    this.history.push({id,session,at});this.history=this.history.slice(-200);return true;
  }
  replay(id){if(!this.available().has(id))return null;const index=this.cursor+1;this.items.splice(index,0,id);return index;}
  snapshot(){return {queue:[...this.items],queueIndex:this.cursor,queueContext:[...this.context],history:this.history.map(e=>({...e}))};}
}

export function youtubeOrder(a,b,sources=[]){
  const rank=id=>{const i=sources.findIndex(s=>s.id===id);return i<0?sources.length:i;};
  const position=t=>Number.isInteger(t.playlistIndex)&&t.playlistIndex>0?t.playlistIndex:Infinity;
  return rank(a.sourceId)-rank(b.sourceId)||position(a)-position(b)||a.title.localeCompare(b.title)||a.id.localeCompare(b.id);
}
