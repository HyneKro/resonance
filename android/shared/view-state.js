// Keep native scrolling and keyboard focus stable when local data refreshes a panel.
export function rememberView(root){
  const active=root.contains(document.activeElement)?document.activeElement:null;
  const attrs=active?[...active.attributes].filter(a=>a.name==='id'||a.name.startsWith('data-')).map(a=>[a.name,a.value]):[];
  const selector=attrs.map(([name,value])=>`[${name}="${CSS.escape(value)}"]`).join('');
  const top=root.scrollTop;
  return ()=>{if(selector)root.querySelector(selector)?.focus({preventScroll:true});root.scrollTop=top;};
}
