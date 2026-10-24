// Real desktop UI, isolated library, generated audio and a held second transfer.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/incremental-downloads-ui');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
const log=s=>fs.appendFileSync(path.join(out,'runner.log'),String(s)+'\n');for(const stream of [process.stdout,process.stderr])stream.on('error',e=>{if(e.code!=='EPIPE'){log(e.stack);app.exit(1);}});
let win,service,release,pending,exitCode=0;const errors=[],pause=ms=>new Promise(r=>setTimeout(r,ms)),run=code=>win.webContents.executeJavaScript(code,true);
async function until(code){for(let i=0;i<160;i++){if(await run(code))return;await pause(100);}throw Error('Timed out: '+code);}
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'data-')),autoScan:false});
 Object.assign(service.lib.config.preferences,{musicOnly:true,sfx:false,leveling:false,skipSilence:false,autoDirection:false});const music=fs.mkdtempSync(path.join(out,'music-'));
 const source={id:'test',name:'Playlist in progress',type:'youtube',kind:'track',path:music,playlist:'PLtest_downloads'};service.lib.config.sources=[source];service.lib.setSetting('config',service.lib.config);
 service.sync.preview={checkedAt:Date.now(),sources:[{id:'test',name:source.name}],entries:['AAAAAAAAAAA','BBBBBBBBBBB'].map((id,i)=>({id,title:i?'Second song':'First song',channel:'Test Artist',duration:20,playlistIndex:i+1,sourceId:'test',status:'new'}))};service.lib.setSetting('syncPreview',service.sync.preview);
 service.sync.check=async()=>{};
 let gate=new Promise(r=>release=r),secondStarted=false;
 const original=service.sync.download.bind(service.sync);service.sync.download=selected=>pending=original(selected);
 service.sync.run=async(args,onLine)=>{const id=args.at(-1).slice(-11),second=id==='BBBBBBBBBBB';if(second||id==='EEEEEEEEEEE'){secondStarted=true;await gate;}
  const file=path.join(music,(second?'Second':'First')+' song ['+id+'].wav'),audio=Buffer.alloc(44+88200*20);audio.write('RIFF');audio.writeUInt32LE(audio.length-8,4);audio.write('WAVEfmt ',8);audio.writeUInt32LE(16,16);audio.writeUInt16LE(1,20);audio.writeUInt16LE(1,22);audio.writeUInt32LE(44100,24);audio.writeUInt32LE(88200,28);audio.writeUInt16LE(2,32);audio.writeUInt16LE(16,34);audio.write('data',36);audio.writeUInt32LE(audio.length-44,40);fs.writeFileSync(file,audio);fs.writeFileSync(file.replace('.wav','.info.json'),JSON.stringify({id,track:second?'Second song':'First song',artist:'Test Artist',duration:20}));onLine('RESONANCE_FILE '+JSON.stringify(file));return '';
 };
 win=new BrowserWindow({show:false,width:1180,height:900,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});win.webContents.setAudioMuted(true);win.webContents.on('console-message',e=>{if(e.level==='error')errors.push(e.message);});await win.loadURL(service.url);await until(`document.body.classList.contains('startup-ready')&&!document.querySelector('#startup')`);
 await run(`document.querySelector('#update-playlists').click()`);await until(`!!document.querySelector('[data-action=download-sync]')`);await run(`document.querySelector('[data-action=download-sync]').click()`);
 for(let i=0;i<150&&!secondStarted;i++)await pause(100);assert.ok(secondStarted);assert.equal(service.sync.job.running,true);assert.equal(service.sync.job.downloaded,1);
 await run(`document.querySelector('[data-action=close-dialog]').click();document.querySelector('[data-view=tracks]').click()`);
 await until(`document.querySelector('#track-count').textContent==='1'&&!!document.querySelector('#main .track-cell')`);
 const first=service.lib.list()[0];assert.equal(await run(`document.querySelector('#main .track-cell').dataset.play`),first.id);assert.equal(service.sync.job.running,true);
 await run(`document.querySelector('#main .track-cell').click()`);await until(`document.querySelector('#now-title').textContent==='First song'&&!document.querySelector('audio').paused`);
 fs.writeFileSync(path.join(out,'first-song-ready.png'),(await win.webContents.capturePage()).toPNG());
 release();await pending;await until(`document.querySelector('#track-count').textContent==='2'`);assert.equal(await run(`document.querySelector('#now-title').textContent`),'First song');assert.equal(service.sync.job.downloaded,2);assert.equal(errors.length,0,errors.join('\n'));
 // Another client can start a batch whose completed count matches the last
 // one. The library must still refresh while that batch remains active.
 gate=new Promise(r=>release=r);secondStarted=false;
 service.sync.preview={checkedAt:Date.now(),sources:[{id:'test'}],entries:['CCCCCCCCCCC','DDDDDDDDDDD','EEEEEEEEEEE'].map((id,i)=>({id,title:'More music '+i,sourceId:'test',playlistIndex:i+3,status:'new'}))};
 service.lib.setSetting('syncPreview',service.sync.preview);pending=service.sync.download(service.sync.preview.entries.map(e=>'test:'+e.id));
 for(let i=0;i<100&&!secondStarted;i++)await pause(100);assert.ok(secondStarted);assert.equal(service.sync.job.downloaded,2);assert.equal(service.sync.job.running,true);
 await until(`document.querySelector('#track-count').textContent==='4'`);release();await pending;await until(`document.querySelector('#track-count').textContent==='5'`);
 log(JSON.stringify({ok:true,firstPlayableDuringSecondTransfer:true,automaticLibraryRefresh:true,repeatedBatchRefresh:true,playbackPreserved:true,errors}));
}).catch(e=>{log(e.stack);exitCode=1;}).finally(async()=>{release?.();if(pending)await pending.catch(()=>{});win?.destroy();if(service){await new Promise(r=>service.server.close(r));service.lib.close();}app.exit(exitCode);});setTimeout(()=>{log('UI check timed out');app.exit(2);},60000).unref();
