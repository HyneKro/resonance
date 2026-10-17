const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');app.setPath('userData',path.join(out,'android-shuffle-profile'));
let win,server,finished=false;const errors=[],checks=[],sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function finish(ok,error){if(finished)return;finished=true;const report={ok,error,checks,errors,scope:'Real browser touch/UI and bridge contract with a simulated native player; native shuffle is checked separately in JVM/device tests.'};fs.writeFileSync(path.join(out,'android-shuffle-check.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));win?.destroy();server?.close();app.exit(ok?0:1);}
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).slice(1)||'index.html';if(name.includes('..')||name.includes('\\'))throw Error('Path');
  let file=name==='test-native.js'?path.join(root,'android/tests',name):name.startsWith('artwork/')?path.join(root,'data',name):path.join(root,'android/web',name);
  if(!fs.existsSync(file))file=path.join(root,'android/shared',name);
  let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));
  res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(data);
 }catch{res.writeHead(404);res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:412,height:915,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.on('console-message',d=>{if(d.level==='error')errors.push(d.message);});
 await win.loadURL('http://127.0.0.1:'+server.address().port+'/?shuffle');const run=code=>win.webContents.executeJavaScript(code);
 for(let i=0;i<50&&await run("!!document.querySelector('#opening')");i++)await sleep(100);
 assert.equal(await run("!!document.querySelector('#opening')"),false);
 await win.webContents.debugger.attach('1.3');const cdp=(method,params)=>win.webContents.debugger.sendCommand(method,params);
 await cdp('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 const tap=async selector=>{const p=await run(`(()=>{const b=document.querySelector(${JSON.stringify(selector)});b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,id:0}})()`);await cdp('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[p]});await cdp('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await sleep(150);};
 const snapshot=()=>run("import('/native.js').then(({rpc})=>rpc('state'))");
 const old=await snapshot();await tap('#shuffle');let s=await snapshot();
 assert.equal(s.shuffle,true);assert.equal(s.id,old.id);assert.equal(s.position,old.position);assert.equal(s.playing,old.playing);
 assert.equal(await run("document.querySelector('#shuffle').getAttribute('aria-pressed')"),'true');assert.match(await run("document.querySelector('#toasts').textContent"),/Shuffle on/);
 assert.match(await run("getComputedStyle(document.querySelector('#shuffle')).backgroundImage"),/gradient/);
 const call=await run("window.shuffleTestCalls.find(c=>c.action==='shuffle')");assert.deepEqual(call.data,{});checks.push('A real touch toggles native shuffle, preserves current playback and clearly highlights the button');
 await tap('#queue');
 const listed=await run("(()=>{const heading=[...document.querySelectorAll('.section-label')].find(e=>e.textContent.includes('NOW & NEXT'));let rows=[];for(let e=heading.nextElementSibling;e;e=e.nextElementSibling){const b=e.querySelector('[data-play]');if(b)rows.push(b.dataset.play);}return rows})()");
 assert.deepEqual(listed,s.playbackOrder);assert.notDeepEqual(listed,s.queue);checks.push('Now & next shows the native shuffled order instead of library order');
 const chosen=listed[2];await tap(`[data-play="${chosen}"]`);s=await snapshot();assert.equal(s.id,chosen);assert.deepEqual(s.playbackOrder,listed);
 const playCall=await run("window.shuffleTestCalls.filter(c=>c.action==='play').at(-1)");assert.deepEqual(playCall.data,{id:chosen,position:0});
 await tap('#next');assert.equal((await snapshot()).id,listed[3]);await tap('#previous');assert.equal((await snapshot()).id,chosen);checks.push('Picking a queued song preserves its order; next and previous follow it');
 await tap('#shuffle');s=await snapshot();assert.equal(s.shuffle,false);const expected=s.queue[(s.index+1)%s.queue.length];await tap('#next');assert.equal((await snapshot()).id,expected);checks.push('Disabling shuffle restores playlist order from the current song');
 await tap('#repeat');assert.equal((await snapshot()).repeat,1);await tap('#shuffle');assert.equal((await snapshot()).repeat,2);assert.match(await run("document.querySelector('#toasts').textContent"),/repeat track off/);checks.push('Enabling shuffle after repeat-one explains why repeat-one is turned off');
 await run("document.querySelector('#library').click()");await tap('[data-play="preview2"]');s=await snapshot();assert.equal(s.shuffle,true);assert.equal(s.playbackOrder[0],'preview2');assert.equal(s.queue.length,6);checks.push('Starting another library song retains shuffle for the new queue');
 const logic=await run(`import('/mobile-queue.js').then(({upcomingIds,queuePlaybackRequest,toggleShuffle})=>{
  const rotated=upcomingIds({id:'c',queue:['a','b','c'],playbackOrder:['b','c','a']});
  const empty=upcomingIds({id:'',queue:[]});const missing=queuePlaybackRequest({queue:['a']},'b');
  const button=document.createElement('button'),audio={snapshot:{shuffle:false},update(s){this.snapshot=s}};let calls=0,resolve;const rpc=()=>{calls++;return new Promise(r=>resolve=r)};
  const a=toggleShuffle({audio,rpc,toast:()=>{},button});const b=toggleShuffle({audio,rpc,toast:()=>{},button});resolve({shuffle:true});return Promise.all([a,b]).then(()=>({rotated,empty,missing,calls,busy:button.hasAttribute('aria-busy')}));
 })`);assert.deepEqual(logic,{rotated:['c','a','b'],empty:[],missing:null,calls:1,busy:false});checks.push('Queue wraparound, empty queues and overlapping shuffle taps are handled');
 assert.deepEqual(errors,[]);await finish(true);
}).catch(e=>finish(false,e.stack));setTimeout(()=>finish(false,'Timed out'),45000).unref();
