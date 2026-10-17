// This tiny classic script runs before the application module graph is loaded.
(()=>{
 const host=document.getElementById('startup'),status=document.getElementById('startup-status');
 if(!host)return;
 const started=performance.now();let done=false,slow;const covered=new Map();
 const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const stage=text=>{if(!done)status.textContent=text;};
 const prepareReveal=()=>{for(const element of document.body.children){if(element===host||element.tagName==='SCRIPT'||covered.has(element))continue;covered.set(element,element.inert);element.inert=true;}document.body.classList.add('startup-prepared');};
 const finish=async()=>{if(done)return;done=true;clearTimeout(slow);await pause(Math.max(0,650-(performance.now()-started)));document.body.classList.add('startup-ready');document.body.classList.remove('startup-loading');for(const [element,inert]of covered)element.inert=inert;covered.clear();host.classList.add('leaving');await pause(matchMedia('(prefers-reduced-motion: reduce)').matches?0:680);host.remove();document.body.classList.remove('startup-prepared');};
 const fail=message=>{if(done)return;clearTimeout(slow);status.textContent=message;status.dataset.error='true';document.getElementById('startup-retry').hidden=false;};
 document.getElementById('startup-retry').onclick=()=>location.reload();
 document.getElementById('startup-quiet').onclick=()=>window.resonanceBoot.onQuiet?.();
 slow=setTimeout(()=>{if(!done){stage('Taking a little longer to prepare the scene…');document.getElementById('startup-quiet').hidden=!window.resonanceBoot.onQuiet;document.getElementById('startup-retry').hidden=false;}},10000);
 window.resonanceBoot={stage,finish,fail,prepareReveal,animate:()=>host.classList.add('startup-running')};
 window.addEventListener('error',()=>fail('Something could not load. Try opening Resonance again.'));
})();
