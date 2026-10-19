import {settingsHub,sectionTabs} from './menu-kit.js';
import {storageCard,mountStorage} from './storage-ui.js';
export function installSettingsMenu({state,showDialog,closeDialog,soundDialog,api,updateGenreProgress}){
 const card=(title,body)=>`<section class="settings-card"><h2>${title}</h2>${body}</section>`;
 function open(page='home'){
  if(page==='playback'){soundDialog();return;}
  if(page==='home'){showDialog('Settings','',settingsHub());return;}
  if(page==='library'){
   showDialog('Library & downloads','Connect, refresh and organize your collection.',
    card('Add & update music','<div class="source-actions"><button class="primary" data-source-add>Add music</button><button class="secondary" data-action="sync">Playlist downloads</button><button class="secondary" data-source-manage>Manage sources</button><button class="secondary" data-action="scan">Rescan folders</button></div><p>Rescan finds files already on your computer. Playlist downloads finds new songs online.</p><p id="scan-errors" class="fine-print"></p>')+
    card('Download quality',`<div class="setting-row"><div><h3>New downloads</h3><p>Original quality avoids another encode. FLAC uses more space without restoring lost detail.</p></div><select id="download-format" aria-label="Download quality"><option value="best" ${state.config.downloadFormat==='best'?'selected':''}>Original quality</option><option value="flac" ${state.config.downloadFormat==='flac'?'selected':''}>FLAC</option></select></div>`)+
    card('Library details','<p>Find missing artists, releases and genres. Your manual edits are protected.</p><div class="source-actions"><button class="secondary" data-action="review-metadata">Library review</button><button class="secondary" data-action="enrich">'+(state.status.enrich?.running?'Pause matching':'Find artist & release details')+'</button></div><p id="enrich-status" class="fine-print"></p><div class="setting-row"><div><h3>Genre discovery</h3><p data-genre-progress role="status"></p></div><button class="secondary" data-action="genres">Discover genres</button></div><button class="text-button" data-settings-genres>Browse genres →</button>'));
   updateGenreProgress(state.status.genres);return;
  }
  if(page==='storage'){showDialog('Storage','An estimate of everything kept on this computer.',storageCard());mountStorage(document.querySelector('#dialog .storage-card'),api);return;}
  if(page==='updates'){showDialog('App updates','Your music and settings stay with you.','<div id="app-update-slot">'+(!window.resonanceDesktop?.installUpdate?'<p>Open the desktop app to install updates. This browser preview cannot replace an installed app.</p>':'')+'</div>');return;}
  if(page==='help'){
   showDialog('Help & gestures','Keep the controls within reach.',card('Mouse controls',`<div class="help-grid">${[
    ['Orbit the scene','Hold left click on the background and drag in any direction.'],['Volume','Scroll the background or mascot. Hold Shift for finer adjustment; click the volume percentage for an exact value.'],['Change songs','Hold right click and drag right for next, left for previous.'],['Seek or cancel','Right-drag up / down to seek. Left-click while holding right click, or press Escape, to cancel.'],['Library & song details','Library opens your collection. Click a song cover or title in the list to play; the player cover or title opens its details.'],['Close a panel','Use × or click outside. Back returns to the previous menu without losing your place.']
   ].map(([t,d])=>`<div><b>${t}</b><p>${d}</p></div>`).join('')}</div>`)+card('Keyboard shortcuts','<p>Space · play / pause<br>L · Library &nbsp; Q · Queue &nbsp; H · Immerse<br>Ctrl K · Search &nbsp; F11 · Fullscreen<br>Alt ← / → · Previous / next &nbsp; Escape · Back / close</p>')+card('Your files stay yours','<p>Metadata changes and listening edits are saved in Resonance. Your original audio files are not rewritten. A play counts after 30 seconds, or half of a shorter song. Long mixes remember your position.</p>'));return;
  }
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-settings-page],[data-settings-genres]');if(!b)return;if(b.hasAttribute('data-settings-genres')){closeDialog();document.querySelector('[data-view=genres]').click();return;}open(b.dataset.settingsPage);});
 return {open};
}

export function organizeVisualMenu(panel){
 const root=panel.querySelector('.signature-controls'),sections=[...root.querySelectorAll(':scope > .signature-section')];
 const [character,light,motion,performance,camera,extrasDetails]=sections;
 const heading=root.querySelector('.signature-heading');heading.querySelector('span')?.remove();heading.querySelector('b').textContent='Visuals & mascot';
 const close=document.createElement('button');close.type='button';close.className='icon-button';close.textContent='×';close.setAttribute('aria-label','Close visual settings');close.onclick=()=>document.querySelector('#room-visual-settings').click();heading.append(close);
 // The tab is the disclosure; a second nested Bonus effects disclosure is redundant.
 const extras=document.createElement('section');extras.className=extrasDetails.className;
 extras.append(...[...extrasDetails.childNodes].filter(n=>n.nodeName!=='SUMMARY'));extrasDetails.replaceWith(extras);
 const groups=document.createElement('div');root.append(groups);
 sectionTabs(groups,[['style','Style',[character,light]],['motion','Motion',[motion,camera]],['display','Display',[performance]],['extras','Extras',[extras]]],{label:'Visual settings sections',scroller:panel});
 for(const [node,title] of [[motion,'Response & movement'],[camera,'Camera'],[performance,'Display & performance']]){const h=document.createElement('h3');h.textContent=title;node.prepend(h);}
}

export function organizeSongDetails(root,{initial='overview',onSelect}={}){
 const body=root.querySelector('.dialog-body'),story=body.querySelector('.song-story');
 const lyrics=story.querySelector('.song-lyrics'),edit=body.querySelector('.song-edit'),analysis=body.querySelector('.listening-edit');
 const search=body.querySelector('.song-search:not(.listening-edit)');
 edit.open=true;
 // Lyrics are a dedicated tab; remove the redundant keyboard-toggleable disclosure.
 if(lyrics){lyrics.open=true;const summary=lyrics.querySelector('summary');if(summary){summary.tabIndex=-1;summary.setAttribute('aria-hidden','true');summary.hidden=true;}}
 const overview=[...body.children].filter(n=>![lyrics,edit,search,analysis].includes(n));
 sectionTabs(body,[['overview','Overview',overview],['lyrics','Lyrics',[lyrics]],['listening','Listening edit',[analysis]],['details','Edit details',[search,edit]]],{label:'Song details sections',initial,onSelect});
}
