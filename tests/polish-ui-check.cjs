// Isolated, deterministic UX tour. No owner library, downloads or installed app.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),phase=process.env.POLISH_PHASE||'current',out=path.join(root,'test-output/release-work/polish',phase);
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=value=>fs.appendFileSync(path.join(out,'runner.log'),String(value)+'\n');
// Windows GUI processes may outlive a launching shell. Never let a closed log
// pipe produce Electron's repeating native error dialogs during unattended QA.
for(const stream of [process.stdout,process.stderr])stream.on('error',error=>{if(error.code!=='EPIPE'){log(error.stack);app.exit(1);}});
process.on('uncaughtException',error=>{log(error.stack);app.exit(1);});
let win,service,server;const errors=[],screens=[],checks=[],pause=ms=>new Promise(r=>setTimeout(r,ms));
const run=code=>win.webContents.executeJavaScript(code);
async function until(code){for(let i=0;i<200;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function click(selector){await run(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('Missing '+${JSON.stringify(selector)});e.click()})()`);await pause(120);}
async function shot(name){await pause(160);const report=await run(`(()=>{
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&s.visibility!=='hidden'&&!e.closest('[hidden],[inert]')};
 const modal=document.querySelector('dialog[open]'),host=modal||document.body;
 const containers=[...host.querySelectorAll('.dialog-body,#sheet-body,.settings-card,.card,.page-heading,.detail-intro,.detail-title,.section-tabs,.settings-hub,.room-top,.mobile-modes,.room-dock')].filter(visible);
 const label=e=>(e.getAttribute('aria-label')||e.textContent||e.title||e.id).trim().slice(0,90);
 const controls=[...host.querySelectorAll('button,input,select')].filter(visible);
 return {width:innerWidth,height:innerHeight,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,
  overflow:containers.filter(e=>e.scrollWidth>e.clientWidth+2&&getComputedStyle(e).overflowX!=='auto').map(e=>({selector:e.id||e.className,extra:e.scrollWidth-e.clientWidth})),
  unnamed:controls.filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')&&!e.getAttribute('aria-labelledby')&&!e.textContent.trim()).map(e=>e.id||e.outerHTML.slice(0,140)),
  smallTargets:controls.filter(e=>{const r=e.getBoundingClientRect();return e.type!=='range'&&(r.height<36||r.width<32)}).map(e=>({label:label(e),width:Math.round(e.getBoundingClientRect().width),height:Math.round(e.getBoundingClientRect().height)})),
  focus:document.activeElement?.id||document.activeElement?.textContent?.slice(0,50)};
 })()`);screens.push({name,...report});fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());log(name+': '+JSON.stringify({overflow:report.overflow,unnamed:report.unnamed,small:report.smallTargets.length}));}
async function pcClose(){await run(`document.querySelector('#dialog[open] [data-action=close-dialog]')?.click()`);}
async function phoneClose(){await click('#sheet-close');}
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 const dataDir=fs.mkdtempSync(path.join(out,'data-'));service=await startServer({port:0,dataDir,autoScan:false});
 const wav=Buffer.alloc(44+44100*2*8);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(44100,24);wav.writeUInt32LE(88200,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);const file=path.join(dataDir,'fixture.wav');fs.writeFileSync(file,wav);
 const genres=['Electronic','Ambient','Rock','Jazz','Pop','Classical','Folk','Hip Hop'];
 for(let i=0;i<180;i++)service.lib.save({id:(100000+i).toString(16),path:file,fileName:'fixture.wav',title:i===0?'A very long song title — with an equally long subtitle (Live at the end of the universe, remastered edition)':i===1?'ひかりのなかで · 星の旅':i===2?'UnbrokenTitle'.repeat(12):'Night passage '+(i+1),artist:i%12===0?'Aster & The Midnight Orchestra':'Artist '+(i%12+1),genre:i%15===0?'':genres[i%genres.length],album:'A collection of very long memories from somewhere far away',duration:8,kind:i%28===0?'mix':'track',available:i!==3,size:wav.length,codec:'PCM',plays:i%4,addedAt:i+1,favorite:i%5===0,lyrics:Array.from({length:40},(_,j)=>'A quiet line of fixture lyrics '+j).join('\n')});
 service.lib.config.sources=[{id:'fixture',name:'A very long collection name — music for every kind of day',type:'folder',path:dataDir,kind:'track'}];Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off',quality:'eco',targetFPS:60,leveling:false});service.lib.setSetting('config',service.lib.config);service.lib.setSetting('player',{id:'186a0',position:2,volume:0,queue:['186a0','186a1','186a2'],queueIndex:0});
 win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 checks.push(...await run('('+require('./polish-behaviors.cjs').toString()+')()'));
 await shot('pc-listening');await click('#close-room');await shot('pc-library-home');
 for(const view of ['tracks','artists','genres','favorites']){await click('[data-view='+view+']');await shot('pc-library-'+view);}
 await click('[data-view=tracks]');await run(`document.querySelector('#search').value='No result exists';document.querySelector('#search').dispatchEvent(new Event('input',{bubbles:true}))`);await pause(400);await shot('pc-empty-search');checks.push({name:'Empty search disables Play all and offers recovery',pass:await run(`document.querySelector('[data-action=play-all]')?.disabled===true&&!!document.querySelector('[data-action=clear-filters]')`)});await click('[data-action=clear-filters]');await pause(400);
 await click('[data-view=mixes]');await click('[data-detail="186a0"]');
 for(const tab of ['overview','lyrics','listening','details']){await click('#dialog [data-section-tab='+tab+']');await shot('pc-song-'+tab);}

 await run(`window.polishWrites={};const originalFetch=window.fetch;window.fetch=async(...args)=>{const name=String(args[0]);if(args[1]?.method==='POST'&&['/api/track','/api/playlists'].includes(name)){window.polishWrites[name]=(window.polishWrites[name]||0)+1;await new Promise(r=>setTimeout(r,250));}return originalFetch(...args);};const form=document.querySelector('#metadata-form');form.querySelector('[name=album]').value='Saved album';form.requestSubmit();form.requestSubmit();const input=form.querySelector('[name=album]');input.value='Next unfinished edit';input.focus();input.setSelectionRange(5,9);`);
 await pause(900);
 checks.push({name:'Real metadata save submits once and preserves newer unfinished edits',pass:await run(`window.polishWrites['/api/track']===1&&document.querySelector('#metadata-form [name=album]').value==='Next unfinished edit'&&document.activeElement.name==='album'&&document.activeElement.selectionStart===5`)});
 await click('[data-add-playlist="186a0"]');await run(`document.querySelector('#playlist-form [name=name]').value='Polish fixture';document.querySelector('#playlist-form').requestSubmit();`);await click('[data-dialog-back]');await pause(700);
 checks.push({name:'Late playlist save does not close the menu returned to',pass:await run(`document.querySelector('#dialog').open&&document.querySelector('#dialog-title').textContent==='Behind the sound'&&document.querySelector('#metadata-form [name=album]').value==='Next unfinished edit'`)});
 await pcClose();await click('[data-view=settings]');await shot('pc-settings');
 for(const page of ['playback','library','storage','updates','help']){await click('[data-settings-page='+page+']');await pause(250);await shot('pc-settings-'+page);await click('[data-dialog-back]');}
 await pcClose();await click('#close-library');await click('#room-queue');await shot('pc-queue');await pcClose();
 await click('[data-listening-mode=visualizer]');await until(`!document.body.classList.contains('music-only')`);await pause(1000);await click('#room-visual-settings');
 for(const tab of ['style','motion','display','extras']){await click('.visual-tools [data-section-tab='+tab+']');await shot('pc-visual-'+tab);}
 await click('.visual-tools [aria-label="Close visual settings"]');checks.push({name:'Visual settings close returns focus',pass:await run(`document.activeElement.id==='room-visual-settings'`)});
 await click('[data-listening-mode=constellation]');await until(`!!document.querySelector('.constellation:not([hidden]) canvas')`);await pause(1500);await shot('pc-constellation');
 await run(`document.querySelector('[data-cx=journey]')?.click()`);await pause(200);await shot('pc-journey');
 await click('[data-listening-mode=music]');await pause(500);win.setSize(1000,720);await pause(250);await shot('pc-compact');await click('#close-room');await shot('pc-compact-library');await click('[data-view=settings]');await click('[data-settings-page=playback]');await shot('pc-compact-sound');
 server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#745b9c"/></svg>');return;}try{let data=fs.readFileSync(file);if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));if(name==='test-native.js')data=Buffer.from(data.toString().replace("title:'Millennium'","title:'A very long song title — with an equally long subtitle (Live at the end of the universe)'"));res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/?shuffle&skip&update-ready');await until(`!document.querySelector('#opening')`);await pause(500);
 checks.push(...(await run('('+require('./polish-behaviors.cjs').toString()+')()')).map(c=>({...c,name:'Android: '+c.name})));
 await shot('phone-listening');await click('#library');await shot('phone-library');await run(`document.querySelector('#search').value='Nothing matches';document.querySelector('#search').dispatchEvent(new Event('input',{bubbles:true}))`);await shot('phone-empty-search');await run(`document.querySelector('#search').value='';document.querySelector('#search').dispatchEvent(new Event('input',{bubbles:true}))`);
 await run(`document.querySelector('[data-details]')?.click()`);await pause(100);if(await run(`!!document.querySelector('[data-section-tab=overview]')`)){for(const tab of ['overview','lyrics','listening','details']){await click('[data-section-tab='+tab+']');await shot('phone-song-'+tab);}}
 await phoneClose();await click('#queue');await shot('phone-queue');await phoneClose();await click('#settings');await shot('phone-settings');
 for(const page of ['playback','library','storage','updates','help']){await click('[data-settings-page='+page+']');await pause(250);await shot('phone-settings-'+page);if(page==='playback')checks.push(...await require('./polish-touch.cjs')(win));await click('#sheet-back');}
 await phoneClose();await click('#library');await click('[data-action=sync]');await pause(300);await shot('phone-downloads');await phoneClose();
 await click('#visualizer-mode');await pause(700);await click('#visuals');for(const tab of ['style','motion','display','extras']){await click('[data-section-tab='+tab+']');await shot('phone-visual-'+tab);}await phoneClose();
 win.setSize(360,740);await pause(200);await shot('phone-small');await click('#library');await shot('phone-small-library');await phoneClose();
 win.setSize(800,412);await pause(250);await shot('phone-landscape');await click('#settings');await shot('phone-landscape-settings');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({phase,screens,checks,errors},null,2));log(JSON.stringify({screens:screens.length,checks,errors}));
 assert.equal(errors.length,0,'Browser console errors');assert.ok(checks.every(c=>c.pass),'Behavior checks');assert.ok(screens.every(s=>!s.pageOverflow&&!s.overflow.length),'Responsive layouts overflow');assert.ok(screens.every(s=>!s.unnamed.length),'Unnamed controls');
 win.destroy();service.server.close();service.lib.close();server.close();app.exit(0);
}).catch(async e=>{log(e.stack);if(win){fs.writeFileSync(path.join(out,'failure.png'),(await win.webContents.capturePage()).toPNG());fs.writeFileSync(path.join(out,'failure.txt'),await run(`document.body.innerText`));}fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({phase,screens,checks,errors},null,2));win?.destroy();service?.server.close();server?.close();app.exit(1);});setTimeout(()=>app.exit(2),180000).unref();
