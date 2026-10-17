// Shared menu language and navigation for the desktop and phone interfaces.
export const SETTINGS_SECTIONS = [
  ['playback', 'Playback & sound', 'Loudness, silent edges, equalizer and audio sync', 'sound'],
  ['library', 'Library & downloads', 'Add music, update playlists and find missing details', 'library'],
  ['storage', 'Storage', 'Music size, artwork and space on this device', 'storage'],
  ['updates', 'App updates', 'Check, download and install the latest version', 'updates'],
  ['help', 'Help & gestures', 'Controls, shortcuts and listening tips', 'help'],
];
const paths = {
  sound:'M4 5v14M12 5v14M20 5v14M1 9h6m2 6h6m2-7h6',
  visuals:'m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z',
  library:'M4 4v16M9 4v16M14 5l5-1 3 15-5 1z',
  storage:'M3 6c0-4 18-4 18 0s-18 4-18 0v12c0 4 18 4 18 0V6M3 12c0 4 18 4 18 0',
  updates:'M20 7a9 9 0 1 0 1 8M20 2v6h-6',
  help:'M9 8a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3v.1M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
};
export const menuIcon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.help}"/></svg>`;
export function settingsHub(){
  return `<p class="menu-intro">Make room for the way you listen.</p><div class="settings-hub">${SETTINGS_SECTIONS.map(([key,title,description,glyph])=>`<button type="button" class="menu-destination" data-settings-page="${key}"><span class="menu-glyph">${menuIcon(glyph)}</span><span><b>${title}</b><small>${description}</small></span><span class="menu-chevron" aria-hidden="true">›</span></button>`).join('')}</div><p class="menu-footnote">Changes save automatically. Use ↺ beside a setting to restore its default.</p>`;
}

// Keep actual controls and their handlers when going back, including unsaved forms.
export function capturePanel(root){
  const nodes=[...root.childNodes],scroll=root.scrollTop,click=root.onclick;
  const positions=[...root.querySelectorAll('*')].filter(n=>n.scrollTop||n.scrollLeft).map(n=>[n,n.scrollTop,n.scrollLeft]);
  const focus=root.contains(document.activeElement)?document.activeElement:null;
  const section=root.dataset.activeSection;
  return ()=>{root.replaceChildren(...nodes);root.onclick=click;if(section)root.dataset.activeSection=section;else delete root.dataset.activeSection;focus?.focus({preventScroll:true});root.scrollTop=scroll;for(const [n,top,left] of positions){n.scrollTop=top;n.scrollLeft=left;}for(const n of root.querySelectorAll('[data-resume-panel]'))n.dispatchEvent(new Event('panelresume'));};
}
export class PanelTrail {
  constructor(limit=12){this.limit=limit;this.clear();}
  clear(){this.current=null;this.entries=[];}
  enter(key,meta,capture){
    if(this.current?.key===key){this.current.meta=meta;return;}
    const existing=this.entries.findIndex(e=>e.key===key);
    if(existing>=0)this.entries.splice(existing);
    else if(this.current){this.entries.push({...this.current,restore:capture()});if(this.entries.length>this.limit)this.entries.shift();}
    this.current={key,meta};
  }
  back(){const entry=this.entries.pop();if(!entry)return null;this.current={key:entry.key,meta:entry.meta};entry.restore();return entry.meta;}
  get parent(){return this.entries.at(-1)?.meta;}
}

let tabId=0;
/** Split existing nodes without recreating inputs or losing their listeners. */
export function sectionTabs(root,groups,{label='Sections',scroller=root,initial,onSelect}={}){
  const id='menu-tabs-'+(++tabId),nav=document.createElement('div'),panels=[];
  nav.className='section-tabs';nav.setAttribute('role','tablist');nav.setAttribute('aria-label',label);
  const positions=new Map();let current;
  for(const [key,title,nodes] of groups){
    const panel=document.createElement('section'),button=document.createElement('button');
    panel.className='menu-section';panel.id=id+'-'+key;panel.dataset.menuSection=key;panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby',panel.id+'-tab');
    button.type='button';button.id=panel.id+'-tab';button.dataset.sectionTab=key;button.textContent=title;button.setAttribute('role','tab');button.setAttribute('aria-controls',panel.id);
    for(const node of nodes.filter(Boolean))panel.append(node);
    nav.append(button);root.append(panel);panels.push({key,panel,button});
    button.onclick=()=>select(key);
  }
  function select(key,focus=false){
    if(current)positions.set(current,scroller.scrollTop);
    current=panels.some(p=>p.key===key)?key:panels[0].key;
    for(const p of panels){const active=p.key===current;p.panel.hidden=!active;p.button.setAttribute('aria-selected',String(active));p.button.tabIndex=active?0:-1;if(active&&focus)p.button.focus({preventScroll:true});}
    scroller.scrollTop=positions.get(current)||0;root.dataset.activeSection=current;onSelect?.(current);
  }
  nav.onkeydown=e=>{const keys=['ArrowLeft','ArrowRight','Home','End'];if(!keys.includes(e.key))return;e.preventDefault();const index=panels.findIndex(p=>p.key===current),next=e.key==='Home'?0:e.key==='End'?panels.length-1:(index+(e.key==='ArrowRight'?1:-1)+panels.length)%panels.length;select(panels[next].key,true);};
  root.prepend(nav);select(initial||groups[0][0]);return {select,nav};
}
