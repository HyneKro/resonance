const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/dynamic-lyrics/ui');
fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'runner.log'),'');app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,server;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code,true);
async function until(code){for(let i=0;i<450;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
async function shot(name){await pause(400);fs.writeFileSync(path.join(out,name+'.png'),(await win.webContents.capturePage()).toPNG());}
const timed='[00:01]A paper sky\n[00:05]A silver line\n[00:09]\n[00:13]We drift again';
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href),{lyricDocument}=await import(pathToFileURL(path.join(root,'public/lyrics.js')).href);
 const wav=Buffer.alloc(44+8000*2*30);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(8000,24);wav.writeUInt32LE(16000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);fs.writeFileSync(path.join(out,'fixture.wav'),wav);
 service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,hdrMode:'off',autoDirection:false,leveling:false,sona:false});service.lib.setSetting('config',service.lib.config);
 const track={id:'lyrics-a',kind:'track',title:'Paper Satellites',artist:'Test Singer',genre:'Folk',album:'',duration:30,path:path.join(out,'fixture.wav'),available:true,size:wav.length,codec:'WAV'};service.lib.save(track);
 service.lib.setSetting('trackLyrics:'+track.id,lyricDocument(track,{id:101,trackName:track.title,artistName:track.artist,duration:30,syncedLyrics:timed},{confirmed:true}));
 win=new BrowserWindow({show:false,width:1440,height:950,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);
 win.webContents.on('console-message',e=>{if(e.level==='error')log(e.message);});
 await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`document.querySelector('[data-view=tracks]').click()`);await until(`document.querySelector('[data-play="lyrics-a"]')`);
 await run(`document.querySelector('[data-play="lyrics-a"]').click()`);await until(`!document.querySelector('#dynamic-lyrics').disabled`);
 await run(`document.querySelector('#audio').pause();document.querySelector('#audio').currentTime=6;if(document.body.classList.contains('library-open'))document.querySelector('#close-library').click();document.querySelector('#room-visualizer').click();document.querySelector('#dynamic-lyrics').click()`);
 await until(`document.querySelector('.lyric-current').textContent==='A silver line'&&!document.querySelector('.dynamic-lyrics').hidden`);await shot('pc-lyrics');
 for(const [time,line] of [[2,'A paper sky'],[10,''],[14,'We drift again']]){await run(`document.querySelector('#audio').currentTime=${time}`);await until(`document.querySelector('.lyric-current').textContent===${JSON.stringify(line)}`);}
 await run(`document.querySelector('#music-only').click()`);await until(`document.querySelector('.dynamic-lyrics').hidden`);await run(`document.querySelector('#room-visualizer').click()`);await until(`!document.querySelector('.dynamic-lyrics').hidden`);
 for(const width of [1280,1024]){win.setSize(width,850);await shot('pc-'+width);assert.equal(await run('document.documentElement.scrollWidth>innerWidth+2'),false);assert.equal(await run(`(()=>{const brand=document.querySelector('.room-top>div:first-child').getBoundingClientRect(),tools=document.querySelector('.room-controls').getBoundingClientRect();return brand.right>tools.left&&brand.bottom>tools.top;})()`),false,'Header must not overlap at '+width);}
 await run(`document.querySelector('[data-detail="lyrics-a"]').click()`);await until(`document.querySelector('.lyrics-tools')`);
 await run(`document.querySelector('[data-section-tab="lyrics"]').click();document.querySelector('.lyrics-tools').open=true`);await until(`document.querySelector('.lyrics-tools [data-analyze]').textContent.includes('Download')`);
 await run(`document.querySelector('.lyrics-tools [data-later]').click()`);await until(`document.querySelector('.lyrics-tools output').textContent==='+0.2s'`);
 assert.equal((await (await fetch(service.url+'/api/track-lyrics?id=lyrics-a')).json()).offset,.2);await shot('pc-timing-controls');
 await run(`document.querySelector('.lyrics-tools [data-zero]').click()`);await until(`document.querySelector('.lyrics-tools output').textContent==='0.0s'`);
 server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(name.includes('..')){res.writeHead(404);res.end();return;}
  let file=name==='test-native.js'?path.join(root,'android/tests',name):path.join(root,'android/web',name);if(!fs.existsSync(file))file=path.join(root,'android/shared',name);
  if(name.startsWith('artwork/')){res.setHeader('Content-Type','image/svg+xml');res.end('<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#75649b"/></svg>');return;}
  try{let data=fs.readFileSync(file);
   if(name==='index.html')data=Buffer.from(data.toString().replace('<script type="module"','<script src="/test-native.js"></script><script type="module"'));
   if(name==='test-native.js')data=Buffer.from(data.toString().replace("case'library':",`case'lyricsCached':{const t=tracks.find(t=>t.id===data.id);value={track:t,...(window.lyricsSaved?.[data.id]||{}),record:{version:3,stamp:[t.title,t.artist,t.album,Math.round(t.duration)].join('|'),confirmed:true,status:'synced',source:'Fixture',text:'A paper sky',lines:[{time:1,text:'A paper sky'},{time:5,text:'A silver line'},{time:9,text:''},{time:13,text:'We drift again'}]}};break;}case'lyricsTimingSave':(window.lyricsSaved??={})[data.id]={timing:data.timing,offset:data.offset};value={ok:true};break;case'library':`));
   res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);
  }catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win.setSize(412,915);await win.loadURL('http://127.0.0.1:'+server.address().port+'/');await until(`!document.querySelector('#opening')&&!document.querySelector('#dynamic-lyrics').disabled`);
 await run(`document.querySelector('#visualizer-mode').click();document.querySelector('#dynamic-lyrics').click();import('/native.js').then(({rpc})=>rpc('seek',{position:6000}))`);await until(`!document.querySelector('.dynamic-lyrics').hidden&&document.querySelector('.lyric-current').textContent==='A silver line'`);await shot('android-lyrics');
 for(const [w,h] of [[360,800],[800,360]]){win.setSize(w,h);await shot('android-'+w);assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2`),false);assert.equal(await run(`(()=>{const a=document.querySelector('.lyric-current').getBoundingClientRect(),dock=document.querySelector('.room-dock').getBoundingClientRect();return a.bottom>dock.top&&a.right>dock.left;})()`),false,'Lyrics must clear transport');}
 win.setSize(412,915);
 await run(`document.querySelector('#track-details').click()`);await until(`document.querySelector('.lyrics-tools')`);
 await run(`document.querySelector('[data-section-tab=lyrics]').click();document.querySelector('.lyrics-tools').open=true`);
 await until(`document.querySelector('.lyrics-tools [data-analyze]').hidden`);
 await run(`document.querySelector('.lyrics-tools [data-later]').click()`);await until(`document.querySelector('.lyrics-tools output').textContent==='+0.2s'`);
 assert.equal(await run(`Object.values(window.lyricsSaved)[0].offset.value`),.2);
 assert.equal(await run(`document.documentElement.scrollWidth>innerWidth+2`),false);await shot('android-timing-controls');
 await run(`document.querySelector('.lyrics-tools [data-zero]').click()`);await until(`document.querySelector('.lyrics-tools output').textContent==='0.0s'`);
 // Overlay-specific asynchronous replacement, visual delay, reduced motion and unavailable state.
 await run(`(async()=>{const {installDynamicLyrics}=await import('/dynamic-lyrics.js');const host=document.createElement('div'),button=document.createElement('button');document.body.append(host,button);let t={id:'old',title:'Old'},resolve,failures=0;const audio=Object.assign(new EventTarget(),{currentTime:5.1});window.lyricAudit={host,button,audio,setTrack:v=>t=v,finish:()=>resolve({lines:[{time:0,text:'Wrong stale song'}]})};window.lyricAudit.control=installDynamicLyrics({host,button,audio,current:()=>t,delay:()=>200,read:t=>t.id==='retry'?Promise.resolve(++failures===1?{status:'unavailable'}:{status:'synced',lines:[{time:0,text:'Recovered'}]}):t.id==='old'?new Promise(r=>resolve=r):Promise.resolve({status:'synced',lines:[{time:1,text:'Early'},{time:5,text:'Later'}]})});})()`);
 await run(`lyricAudit.setTrack({id:'new',title:'New'});lyricAudit.audio.dispatchEvent(new Event('trackchange'))`);await pause(200);await run(`lyricAudit.finish();if(lyricAudit.button.getAttribute('aria-pressed')!=='true')lyricAudit.button.click()`);
 assert.equal(await run(`lyricAudit.host.querySelector('.lyric-current').textContent`),'Early');
 await run(`lyricAudit.audio.currentTime=5.3`);await pause(200);assert.equal(await run(`lyricAudit.host.querySelector('.lyric-current').textContent`),'Later');
 await run(`lyricAudit.setTrack({id:'retry',title:'Retry'});lyricAudit.audio.dispatchEvent(new Event('trackchange'))`);await pause(200);assert.equal(await run('lyricAudit.button.disabled'),true);
 await run(`window.realNow=Date.now;Date.now=()=>realNow()+61000;void 0`);await until(`!lyricAudit.button.disabled`);assert.equal(await run(`lyricAudit.host.querySelector('.lyric-current').textContent`),'Recovered');await run(`Date.now=realNow;void 0`);
 await run(`window.realMatch=matchMedia;window.matchMedia=q=>q==='(prefers-reduced-motion: reduce)'?{matches:true}:realMatch(q);lyricAudit.setTrack({id:'new',title:'New'});lyricAudit.audio.currentTime=2;lyricAudit.audio.dispatchEvent(new Event('trackchange'))`);await pause(150);assert.equal(await run(`lyricAudit.host.querySelector('.lyric-current').getAnimations().length`),0);await run(`window.matchMedia=realMatch;void 0`);
 await run(`document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:'new',record:{status:'synced',lines:[{time:1,text:'A paper sky',end:6,words:[{text:'A ',start:1,end:2},{text:'paper ',start:3,end:4},{text:'sky',start:5,end:6}]}]}}}));lyricAudit.audio.currentTime=3.7`);await pause(150);
 assert.equal(await run(`lyricAudit.host.querySelectorAll('.lyric-word').length`),3);assert.equal(await run(`lyricAudit.host.querySelectorAll('.lyric-word')[1].style.getPropertyValue('--word-fill')`),'50%');
 await run(`lyricAudit.audio.currentTime=1.7`);await pause(150);assert.equal(await run(`lyricAudit.host.querySelectorAll('.lyric-word')[0].style.getPropertyValue('--word-fill')`),'50%');
 await run(`lyricAudit.audio.currentTime=7`);await pause(150);assert.equal(await run(`lyricAudit.host.querySelector('.lyric-current').style.opacity`),'0');
 await run(`document.dispatchEvent(new CustomEvent('resonance-lyrics-preview',{detail:{id:'new',record:null}}))`);await pause(150);assert.equal(await run(`lyricAudit.host.querySelectorAll('.lyric-word').length`),0);
 await run(`lyricAudit.control.dispose();lyricAudit.host.remove();lyricAudit.button.remove()`);
 log('PASS: actual PC/phone integration, ready state, activation, backwards seek, blank breaks, mode changes, compact/landscape layout, visual delay, stale-response protection, reduced motion and bounded outage retry.');
}).catch(async e=>{log(e.stack);if(win)try{await shot('failure');}catch{}process.exitCode=1;}).finally(async()=>{win?.destroy();if(server)await new Promise(r=>server.close(r));if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(process.exitCode||0);});
