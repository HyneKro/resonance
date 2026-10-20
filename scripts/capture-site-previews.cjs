// Real app views, isolated fictional library, original procedural cover.
// Run through a hidden Electron process with stdout/stderr redirected to files.
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/site-preview');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'capture.log'),String(s)+'\n');
for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE')log(e.stack)});
let win,service;const pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code,true);
async function until(code){for(let i=0;i<300;i++){if(await run(code))return;await pause(100)}throw Error('Timed out: '+code);}
async function shot(name){await pause(1800);fs.writeFileSync(path.join(root,'download-page/media',name+'.jpg'),(await win.webContents.capturePage()).toJPEG(88));log('Saved '+name);}
app.whenReady().then(async()=>{
 fs.mkdirSync(path.join(root,'download-page/media'),{recursive:true});
 win=new BrowserWindow({show:false,width:900,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});
 win.webContents.setAudioMuted(true);
 await win.loadURL('data:text/html,<body style="margin:0"><canvas width="900" height="900"></canvas>');
 await run(`(()=>{
 const c=document.querySelector('canvas').getContext('2d'),g=c.createLinearGradient(0,0,900,900);
 g.addColorStop(0,'#142f37');g.addColorStop(.5,'#16152e');g.addColorStop(1,'#351f3b');c.fillStyle=g;c.fillRect(0,0,900,900);
 c.translate(450,450);c.rotate(-.5);
 for(let i=0;i<160;i++){c.beginPath();for(let j=0;j<=300;j++){const t=j/300*Math.PI*2,r=170+i*.85+45*Math.sin(t*3+i*.018),x=Math.cos(t)*r,y=Math.sin(t)*r*.76; j?c.lineTo(x,y):c.moveTo(x,y)}c.closePath();c.strokeStyle='hsla('+(165+i*.8)+',65%,75%,.36)';c.lineWidth=.85;c.stroke()}
 c.setTransform(1,0,0,1,0,0);c.fillStyle='#dbe9e7';c.font='18px sans-serif';c.letterSpacing='5px';c.fillText('RESONANCE STUDIES',65,83);
 c.font='italic 68px Georgia';c.letterSpacing='0px';c.fillText('Night Atlas',65,793);c.font='13px sans-serif';c.letterSpacing='3px';c.fillText('VOLUME 01  /  AN IMAGINARY RECORD',68,836);
 })()`);
 const cover=(await win.webContents.capturePage()).toPNG();
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);
 const dataDir=fs.mkdtempSync(path.join(out,'library-'));
 service=await startServer({port:0,dataDir,autoScan:false});
 // Supplementary artwork research is deliberately disabled for these demo songs.
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');
 service.server.on('request',(req,res)=>{if(req.url.startsWith('/api/wallpaper')){res.setHeader('Content-Type','application/json');res.end('{"assets":[]}')}else original(req,res)});
 fs.mkdirSync(path.join(dataDir,'artwork'),{recursive:true});fs.writeFileSync(path.join(dataDir,'artwork/0123456789abcdef01234567.png'),cover);
 const rate=16000,duration=215,wav=Buffer.alloc(44+rate*2*duration);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*2,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);
 for(let i=0;i<rate*duration;i++){const t=i/rate,beat=Math.exp(-(t*2%1)*12),v=.17*Math.sin(t*2*Math.PI*110)+.12*Math.sin(t*2*Math.PI*330)*(1+Math.sin(t*.7))+.25*beat*Math.sin(t*2*Math.PI*55);wav.writeInt16LE(Math.round(v*24000),44+i*2)}
 const audio=path.join(dataDir,'demo.wav');fs.writeFileSync(audio,wav);
 const genres=['Electronic','Ambient','Jazz','Rock','Folk','Classical','Pop','Hip Hop'];
 const names=['Night Atlas','Soft Satellites','After the Rain','Velvet Horizon','Paper Moons','First Light','Slow Orbit','Tidal Memory'];
 const artists=['Aster','The Quiet Hours','Juniper Ensemble','Glass Avenue','Morrow','Northlight','Solace','Lumen'];
 for(let i=0;i<160;i++)service.lib.save({id:'demo-'+i,path:audio,fileName:'demo.wav',title:names[i%8]+(i>7?' / '+(Math.floor(i/8)+1):''),artist:artists[i%8],genre:genres[i%8],album:'Resonance Studies',date:'2026',duration,kind:'track',available:true,size:wav.length,codec:'PCM',artwork:'0123456789abcdef01234567.png',favorite:i%5===0,addedAt:160-i});
 Object.assign(service.lib.config,{autoEnrich:false,autoGenres:false});
 Object.assign(service.lib.config.preferences,{musicOnly:true,sort:'added',sfx:false,hdrMode:'off',quality:'high',targetFPS:60,leveling:false,danceCompanion:true,danceDesignVersion:2,companionAppearance:'sona'});
 service.lib.setSetting('config',service.lib.config);service.lib.setSetting('player',{id:'demo-0',position:72,volume:.5,queue:['demo-0','demo-1','demo-2','demo-3','demo-4'],queueIndex:0});
 win.setSize(1600,1000);await win.loadURL(service.url);
 await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 if(await run(`document.body.classList.contains('library-open')`))await run(`document.querySelector('#close-library').click()`);
 await until(`[...document.querySelectorAll('#music-only-cover img')].some(i=>i.complete&&i.naturalWidth>1)`);await shot('music-only');
 await run(`document.querySelector('[data-listening-mode=visualizer]').click()`);
 await until(`!document.body.classList.contains('music-only')`);
 await run(`document.querySelector('#dock-play').click()`);
 await pause(5500);await shot('visualizer');
 await run(`document.querySelector('[data-listening-mode=constellation]').click()`);
 await until(`!!document.querySelector('.constellation:not([hidden]) canvas')`);
 await pause(4500);await shot('constellation');
 await run(`document.querySelector('[data-cx=follow]')?.click()`);await shot('listening-path');
 await run(`document.querySelector('#close-room').click()`);
 await run(`document.querySelector('[data-view=tracks]').click()`);await shot('library');
 log('All previews use fictional metadata, original cover art and synthetic audio. No personal data.');
}).catch(async e=>{log(e.stack);process.exitCode=1}).finally(async()=>{win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close()}app.exit(process.exitCode||0)});
setTimeout(()=>{log('Capture timed out');app.exit(2)},120000).unref();
