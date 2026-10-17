const glyphs={r:'M1 23V8M1 14Q4 6 12 8',e:'M1 15H14Q14 6 7 7Q0 7 0 15Q0 25 13 21',s:'M13 9Q2 4 1 11Q0 15 8 15Q16 16 13 21Q10 26 0 21',o:'M7 7C-3 7 -3 23 7 23C17 23 17 7 7 7',n:'M0 23V8M0 13Q2 7 7 7Q14 7 14 14V23',a:'M13 22V8M13 12Q10 5 4 8Q-2 11 0 18Q3 27 13 19',c:'M13 9Q6 4 1 10Q-3 17 3 22Q8 25 13 21'};
// A custom clef drawn as tapered ribbons: an open resonating curl,
// a tall loop and a small suspended tail. Separate ribbons keep crossings solid.
const clefStrokes=[
 [[23,30],[16,29],[18,22],[25,22],1.8,4],
 [[25,22],[37,21],[40,34],[29,39],4,5],
 [[29,39],[17,45],[8,36],[11,28],5,4],
 [[11,28],[14,19],[31,18],[29,8],4,3.2],
 [[29,8],[28,1],[23,0],[21,7],3.2,3.8],
 [[21,7],[17,18],[24,28],[26,39],3.8,2.8],
 [[26,39],[29,49],[15,49],[16,43],2.8,4.8]
];
function ink([a,b,c,d,w0,w1]){
 const left=[],right=[];
 for(let i=0;i<=32;i++){
  const t=i/32,u=1-t,x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0],y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
  const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]),dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
  const w=(w0+(w1-w0)*t)/2,n=Math.hypot(dx,dy);const overlap=i===0?-.12:i===32?.12:0;left.push([x-dy/n*w+dx/n*overlap,y+dx/n*w+dy/n*overlap]);right.push([x+dy/n*w+dx/n*overlap,y-dx/n*w+dy/n*overlap]);
 }
 return '<path d="'+[...left,...right.reverse()].map((p,i)=>(i?'L':'M')+p.map(x=>x.toFixed(3)).join(' ')).join('')+'Z"/>';
}
export const EMBLEM=clefStrokes.map(ink).join('')+'<path d="M18.4 43C18.4 46.2 13.6 46.2 13.6 43C13.6 39.8 18.4 39.8 18.4 43Z"/>';
export function brandMarkup(id){let x=63;const letters=[...'resonance'].map(letter=>{const out=`<path d="${glyphs[letter]}" transform="translate(${x} 8)"/>`;x+=20;return out;}).join('');return `<svg class="resonance-wordmark" viewBox="0 0 256 48" role="img" aria-label="Resonance"><defs><linearGradient id="brand-${id}" x2="1" y2="1"><stop class="brand-stop-a"/><stop offset="1" class="brand-stop-b"/></linearGradient></defs><g fill="none" stroke="url(#brand-${id})" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><g class="resonance-emblem" fill="url(#brand-${id})" stroke="none">${EMBLEM}</g><g class="resonance-lettering">${letters}</g><circle cx="249" cy="30" r="2" stroke-width="1.5"/></g></svg>`;}
export function installBrand(){document.querySelectorAll('.brand,#desktop-titlebar').forEach((el,i)=>{el.innerHTML=brandMarkup(String(i));el.setAttribute('aria-label',el.id==='desktop-titlebar'?'Resonance window title bar':'Resonance');});}
