// Built website validation, with no personal app session and no page scripts.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/site-review'),dist=path.join(root,'download-page/dist');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'report.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')log(e.stack)});
const pause=ms=>new Promise(r=>setTimeout(r,ms));let win,server;
app.whenReady().then(async()=>{
 const requests=[],failures=[];
 server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');let name=decodeURIComponent(u.pathname.replace(/^\/resonance\//,''));if(!name||name.endsWith('/'))name+='index.html';const file=path.resolve(dist,name);
  if(!file.startsWith(dist+path.sep)){res.writeHead(404);return res.end()}
  try{const data=fs.readFileSync(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.writeHead(404);res.end();failures.push(name)}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port+'/resonance/';
 win=new BrowserWindow({show:false,width:1440,height:1000,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.session.webRequest.onBeforeRequest((d,cb)=>{requests.push(d.url);cb({cancel:!d.url.startsWith(base)&&!d.url.startsWith('devtools:')})});
 const run=s=>win.webContents.executeJavaScript(s,true);
 for(const [w,h]of [[1440,1000],[1024,800],[768,1024],[390,844],[320,740]]){
  win.setSize(w,h);
  for(const page of ['index.html','guide.html']){
   await win.loadURL(base+page);await pause(400);
   await run(`Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode().catch(()=>{})}))`);
   const report=await run(`(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth+1,images:[...document.images].every(i=>i.complete&&i.naturalWidth>0),h1:document.querySelectorAll('h1').length,unnamed:[...document.querySelectorAll('a,summary')].filter(e=>!e.textContent.trim()&&!e.getAttribute('aria-label')&&!e.querySelector('img[alt]')).length}))()`);
   assert.equal(report.overflow,false,`${page} ${w} horizontal overflow`);assert.equal(report.images,true);assert.equal(report.h1,1);assert.equal(report.unnamed,0);log(JSON.stringify({page,w,...report}));
   if(w===1440||w===390)fs.writeFileSync(path.join(out,page+'-'+w+'.png'),(await win.webContents.capturePage()).toPNG());
   if(page==='index.html'){
    const expected=JSON.parse(fs.readFileSync(path.join(dist,'downloads.json')));
    const links=await run(`[...document.querySelectorAll('.download-button')].map(e=>e.href)`);assert.deepEqual(links,[expected.pc.url,expected.android.url]);
    await run(`document.querySelector('summary').focus()`);win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});await win.webContents.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});win.webContents.debugger.detach();await pause(100);assert.equal(await run(`document.querySelector('details').open`),true,'FAQ keyboard activation');
    await run(`document.querySelector('#downloads').scrollIntoView({behavior:'instant'})`);await pause(120);
    if(w===1440||w===390)fs.writeFileSync(path.join(out,'downloads-'+w+'.png'),(await win.webContents.capturePage()).toPNG());
    const guide=await run(`document.querySelector('a[href="./guide.html#lyrics"]').href`);await win.loadURL(guide);assert.equal(await run(`!!document.querySelector(location.hash)`),true,'deep guide link');
   }
  }
 }
 // Forced reduced motion must suppress smooth scrolling.
 win.webContents.debugger.attach('1.3');await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});assert.equal(await run(`getComputedStyle(document.documentElement).scrollBehavior`),'auto');win.webContents.debugger.detach();
 assert.deepEqual(failures,[]);assert.ok(requests.every(u=>u.startsWith(base)),'No third-party page requests');
 log('PASS: 10 responsive layouts; images; no horizontal page overflow; exact download destinations; keyboard FAQ; guide deep links; reduced motion; no third-party requests.');
}).catch(e=>{log(e.stack);process.exitCode=1}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));app.exit(process.exitCode||0)});
setTimeout(()=>app.exit(2),90000).unref();
