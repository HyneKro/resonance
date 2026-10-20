export function installLevelingUI({status,playOriginal}){
 const banner=document.createElement('aside');banner.className='leveling-preparation';banner.hidden=true;
 const label=document.createElement('span');label.setAttribute('role','status');const button=document.createElement('button');button.type='button';button.className='secondary';button.textContent='Play original level';button.onclick=playOriginal;banner.append(label,button);document.body.append(banner);
 let busy=false;
 async function poll(){const out=document.querySelector('[data-leveling-coverage]');if(!out||busy)return;busy=true;try{const s=await status();if(out.isConnected)out.textContent=`${s.ready.toLocaleString()} / ${s.total.toLocaleString()} songs measured locally${s.enabled&&s.ready+s.failed<s.total?' · preparing your library, one song at a time':''}${s.failed?' · '+s.failed+' could not be measured':''}.`;}catch{if(out.isConnected)out.textContent='Saved measurements are used when available.';}finally{busy=false;}}
 const timer=setInterval(poll,2000);globalThis.addEventListener('pagehide',()=>clearInterval(timer),{once:true});
 return value=>{banner.hidden=!value;if(value)label.textContent=value.error?(value.error==='timeout'?'Loudness preparation is taking longer. Press Play to retry, or play the original level.':'This song could not be measured. You can play its original level.'):`Matching song loudness${value.title?' · '+value.title:''}${value.progress==null?' · queued':' · '+Math.round(value.progress*100)+'%'}…`;};
}
