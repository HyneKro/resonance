import {sleeveDesign} from './sleeve-design.js';
export function installWallpaper({api,state}){
 const host=document.querySelector('#music-wallpaper');host.replaceChildren();host.classList.add('art-collage');let key='',serial=0,lastCheck=0,saved=null;
 const wash=document.createElement('div');wash.className='collage-wash';host.append(wash);
 const layout=document.createElement('div');layout.className='collage-panels';host.append(layout);
 const grooves=document.createElement('div');grooves.className='sleeve-grooves';host.append(grooves);
 const grain=document.createElement('div');grain.className='sleeve-grain';host.append(grain);
 const lettering=document.createElement('div');lettering.className='sleeve-lettering';host.append(lettering);
 const colophon=document.createElement('div');colophon.className='sleeve-colophon';host.append(colophon);
 const credits=document.createElement('details');credits.className='artwork-credits';credits.innerHTML='<summary>Artwork sources</summary><div></div>';credits.hidden=true;document.querySelector('#music-only-stage').append(credits);
 const safeURL=url=>{try{const u=new URL(url);return u.protocol==='https:'&&['musicbrainz.org','www.youtube.com','lrclib.net','en.wikipedia.org','commons.wikimedia.org','creativecommons.org'].includes(u.hostname)?u.href:null;}catch{return null;}};
 function paint(track,assets=[]){
  // Composed once when artwork or track metadata changes. No canvas, frame
  // loop, blur filter or continuous texture generation in Music only.
  lettering.textContent=track.artist||track.title||'resonance';
  const design=sleeveDesign(track);host.dataset.edition=design.kind;
  const ns='http://www.w3.org/2000/svg',art=document.createElementNS(ns,'svg');art.setAttribute('viewBox','0 0 1000 720');art.setAttribute('aria-hidden','true');
  for(const d of design.paths){const path=document.createElementNS(ns,'path');path.setAttribute('d',d);art.append(path);}grooves.replaceChildren(art);
  colophon.replaceChildren();
  for(const [className,text]of [['sleeve-label','RESONANCE / LISTENING EDITION'],['sleeve-number','N° '+design.number],['sleeve-notes',[track.date?.slice(0,4),track.genre||'Your private collection'].filter(Boolean).join(' · ')],['sleeve-format',[track.codec,track.sampleRate?track.sampleRate/1000+' kHz':'',track.bits?track.bits+' bit':''].filter(Boolean).join(' / ')]]){const el=document.createElement('div');el.className=className;el.textContent=text;colophon.append(el);}
  const current=track.artwork?{src:'/artwork/'+encodeURIComponent(track.artwork),width:0,height:0,kind:'local'}:null;
  const images=assets.map(a=>({...a,src:'/wallpapers/'+encodeURIComponent(a.file)}));if(current)images.push(current);
  const chosen=images.filter((a,i,list)=>list.findIndex(b=>b.src===a.src)===i).slice(0,2);layout.replaceChildren();credits.querySelector('div').replaceChildren();credits.hidden=!assets.length;
  for(let i=0;i<chosen.length;i++){const item=chosen[i];if(!item)continue;const panel=document.createElement('div');panel.className='collage-panel panel-'+i;const img=new Image();img.alt='';img.decoding='async';img.src=item.src;
   img.onload=()=>{const nativeWidth=img.naturalWidth,nativeHeight=img.naturalHeight;panel.style.setProperty('--native-ratio',nativeWidth/nativeHeight);panel.style.setProperty('--art-limit',Math.min(640,nativeWidth)+'px');if(nativeWidth<700)panel.classList.add('small-art');};img.onerror=()=>panel.hidden=true;panel.append(img);layout.append(panel);
  }
  for(const item of assets){const url=safeURL(item.source);if(!url)continue;const row=document.createElement('p'),a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noreferrer';a.textContent=item.label||'Artwork';row.append(a);if(item.credit||item.license)row.append(document.createTextNode(' · '+[item.credit,item.license].filter(Boolean).join(' · ')));credits.querySelector('div').append(row);}
 }
 async function select(track){if(!track){if(key){key='';serial++;layout.replaceChildren();lettering.textContent='';colophon.replaceChildren();credits.hidden=true;}return;}const next=[track.id,track.artwork,track.title,track.artist,track.genre,track.date].join('|');if(next!==key){key=next;serial++;lastCheck=0;saved=null;paint(track);}
  if(Date.now()-lastCheck<15000)return;lastCheck=Date.now();const request=serial;
  try{const data=await api('/api/wallpaper?id='+encodeURIComponent(track.id));if(request!==serial)return;const signature=JSON.stringify(data.assets||[]);if(signature!==saved){saved=signature;paint(track,data.assets||[]);}}catch{/* Local cover collage remains available offline. */}
 }
 return {select};
}
