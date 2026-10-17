// A track may have lost its cached image (or its first thumbnail fetch failed).
// The native artwork route restores it on demand using the stable track ID.
export function artworkKey(track){return track?.artwork||(/^[a-f0-9]{24}$/.test(track?.id||'')?track.id+'.jpg':'');}
export function artworkURL(key,revision=0){return '/artwork/'+encodeURIComponent(key)+'?v='+revision;}
export function installArtworkRecovery({root=document,onRecovered=()=>{}}={}){
 let revision=-1,lastRetry=0;
 root.addEventListener('error',event=>{
  const image=event.target;if(image?.tagName!=='IMG'||!image.classList.contains('cover'))return;
  image.hidden=true;image.dataset.coverFailed='true';
  if(!image.parentElement?.querySelector('.cover-fallback')){const fallback=root.createElement('span');fallback.className='cover-fallback';fallback.textContent='♫';fallback.setAttribute('aria-hidden','true');image.parentElement?.append(fallback);}
 },true);
 root.addEventListener('load',event=>{const image=event.target;if(image?.tagName!=='IMG'||!image.classList.contains('cover'))return;image.hidden=false;delete image.dataset.coverFailed;image.parentElement?.querySelector('.cover-fallback')?.remove();},true);
 return value=>{
  const changed=Number.isFinite(value)&&revision!==value;
  if(!changed&&Date.now()-lastRetry<60_000)return;
  if(changed)revision=value;lastRetry=Date.now();
  for(const image of root.querySelectorAll('img.cover[data-cover-failed]')){const url=new URL(image.src);url.searchParams.set('v',String(Date.now()));image.src=url.href;}
  if(changed)onRecovered(revision);
 };
}
