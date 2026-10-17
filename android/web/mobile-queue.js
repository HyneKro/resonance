// Indices in Media3 refer to library order, even while shuffle is active.
export function upcomingIds(snapshot){
 const order=snapshot.playbackOrder||snapshot.queue||[],index=order.indexOf(snapshot.id);
 if(index<0)return [];
 return order.slice(index).concat(order.slice(0,index));
}

export function queuePlaybackRequest(snapshot,id,position=0){
 return snapshot.queue.includes(id)?{id,position}:null;
}

export async function toggleShuffle({audio,rpc,toast,button}){
 // Let the native player invert its live state, rather than an older poll snapshot.
 if(button.getAttribute('aria-busy')==='true')return;
 button.setAttribute('aria-busy','true');
 try{
  const before=audio.snapshot,next=await rpc('shuffle');audio.update(next);
  toast(next.shuffle?(before.repeat===1?'Shuffle on · repeat track off':'Shuffle on · upcoming songs mixed'):'Shuffle off · playlist order restored');
 }finally{button.removeAttribute('aria-busy');}
}
