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
export function editionListeningStats(track={}){
 const plays=Math.max(0,Math.floor(Number(track.plays)||0)),seconds=Math.max(0,Number(track.listenedSeconds)||0);
 const time=seconds>=3600?(seconds/3600).toFixed(1)+' h':seconds>=60?Math.floor(seconds/60)+' min':Math.floor(seconds)+' s';
 return [{value:String(plays).padStart(2,'0'),label:'PLAYS'},{value:time,label:'TIME TOGETHER'},{
  value:track.duration>0?Math.floor(track.duration/60)+':'+String(Math.floor(track.duration%60)).padStart(2,'0'):'—',label:'RUNNING TIME'}];
}
const element=(tag,className,text)=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
export function editionComposition(track={}){const identity=[track.artist||track.channel,track.title,track.album,track.genre].join('|');let seed=2166136261;for(const c of identity)seed=Math.imul(seed^c.charCodeAt(0),16777619);return {variant:Math.abs(seed)%3,tilt:(Math.abs(seed>>>4)%9)-4,number:String((seed>>>0)%999+1).padStart(3,'0')};}
export function installMusicEdition({related=()=>[],motion=()=>true,mobile=false,artwork=track=>track?.artwork?'/artwork/'+encodeURIComponent(track.artwork):'',details=()=>{},queue=()=>{},assets=null}={}){
 const stage=document.querySelector('#music-only-stage'),wall=document.querySelector('#music-wallpaper');
 if(!stage||!wall)return {select(){}};
 stage.classList.add('music-edition');stage.dataset.platform=mobile?'mobile':'desktop';
 wall.replaceChildren();wall.className='edition-wall';wall.append(element('div','edition-aura'),element('div','edition-lines'),element('div','edition-texture'));
 const backdrop=element('div','edition-backprint');backdrop.setAttribute('aria-hidden','true');wall.append(backdrop);
 const cover=stage.querySelector('#music-cover-play,#cover-play'),title=stage.querySelector('#music-only-title'),artist=stage.querySelector('#music-only-artist'),note=stage.querySelector('.music-stage-note');
 stage.querySelector('.eyebrow')?.remove();
 const art=element('div','edition-art'),frame=element('div','edition-frame'),disc=element('div','edition-disc'),fragment=element('div','edition-fragment');
 const memory=element('div','edition-memory');memory.setAttribute('aria-hidden','true');art.append(memory);
 disc.setAttribute('aria-hidden','true');fragment.setAttribute('aria-hidden','true');frame.append(cover);art.append(disc,fragment,frame);
 const caption=element('div','edition-art-caption');caption.innerHTML='<span>RESONANCE</span><span>THE LISTENING EDITION</span>';art.append(caption);
 const swatches=element('div','edition-swatches');swatches.setAttribute('aria-hidden','true');swatches.innerHTML='<i></i><i></i><i></i>';art.append(swatches);
 const copy=element('div','edition-copy'),kicker=element('div','edition-kicker','A MOMENT, JUST FOR MUSIC'),genre=element('div','edition-genre'),byline=element('div','edition-byline'),album=element('div','edition-album'),year=element('span','edition-year');
 byline.append(artist);album.append(element('span','edition-album-name'),year);
 const rule=element('div','edition-rule');rule.setAttribute('aria-hidden','true');
 const detail=element('button','edition-details','Behind the sound ↗');detail.type='button';detail.onclick=()=>{if(track)details(track);};
 const ledger=element('dl','edition-ledger');ledger.setAttribute('aria-label','Your listening history');
 copy.append(kicker,title,byline,rule,album,genre);
 const actions=element('div','edition-actions');actions.append(detail);copy.append(actions);
 const footer=element('div','edition-footer'),format=element('span','edition-format'),next=element('button','edition-next');next.type='button';next.onclick=queue;
 next.append(element('span','edition-next-label','UP NEXT'),element('span','edition-next-name'),element('span','edition-next-arrow','↗'));footer.append(format,next);
 stage.replaceChildren(art,copy,ledger,footer,...(note?[note]:[]));
 // Credits open above the composition; they never push the player off screen.
 document.querySelector('#edition-credits-panel')?.remove();
 const credits=element('button','edition-credits','Artwork credits');credits.type='button';credits.hidden=true;actions.append(credits);
 const creditPanel=element('section','edition-credits-panel');creditPanel.id='edition-credits-panel';creditPanel.setAttribute('popover','auto');creditPanel.setAttribute('aria-label','Artwork credits');
 creditPanel.innerHTML='<header><h2>Artwork credits</h2><button type="button" aria-label="Close artwork credits">×</button></header><div></div>';document.body.append(creditPanel);
 credits.setAttribute('aria-controls',creditPanel.id);credits.setAttribute('aria-expanded','false');credits.onclick=()=>creditPanel.togglePopover();
 creditPanel.querySelector('button').onclick=()=>{creditPanel.hidePopover();credits.focus({preventScroll:true});};
 creditPanel.addEventListener('toggle',()=>credits.setAttribute('aria-expanded',String(creditPanel.matches(':popover-open'))));
 let track=null,key='',generation=0,assetKey='',timer,lastMode=document.body.dataset.listeningMode;
 const ratios=new Map();
 function enter(){clearTimeout(timer);stage.classList.remove('edition-arrive');void stage.offsetWidth;stage.classList.add('edition-arrive');timer=setTimeout(()=>stage.classList.remove('edition-arrive'),700);}
 function boundaries(){
  const still=mobile||!motion()||matchMedia('(prefers-reduced-motion: reduce)').matches;stage.classList.toggle('edition-still',still);wall.classList.toggle('edition-still',still);
  if(document.body.dataset.listeningMode!=='music'&&!document.body.classList.contains('visualizer-return'))return;
  const dock=document.querySelector('.room-dock'),header=document.querySelector('.room-top'),modes=mobile?document.querySelector('.mobile-modes'):null;
  const top=Math.max(header?.getBoundingClientRect().bottom||0,modes?.getBoundingClientRect().bottom||0)+18;
  const rect=dock?.getBoundingClientRect(),sideDock=mobile&&innerWidth>innerHeight&&rect?.top<innerHeight/2;
  const bottom=sideDock?18:Math.max(24,innerHeight-(rect?.top||innerHeight)+22),height=Math.max(0,innerHeight-top-bottom);
  stage.style.setProperty('--edition-height',height+'px');
  stage.style.setProperty('--edition-top',top+'px');
  stage.style.setProperty('--edition-bottom',sideDock?'18px':Math.max(24,innerHeight-(rect?.top||innerHeight)+22)+'px');
  stage.style.setProperty('--edition-right',sideDock?(innerWidth-rect.left+18)+'px':mobile?'20px':'5vw');
  stage.classList.toggle('edition-compact',height<430);
  stage.classList.toggle('edition-tight',height<270);
 }
 const observer=new ResizeObserver(boundaries);for(const node of [document.querySelector('.room-dock'),document.querySelector('.room-top'),document.querySelector('.mobile-modes')])if(node)observer.observe(node);
 window.addEventListener('resize',boundaries);
 document.addEventListener('resonance-text-size',boundaries);
 let pointerFrame=0,px=0,py=0;
 const paintPointer=()=>{pointerFrame=0;for(const layer of [stage,wall]){layer.style.setProperty('--edition-x',px+'px');layer.style.setProperty('--edition-y',py+'px');}};
 if(!mobile){
  const reset=()=>{px=py=0;if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);};
  document.addEventListener('pointermove',e=>{
   if(document.body.dataset.listeningMode!=='music'||e.pointerType==='touch')return;
   if(!motion()||matchMedia('(prefers-reduced-motion: reduce)').matches){reset();return;}
   px=(e.clientX/innerWidth-.5)*32;py=(e.clientY/innerHeight-.5)*24;
   if(!pointerFrame)pointerFrame=requestAnimationFrame(paintPointer);
  },{capture:true,passive:true});
  document.documentElement.addEventListener('pointerleave',reset);window.addEventListener('blur',reset);
 }
 new MutationObserver(()=>{const mode=document.body.dataset.listeningMode;if(mode===lastMode)return;lastMode=mode;boundaries();if(mode==='music'){enter();void loadAssets();}else{px=py=0;paintPointer();creditPanel.hidePopover();}}).observe(document.body,{attributes:true,attributeFilter:['data-listening-mode']});
 async function loadAssets(){
  if(!assets||!track||document.body.dataset.listeningMode!=='music'||assetKey===key)return;
  assetKey=key;const request=generation;
  try{const value=await assets(track);if(request!==generation)return;
   const items=(value||[]).filter(a=>a.file).slice(0,3),item=items.find(a=>a.kind!=='cover')||items[0];if(!item)return;
   const img=new Image();img.alt='';img.decoding='async';img.src='/wallpapers/'+encodeURIComponent(item.file);
   img.onload=()=>{if(request===generation){fragment.replaceChildren(img);stage.classList.add('edition-has-portrait');}};
   const extra=items.find(a=>a.file!==item.file);if(extra){const photo=new Image();photo.alt='';photo.decoding='async';photo.src='/wallpapers/'+encodeURIComponent(extra.file);photo.onload=()=>{if(request===generation)memory.replaceChildren(photo);};}
   const rows=creditPanel.querySelector('div');rows.replaceChildren();
   for(const a of value){let url;try{url=new URL(a.source);}catch{continue}
    if(url.protocol!=='https:'||!['musicbrainz.org','www.youtube.com','en.wikipedia.org','commons.wikimedia.org','creativecommons.org'].includes(url.hostname))continue;
    const row=element('p',''),link=element('a','',a.label||'Artwork');link.href=url.href;link.target='_blank';link.rel='noreferrer';row.append(link,document.createTextNode(' '+[a.credit,a.license].filter(Boolean).join(' · ')));rows.append(row);
   }credits.hidden=!rows.children.length;
  }catch{/* Local artwork remains complete offline. */}
 }
 function select(value,upNext=null){
  track=value;const meta=editionMetadata(value||{}),source=artwork(value);
  const stats=editionListeningStats(value||{}),statsKey=JSON.stringify(stats);
  ledger.hidden=!value;
  if(ledger.dataset.stats!==statsKey){ledger.dataset.stats=statsKey;ledger.replaceChildren(...stats.map(s=>{const cell=element('div','');cell.append(element('dt','',s.label),element('dd','',s.value));return cell;}));}
  next.hidden=!upNext;next.querySelector('.edition-next-name').textContent=upNext?[upNext.title,upNext.artist||upNext.channel].filter(Boolean).join(' · '):'';
  next.setAttribute('aria-label',upNext?'Open queue. Next: '+upNext.title:'Open queue');
  const signature=JSON.stringify([value?.id,value?.title,source,meta]);if(signature===key){boundaries();return}
  key=signature;generation++;assetKey='';const composition=editionComposition(value||{});stage.dataset.composition=String(composition.variant);stage.style.setProperty('--edition-tilt',composition.tilt+'deg');caption.lastElementChild.textContent='LISTENING EDITION / '+composition.number;stage.classList.remove('edition-has-portrait');memory.replaceChildren();const companion=related(value).find(t=>artwork(t)&&artwork(t)!==source);if(companion){const pic=new Image();pic.alt='';pic.decoding='async';pic.src=artwork(companion);memory.append(pic);}stage.dataset.edition=wall.dataset.edition=meta.style;stage.classList.toggle('edition-empty',!value);stage.classList.toggle('edition-long-title',(value?.title?.length||0)>55);
  title.textContent=value?.title||'Find your frequency';title.title=title.textContent;artist.textContent=value?meta.artist:'Open your library to begin';artist.title=artist.textContent;backdrop.textContent=value?meta.artist:'resonance.';
  album.querySelector('.edition-album-name').textContent=meta.album;year.textContent=meta.year;album.hidden=!meta.album&&!meta.year;
  genre.textContent=meta.genre;genre.hidden=!meta.genre;format.textContent=meta.format||'Your music. Your moment.';detail.hidden=!value;
  fragment.replaceChildren();creditPanel.hidePopover();credits.hidden=true;stage.classList.toggle('edition-no-art',!source);stage.style.setProperty('--edition-art-ratio',ratios.get(source)||1);
  if(source){const img=new Image();img.alt='';img.decoding='async';const request=generation;
   img.onload=()=>{const ratio=Math.max(.85,Math.min(1.78,img.naturalWidth/img.naturalHeight));ratios.set(source,ratio);if(ratios.size>32)ratios.delete(ratios.keys().next().value);if(request===generation)stage.style.setProperty('--edition-art-ratio',ratio)};
   img.onerror=()=>{if(request===generation){fragment.replaceChildren();stage.classList.add('edition-no-art');}};img.src=source;fragment.append(img);}
  enter();
  boundaries();void loadAssets();
 }
 return {select,boundaries};
}
