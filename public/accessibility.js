export const TEXT_SIZES=Object.freeze({standard:1,comfortable:1.15,large:1.3});
export function accessibilityPreferences(value={}){
 return {textSize:Object.hasOwn(TEXT_SIZES,value.textSize)?value.textSize:'standard',strongText:value.strongText===true};
}
export function applyAccessibility(value={}){
 const p=accessibilityPreferences(value),root=document.documentElement;
 root.dataset.textSize=p.textSize;root.classList.toggle('strong-text',p.strongText);
 root.style.setProperty('--ui-text-scale',TEXT_SIZES[p.textSize]);
 document.dispatchEvent(new CustomEvent('resonance-text-size',{detail:TEXT_SIZES[p.textSize]}));
}
export function accessibilitySettings(p={},mobile=false){
 const attr=mobile?'data-pref':'data-preference',value=accessibilityPreferences(p);
 return `<section class="settings-card card"><h3>Reading comfort</h3><label class="field">Text size<select aria-label="Text size" ${attr}="textSize"><option value="standard" ${value.textSize==='standard'?'selected':''}>Standard</option><option value="comfortable" ${value.textSize==='comfortable'?'selected':''}>Comfortable · 115%</option><option value="large" ${value.textSize==='large'?'selected':''}>Large · 130%</option></select></label><p>Enlarges interface text without enlarging the visualizer. Panels can scroll when more room is needed.</p><label class="setting-row accessibility-switch"><span>Stronger secondary text</span><input type="checkbox" aria-label="Stronger secondary text" ${attr}="strongText" ${value.strongText?'checked':''}></label><p>Brightens supporting labels and descriptions.</p></section><section class="settings-card card"><h3>Keyboard access</h3><p>Tab moves between controls. Shift + Tab goes back. Enter or Space activates a button. Arrow keys move between tabs. Escape returns or closes a panel.</p><p>In Constellation, focus the map to rotate with arrow keys, pan with Shift + arrows, and zoom with + / −. Search and Explore provide text alternatives to selecting stars.</p></section>`;
}
