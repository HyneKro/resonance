const assert=require('node:assert/strict');
module.exports=async function touchChecks(win){
 const run=code=>win.webContents.executeJavaScript(code),pause=ms=>new Promise(r=>setTimeout(r,ms)),checks=[];
 await win.webContents.debugger.attach('1.3');const cdp=(method,params)=>win.webContents.debugger.sendCommand(method,params);
 try{
  await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  const swipe=async(x,y,dx,dy)=>{await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:0}]});for(let i=1;i<=12;i++){await cdp('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12,id:0}]});await pause(20);}await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(200);};
  const reset=await run(`(()=>{const s=document.querySelector('[data-pref=eqMid]'),b=document.querySelector('[data-reset=eqMid]');s.value='7';s.dispatchEvent(new Event('input',{bubbles:true}));b.scrollIntoView({block:'center'});b.focus({preventScroll:true});window.polishReset=b;return document.querySelector('#sheet-body').scrollTop})()`);
  await run('window.polishReset.click()');await pause(200);assert.ok(await run(`document.querySelector('[data-pref=eqMid]').value==='0'&&document.querySelector('#sheet-body').scrollTop===${reset}&&document.activeElement===window.polishReset`));checks.push({name:'Android EQ reset retains scroll and focus',pass:true});
  const slider=await run(`(()=>{const s=document.querySelector('[data-pref=eqLow]');s.scrollIntoView({block:'center'});const r=s.getBoundingClientRect();return {x:r.left+r.width*.55,y:r.top+r.height/2,value:s.value,scroll:document.querySelector('#sheet-body').scrollTop}})()`);
  await swipe(slider.x,slider.y,0,-100);const after=await run(`({value:document.querySelector('[data-pref=eqLow]').value,scroll:document.querySelector('#sheet-body').scrollTop})`);
  assert.equal(after.value,slider.value);assert.ok(after.scroll>slider.scroll+30);checks.push({name:'Android vertical touch on a slider scrolls without changing audio',pass:true});
  const horizontal=await run(`(()=>{const s=document.querySelector('[data-pref=eqLow]');s.scrollIntoView({block:'center'});const r=s.getBoundingClientRect();return {x:r.left+r.width*.55,y:r.top+r.height/2,value:s.value}})()`);
  await swipe(horizontal.x,horizontal.y,-80,0);assert.notEqual(await run(`document.querySelector('[data-pref=eqLow]').value`),horizontal.value);checks.push({name:'Android deliberate horizontal drag changes the slider',pass:true});
 }finally{await cdp('Emulation.setTouchEmulationEnabled',{enabled:false});win.webContents.debugger.detach();}
 return checks;
};
