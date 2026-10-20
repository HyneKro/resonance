// Still artwork composition: no render loop, audio analysis or invented artist facts.
export function editionStyle(genre=''){
 if(/metal|rock|punk|grunge|industrial/i.test(genre))return 'poster';
 if(/jazz|folk|acoustic|classical|soul|blues/i.test(genre))return 'editorial';
 if(/ambient|dream|soundtrack|cinematic|chill/i.test(genre))return 'nocturne';
 return 'prism';
}
export function editionMetadata(track={}){
 const year=String(track.date||track.year||'').match(/^\d{4}/)?.[0]||'';
 return {style:editionStyle(track.genre),artist:track.artist||track.channel||'Your collection',
  album:track.album||'',year,genre:track.genre||'',
  format:[track.codec?.toUpperCase(),track.sampleRate?`${Number(track.sampleRate)/1000} kHz`:'',track.bits?`${track.bits} bit`:''].filter(Boolean).join(' / ')};
}
const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
export function installMusicEdition({mobile=false,artwork=track=>track?.artwork?'/artwork/'+encodeURIComponent(track.artwork):'',details=()=>{},queue=()=>{},assets=null}={}){
 const stage=document.querySelector('#music-only-stage'),wall=document.querySelector('#music-wallpaper');
 if(!stage||!wall)return {select(){}};
 stage.classList.add('music-edition');stage.dataset.platform=mobile?'mobile':'desktop';
 wall.replaceChildren();wall.className='edition-wall';wall.append(element('div','edition-aura'),element('div','edition-lines'),element('div','edition-texture'));
 const backdrop=element('div','edition-backprint');backdrop.setAttribute('aria-hidden','true');wall.append(backdrop);
 const cover=stage.querySelector('#music-cover-play,#cover-play'),title=stage.querySelector('#music-only-title'),artist=stage.querySelector('#music-only-artist'),note=stage.querySelector('.music-stage-note');
 stage.querySelector('.eyebrow')?.remove();
 const art=element('div','edition-art'),frame=element('div','edition-frame'),disc=element('div','edition-disc'),fragment=element('div','edition-fragment');
 disc.setAttribute('aria-hidden','true');fragment.setAttribute('aria-hidden','true');frame.append(cover);art.append(disc,fragment,frame);
 const caption=element('div','edition-art-caption');caption.innerHTML='<span>RESONANCE</span><span>THE LISTENING EDITION</span>';art.append(caption);
 const swatches=element('div','edition-swatches');swatches.setAttribute('aria-hidden','true');swatches.innerHTML='<i></i><i></i><i></i>';art.append(swatches);
 const copy=element('div','edition-copy'),kicker=element('div','edition-kicker','A MOMENT, JUST FOR MUSIC'),genre=element('div','edition-genre'),byline=element('div','edition-byline'),album=element('div','edition-album'),year=element('span','edition-year');
 byline.append(artist);album.append(element('span','edition-album-name'),year);
 const rule=element('div','edition-rule');rule.setAttribute('aria-hidden','true');
 const detail=element('button','edition-details','Behind the sound ↗');detail.type='button';detail.onclick=()=>{if(track)details(track);};
 copy.append(kicker,title,byline,rule,album,genre,detail);
 const footer=element('div','edition-footer'),format=element('span','edition-format'),next=element('button','edition-next');next.type='button';next.onclick=queue;
 next.append(element('span','edition-next-label','UP NEXT'),element('span','edition-next-name'),element('span','edition-next-arrow','↗'));footer.append(format,next);
 stage.replaceChildren(art,copy,footer,...(note?[note]:[]));
 const credits=element('details','edition-credits');credits.innerHTML='<summary>Artwork credits</summary><div></div>';credits.hidden=true;copy.append(credits);
 let track=null,key='',generation=0,assetKey='',timer,lastMode=document.body.dataset.listeningMode;
 const ratios=new Map();
 function enter(){clearTimeout(timer);stage.classList.remove('edition-arrive');void stage.offsetWidth;stage.classList.add('edition-arrive');timer=setTimeout(()=>stage.classList.remove('edition-arrive'),700);}
 function boundaries(){
  if(document.body.dataset.listeningMode!=='music'&&!document.body.classList.contains('visualizer-return'))return;
  const dock=document.querySelector('.room-dock'),header=document.querySelector('.room-top'),modes=mobile?document.querySelector('.mobile-modes'):null;
  const top=Math.max(header?.getBoundingClientRect().bottom||0,modes?.getBoundingClientRect().bottom||0)+18;
  const rect=dock?.getBoundingClientRect(),sideDock=mobile&&innerWidth>innerHeight&&rect?.top<innerHeight/2;
  stage.style.setProperty('--edition-top',top+'px');
  stage.style.setProperty('--edition-bottom',sideDock?'18px':Math.max(24,innerHeight-(rect?.top||innerHeight)+22)+'px');
  stage.style.setProperty('--edition-right',sideDock?(innerWidth-rect.left+18)+'px':mobile?'20px':'5vw');
  stage.classList.toggle('edition-compact',mobile&&!sideDock&&(rect?.top||innerHeight)-top-22<350);
 }
 const observer=new ResizeObserver(boundaries);for(const node of [document.querySelector('.room-dock'),document.querySelector('.room-top'),document.querySelector('.mobile-modes')])if(node)observer.observe(node);
 window.addEventListener('resize',boundaries);
 new MutationObserver(()=>{const mode=document.body.dataset.listeningMode;if(mode===lastMode)return;lastMode=mode;boundaries();if(mode==='music'){enter();void loadAssets();}}).observe(document.body,{attributes:true,attributeFilter:['data-listening-mode']});
 async function loadAssets(){
  if(!assets||!track||document.body.dataset.listeningMode!=='music'||assetKey===key)return;
  assetKey=key;const request=generation;
  try{const value=await assets(track);if(request!==generation)return;
   const item=value?.find(a=>a.file&&a.kind!=='cover')||value?.[0];if(!item)return;
   const img=new Image();img.alt='';img.decoding='async';img.src='/wallpapers/'+encodeURIComponent(item.file);
   img.onload=()=>{if(request===generation)fragment.replaceChildren(img);};
   const rows=credits.querySelector('div');rows.replaceChildren();
   for(const a of value){let url;try{url=new URL(a.source);}catch{continue}
    if(url.protocol!=='https:'||!['musicbrainz.org','www.youtube.com','en.wikipedia.org','commons.wikimedia.org','creativecommons.org'].includes(url.hostname))continue;
    const row=element('p',''),link=element('a','',a.label||'Artwork');link.href=url.href;link.target='_blank';link.rel='noreferrer';row.append(link,document.createTextNode(' '+[a.credit,a.license].filter(Boolean).join(' · ')));rows.append(row);
   }credits.hidden=!rows.children.length;
  }catch{/* Local artwork remains complete offline. */}
 }
 function select(value,upNext=null){
  track=value;const meta=editionMetadata(value||{}),source=artwork(value);
  next.hidden=!upNext;next.querySelector('.edition-next-name').textContent=upNext?[upNext.title,upNext.artist||upNext.channel].filter(Boolean).join(' · '):'';
  next.setAttribute('aria-label',upNext?'Open queue. Next: '+upNext.title:'Open queue');
  const signature=JSON.stringify([value?.id,value?.title,source,meta]);if(signature===key){boundaries();return}
  key=signature;generation++;assetKey='';stage.dataset.edition=wall.dataset.edition=meta.style;stage.classList.toggle('edition-empty',!value);stage.classList.toggle('edition-long-title',(value?.title?.length||0)>55);
  title.textContent=value?.title||'Find your frequency';artist.textContent=value?meta.artist:'Open your library to begin';backdrop.textContent=value?meta.artist:'resonance.';
  album.querySelector('.edition-album-name').textContent=meta.album;year.textContent=meta.year;album.hidden=!meta.album&&!meta.year;
  genre.textContent=meta.genre;genre.hidden=!meta.genre;format.textContent=meta.format||'Your music. Your moment.';detail.hidden=!value;
  fragment.replaceChildren();credits.hidden=true;stage.classList.toggle('edition-no-art',!source);stage.style.setProperty('--edition-art-ratio',ratios.get(source)||1);
  if(source){const img=new Image();img.alt='';img.decoding='async';const request=generation;
   img.onload=()=>{const ratio=Math.max(.85,Math.min(1.78,img.naturalWidth/img.naturalHeight));ratios.set(source,ratio);if(ratios.size>32)ratios.delete(ratios.keys().next().value);if(request===generation)stage.style.setProperty('--edition-art-ratio',ratio)};
   img.onerror=()=>{if(request===generation){fragment.replaceChildren();stage.classList.add('edition-no-art');}};img.src=source;fragment.append(img);}
  enter();
  boundaries();void loadAssets();
 }
 return {select,boundaries};
}
