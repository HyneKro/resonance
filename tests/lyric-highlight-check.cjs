const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/lyric-phrase/ui');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),s+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,server,assets='public';const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=s=>win.webContents.executeJavaScript(s,true);
async function until(code){for(let i=0;i<100;i++){if(await run(code))return;await pause(30);}throw Error('Timed out: '+code);}
const html=`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/dynamic-lyrics.css">
<style>body{background:radial-gradient(ellipse at 70% 25%,#292637,#0b0c15 70%);color:#eee;font:16px system-ui;margin:0;--accent-light:#f2d8ff}#listening-room{height:500px;position:relative}button{margin:12px;padding:12px;border:1px solid #ffffff35;border-radius:22px;background:#171520;color:inherit}.controls{margin:20px;max-width:800px}</style>
<body data-listening-mode="visualizer"><button id="dynamic-lyrics">Lyrics</button><main id="listening-room"></main><section class="controls"><div class="lyrics"></div></section>
<script type="module">
import {installDynamicLyrics} from '/dynamic-lyrics.js';
import {mountLyricsControls} from '/lyrics-controls.js';
window.record={status:'synced',source:'Test fixture',text:'A paper sky',offset:0,lines:[
 {time:1,end:5.5,text:'A paper sky',words:[{text:'A ',start:1,end:1.4},{text:'paper ',start:1.8,end:3.8},{text:'sky',start:4.4,end:5.5}]},
 {time:6,text:''},{time:9,text:'A silver line without word timestamps'}
]};
window.audio=Object.assign(new EventTarget(),{paused:true,ended:false});
let base=2.8,started=performance.now();window.speed=1;window.delay=0;window.colors=[[.65,.12,.85],[.12,.4,.6],[.15,.2,.3]];audio.duration=15;
Object.defineProperty(audio,'currentTime',{get(){return base+(audio.paused?0:(performance.now()-started)/1000*speed)},set(value){base=value;started=performance.now()}});
window.setTime=value=>{audio.currentTime=value;audio.dispatchEvent(new Event('seeked'))};
window.frames=0;const raf=requestAnimationFrame;window.requestAnimationFrame=callback=>raf(time=>{frames++;callback(time)});
localStorage.setItem('resonance:dynamic-lyrics','true');
window.control=installDynamicLyrics({audio,current:()=>({id:'test',title:'Paper sky',artist:'Fixture',genre:'Electronic'}),palette:()=>colors,delay:()=>delay,read:async()=>record});
mountLyricsControls({container:document.querySelector('.controls'),track:{id:'test'},request:async()=>({record,improved:false})});
document.querySelector('.lyrics-tools').open=true;
window.fill=()=>Array.from(document.querySelectorAll('.lyric-word'),w=>parseFloat(w.style.getPropertyValue('--word-fill')));
window.phraseFill=()=>{const spans=[...document.querySelectorAll('.lyric-word')];const widths=spans.map(s=>s.getBoundingClientRect().width);return spans.reduce((sum,s,i)=>sum+parseFloat(s.style.getPropertyValue('--word-fill'))*widths[i],0)/widths.reduce((a,b)=>a+b,0)};
window.ready=true;
</script>`;
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname;
  if(name==='/'){res.setHeader('Content-Type','text/html');res.end(html);return;}
  if(!/^\/[\w.-]+\.(js|css)$/.test(name)){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'text/css');res.end(fs.readFileSync(path.join(root,assets,name.slice(1))));}catch{res.writeHead(404);res.end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));
 win=new BrowserWindow({show:false,width:1000,height:850,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 const results=[];
 for(const [platform,folder,width] of [['pc','public',1000],['android','android/shared',390]]){
  assets=folder;win.setSize(width,850);await win.loadURL('http://127.0.0.1:'+server.address().port+'/');
  await until('window.ready&&document.querySelectorAll(".lyric-word").length===3');
  assert.deepEqual(await run('fill()'),[100,50,0]);
  assert.equal(await run('document.querySelector(".lyric-current").textContent'),'A paper sky');
  assert.equal(await run('document.querySelectorAll("[data-analyze],[data-proposal],[data-cancel]").length'),0);
  assert.match(await run('document.querySelector("[data-word-timing]").textContent'),/1 of 2 lines/);
  // Paused words must retain their fill and schedule no animation frames.
  const idle=await run('frames');await pause(250);assert.equal(await run('frames'),idle);
  const snapshot=await win.webContents.capturePage();fs.writeFileSync(path.join(out,platform+'-half-word.png'),snapshot.toPNG());
  await run('setTime(1.1)');assert.deepEqual(await run('fill()'),[25,0,0]);
  await run('setTime(1.6)');assert.deepEqual(await run('fill()'),[100,0,0]);
  await run('record.offset=.25;delay=250;setTime(3.3)');assert.deepEqual(await run('fill()'),[100,50,0]);
  await run('record.offset=0;delay=0;setTime(2);audio.paused=false;audio.dispatchEvent(new Event("play"))');
  const start=await run('({frames,fill:fill()[1]})');await pause(140);
  const end=await run('({frames,fill:fill()[1]})');
  assert.ok(end.frames>=start.frames+3,'Fill updates at display frame rate');
  assert.ok(end.fill>start.fill&&end.fill<start.fill+25,'Progress follows real playback time');
  await run('audio.currentTime=audio.currentTime;audio.paused=true;audio.dispatchEvent(new Event("pause"))');
  const held=await run('fill()');await pause(150);assert.deepEqual(await run('fill()'),held);
  await run('speed=2;setTime(2);audio.paused=false;audio.dispatchEvent(new Event("ratechange"))');
  const fast=await run('fill()[1]');await pause(120);assert.ok((await run('fill()[1]'))>fast+9);
  await run('document.body.dataset.listeningMode="constellation";audio.dispatchEvent(new Event("timeupdate"))');
  const hidden=await run('frames');await pause(250);assert.equal(await run('frames'),hidden);
  assert.equal(await run('document.querySelector(".dynamic-lyrics").hidden'),true);
  await run('audio.paused=true;document.body.dataset.listeningMode="visualizer";setTime(6.5)');
  assert.equal(await run('document.querySelector(".lyric-current").textContent'),'');assert.deepEqual(await run('fill()'),[]);
  await run('setTime(12)');await pause(250);assert.equal(await run('document.querySelector(".lyric-current").dataset.timing'),'phrase');assert.ok(Math.abs(await run('phraseFill()')-50)<.01);
  assert.equal(await run('document.querySelector(".lyric-current").textContent'),'A silver line without word timestamps');
  assert.equal(await run('document.documentElement.scrollWidth>innerWidth'),false);
  const phrase=await run('fill()');assert.ok(phrase.every((x,i)=>!i||phrase[i-1]>=x),'Wrapped phrases fill in reading order');
  await pause(350);fs.writeFileSync(path.join(out,platform+'-phrase.png'),(await win.webContents.capturePage()).toPNG());
  await run('setTime(10.5)');assert.ok(Math.abs(await run('phraseFill()')-25)<.01);
  await run('record.offset=.25;delay=250;setTime(12.5)');
  assert.ok(Math.abs(await run('phraseFill()')-(3/5.75*100))<.02,'Phrase respects visual delay and manual offset');
  const originalInk=await run('document.querySelector(".dynamic-lyrics").style.getPropertyValue("--lyric-ink")');
  await run('colors=[[.05,.7,.22],[.1,.2,.1],[.2,.3,.2]];document.body.style.background="repeating-conic-gradient(#d5be8c 0% 25%,#463857 0% 50%) 0/100px 100px"');
  await pause(950);
  assert.notEqual(await run('document.querySelector(".dynamic-lyrics").style.getPropertyValue("--lyric-ink")'),originalInk);
  assert.match(await run('getComputedStyle(document.querySelector(".lyric-ink")).textShadow'),/rgb/);
  assert.match(await run('getComputedStyle(document.querySelector(".lyric-word")).textShadow'),/rgb\(0, 0, 0\)/);
  fs.writeFileSync(path.join(out,platform+'-bright-background.png'),(await win.webContents.capturePage()).toPNG());
  await run('record.offset=0;delay=0;audio.duration=0;setTime(12)');
  assert.deepEqual(await run('fill()'),[],'No known final phrase end: do not invent a duration');
  await run('audio.duration=15;setTime(15)');
  assert.ok((await run('fill()')).every(x=>x===100),'Known song end completes final phrase');
  await run('control.dispose();audio.paused=false;audio.dispatchEvent(new Event("play"))');
  const disposed=await run('frames');await pause(250);assert.equal(await run('frames'),disposed);
  assert.equal(await run('document.querySelector(".dynamic-lyrics")'),null);
  results.push({platform,passed:true,halfWord:50,backwardsSeek:25,phraseHalfway:50,hiddenAndPausedFrames:0});
 }
 fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(results,null,2));log('PASS');
}).catch(e=>{log(e.stack);process.exitCode=1;}).finally(()=>{win?.destroy();server?.close();app.exit(process.exitCode||0)});
