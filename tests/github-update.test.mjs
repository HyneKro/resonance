import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const {compareVersions,selectRelease,findRelease,downloadRelease,allowedUrl,RELEASES_URL,updateChannel,releasesPage}=require('../electron/github-releases.cjs');
const {OnlineUpdate,restoreRelease,checkInterval}=require('../electron/online-update.cjs');
const content=Buffer.from('verified portable archive'),hash=createHash('sha256').update(content).digest('hex');
function release(v='1.1.5',platform='pc'){const name=platform==='pc'?`Resonance-PC-${v}-portable.zip`:`Resonance-Android-${v}.apk`,tag=platform+'-v'+v;return {tag_name:tag,assets:[{name,size:content.length,state:'uploaded',digest:'sha256:'+hash,browser_download_url:RELEASES_URL+'/download/'+tag+'/'+name}],body:'Changes'};}
const dir=async()=>fs.mkdtemp(path.join(process.cwd(),'test-output','github-update-'));
test('temporary preference locks retain the previous file and retry the atomic replacement',async t=>{
 const directory=await dir(),updater=new OnlineUpdate({directory,current:'1.22.0',canInstall:true});await updater.ready;
 await updater.preferences({autoDownload:false});
 const rename=fs.rename;let attempts=0;
 t.mock.method(fs,'rename',async(from,to)=>{
  if(to===path.join(directory,'preferences.json')&&++attempts<=2){
   assert.equal(JSON.parse(await fs.readFile(to,'utf8')).autoDownload,false);
   throw Object.assign(Error('Temporary lock'),{code:'EPERM'});
  }
  return rename(from,to);
 });
 await updater.preferences({autoDownload:true});assert.equal(attempts,3);
 assert.equal(JSON.parse(await fs.readFile(path.join(directory,'preferences.json'),'utf8')).autoDownload,true);
});
test('permanent preference storage errors remain visible and retries are bounded',async t=>{
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true});await updater.ready;
 let attempts=0,code='EIO';t.mock.method(fs,'rename',async()=>{attempts++;throw Object.assign(Error('Save failed'),{code});});
 await assert.rejects(updater.preferences({autoDownload:false}),{code:'EIO'});assert.equal(attempts,1);
 attempts=0;code='EPERM';await assert.rejects(updater.preferences({autoDownload:true}),{code:'EPERM'});assert.equal(attempts,6);
});
function devRelease(v='1.25.0-dev.3',platform='pc'){
 const r=release(v,platform);r.tag_name='development-'+r.tag_name;r.prerelease=true;
 r.assets[0].browser_download_url=RELEASES_URL+'/download/'+r.tag_name+'/'+r.assets[0].name;return r;
}
test('development and release channels stay isolated, including existing clients',()=>{
 const legacy=require('./fixtures/updater/github-releases-1.24.0.cjs');
 for(const [platform,current,stable,next] of [['pc','1.25.0-dev.2','1.25.0','1.26.0-dev.1'],['android','0.25.0-dev.2','0.25.0-preview','0.26.0-dev.1']]){
  const dev=devRelease(next,platform),rows=[dev,release(stable,platform),release('99.0.0-dev.1',platform)];
  assert.equal(selectRelease(rows,current,platform).version,next);
  assert.equal(selectRelease([dev],next,platform),null);
  assert.equal(selectRelease([release(stable,platform)],current,platform),null);
  assert.equal(selectRelease([dev],'0.0.0',platform),null);
  assert.equal(legacy.selectRelease([dev],'0.0.0',platform),null,'old installed clients ignore development tags');
  assert.equal(selectRelease(rows,'0.0.0',platform).version,stable);
  assert.equal(selectRelease([{...dev,draft:true}],current,platform),null);
  assert.equal(selectRelease([devRelease(stable,platform)],current,platform),null,'a release version cannot masquerade as development');
 }
 assert.equal(compareVersions('1.25.0-dev.10','1.25.0-dev.9'),1);
 assert.equal(updateChannel('1.25.0-dev.3'),'development');assert.equal(updateChannel('0.24.0-preview'),'release');
 assert.match(releasesPage('1.25.0-dev.3'),/q=development-/);
});
test('development cache survives relaunch and rejects packages from another channel',async()=>{
 const directory=await dir(),current='1.25.0-dev.2',r=selectRelease([devRelease()],current);
 const options={directory,current,canInstall:true,find:async()=>r,download:async(_r,file)=>fs.writeFile(file,content)};
 const updater=new OnlineUpdate(options);await updater.check();assert.equal(updater.snapshot().channel,'development');
 assert.equal((await updater.archive()).version,'1.25.0-dev.3');
 const reopened=new OnlineUpdate(options);await reopened.ready;assert.equal(reopened.snapshot().phase,'ready');
 assert.equal(restoreRelease(r,'1.24.0'),null);assert.equal(restoreRelease(selectRelease([release('1.26.0')],'1.24.0'),current),null);
 const switched=new OnlineUpdate({...options,current:'1.24.0'});await switched.ready;
 assert.equal(switched.snapshot().release,null);assert.equal(switched.snapshot().checkedAt,0);
 assert.equal(switched.snapshot().channel,'release');await assert.rejects(fs.stat(path.join(directory,'download.zip')));
});
test('development discovery reads public metadata and selects the numbered test build',async()=>{
 const found=await findRelease('1.25.0-dev.2',{fetchImpl:async(_url,options)=>{
  assert.equal(options.headers.Authorization,undefined);return Response.json([release('1.26.0'),devRelease()]);
 }});assert.equal(found.version,'1.25.0-dev.3');
});
test('platform-specific updates use numeric versions, skip drafts, incomplete releases and downgrades',()=>{
 assert.equal(compareVersions('1.1.10','1.1.9'),1);assert.equal(compareVersions('0.1.12','0.1.12-preview'),1);
 const bad=release('9.0.0');bad.assets[0].digest='';
 assert.equal(selectRelease([release('1.1.4'),release('1.1.10'),release('1.1.9'),bad,{...release('9.1.0'),draft:true},release('99.0.0','android')],'1.1.4').version,'1.1.10');
 assert.equal(selectRelease([release('1.1.4'),release('1.1.3')],'1.1.4'),null);
 for(const mutate of [r=>r.assets.push({...r.assets[0]}),r=>r.assets[0].browser_download_url='https://example.com/a.zip',r=>r.assets[0].size=3e9,r=>r.assets[0].state='starter']){const r=release();mutate(r);assert.equal(selectRelease([r],'1.1.4'),null);}
});
test('release listing follows pages, does not use cross-platform latest and sends no credentials',async()=>{
 const pages=[];const r=await findRelease('1.1.4',{fetchImpl:async(url,options)=>{pages.push(url);assert.equal(options.headers.Authorization,undefined);return Response.json(pages.length===1?Array.from({length:100},()=>release('0.1.12-preview','android')):[release('1.1.5')]);}});
 assert.equal(r.version,'1.1.5');assert.equal(pages.length,2);assert.match(pages[1],/page=2/);
 await assert.rejects(findRelease('1.1.4',{fetchImpl:async()=>new Response('',{status:403})}),/limit/);
});
test('redirects remain on GitHub HTTPS and downloads require exact size and hash',async()=>{
 for(const address of ['http://github.com/HyneKro/resonance/releases/download/a/b','https://github.com.evil.test/a','https://user:pass@github.com/HyneKro/resonance/releases/download/a/b','https://github.com/another/repo/releases/download/a/b'])assert.throws(()=>allowedUrl(address));
 const folder=await dir(),file=path.join(folder,'update.zip'),r=selectRelease([release()],'1.1.4');
 let calls=0;await downloadRelease(r,file,{fetchImpl:async()=>++calls===1?new Response(null,{status:302,headers:{location:'https://release-assets.githubusercontent.com/test'}}):new Response(content)});assert.deepEqual(await fs.readFile(file),content);
 for(const bad of [content.subarray(1),Buffer.from('X'.repeat(content.length)),Buffer.concat([content,content])]){await assert.rejects(downloadRelease(r,file,{fetchImpl:async()=>new Response(bad)}));assert.deepEqual(await fs.readFile(file),content);await assert.rejects(fs.stat(file+'.part'));}
 await assert.rejects(downloadRelease(r,file,{fetchImpl:async()=>new Response(null,{status:302,headers:{location:'https://example.com/bad'}})}),/Unexpected/);
});
test('prepared update survives reopening, rejects modified cache and never auto-installs',async()=>{
 const directory=await dir(),r=selectRelease([release()],'1.1.4'),events=[];
 const options={directory,current:'1.1.4',canInstall:true,emit:s=>events.push(s.phase),find:async()=>r,download:async(_r,file)=>fs.writeFile(file,content)};
 const updater=new OnlineUpdate(options);await updater.check();assert.equal(updater.snapshot().phase,'ready');assert.equal((await updater.archive()).version,'1.1.5');assert.equal(events.includes('restarting'),false);
 const reopened=new OnlineUpdate(options);await reopened.ready;assert.equal(reopened.snapshot().phase,'ready');await fs.writeFile(path.join(directory,'download.zip'),'changed');await assert.rejects(reopened.archive(),/changed/);
 assert.equal(restoreRelease({...r,url:'https://example.com/file'},'1.1.4'),null);assert.equal(restoreRelease(r,'1.1.5'),null);
});
test('automatic check/download preferences and development copies are respected',async()=>{
 let checks=0,downloads=0;const updater=new OnlineUpdate({directory:await dir(),current:'1.1.4',canInstall:true,find:async()=>{checks++;return selectRelease([release()],'1.1.4');},download:async()=>{downloads++;}});
 await updater.preferences({autoCheck:false,autoDownload:false});await updater.check(true);assert.equal(checks,0);await updater.check();assert.equal(checks,1);assert.equal(downloads,0);assert.equal(updater.snapshot().phase,'available');
 const dev=new OnlineUpdate({directory:await dir(),current:'1.1.4',canInstall:false,find:async()=>selectRelease([release()],'1.1.4'),download:async()=>{downloads++;}});await dev.check();assert.equal(downloads,0);
});
test('manual checks can supersede a downloaded update without reinstalling the rejected ZIP',async()=>{
 let version='1.23.0',checks=0,downloads=0;
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>{checks++;return selectRelease([release(version)],'1.22.0');},download:async(_r,file)=>{downloads++;await fs.writeFile(file,content);}});
 await updater.check();assert.equal((await updater.archive()).version,'1.23.0');
 version='1.23.1';await updater.check(true);assert.equal(checks,1,'automatic checks respect the pending-update interval');
 await updater.check();assert.equal((await updater.archive()).version,'1.23.1');assert.equal(downloads,2);
 await updater.check();assert.equal(downloads,2,'the same prepared version is not downloaded again');
 assert.equal(updater.snapshot().phase,'ready');
});
test('queued updates are replaced automatically when due, with no repeat download or downgrade',async()=>{
 let version='1.23.0',downloads=0;
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release(version)],'1.22.0'),download:async(_r,file)=>{downloads++;await fs.writeFile(file,content);}});
 await updater.check();version='1.23.1';updater.set({checkedAt:Date.now()-31*60000});
 await updater.check(true);assert.equal((await updater.archive()).version,'1.23.1');assert.equal(downloads,2);
 version='1.23.0';await updater.check();assert.equal((await updater.archive()).version,'1.23.1');assert.equal(downloads,2);
 assert.equal(checkInterval({release:{}}),30*60000);assert.equal(checkInterval({failedVersion:'1.23.0'}),5*60000);
 assert.equal(checkInterval({}),6*3600000);
 await updater.preferences({autoCheck:false});updater.set({checkedAt:0});version='1.23.2';await updater.check(true);assert.equal(updater.snapshot().release.version,'1.23.1');
});
test('install checks freshness before staging, and a replacement still needs a restart action',async()=>{
 let version='1.23.0',installs=0;
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release(version)],'1.22.0'),download:async(_r,file)=>fs.writeFile(file,content)});
 await updater.check();version='1.23.1';const install=async(_file,v)=>{installs++;assert.equal(v,'1.23.1');return {restarting:true};};
 await updater.install(install);assert.equal(installs,0);assert.equal(updater.snapshot().phase,'ready');assert.equal(updater.snapshot().release.version,'1.23.1');
 await updater.install(install);assert.equal(installs,1);assert.equal(updater.snapshot().phase,'restarting');
});
test('failed installation triggers one replacement search and survives relaunch without a retry loop',async()=>{
 let version='1.23.0',downloads=0,checks=0;const directory=await dir();
 const options={directory,current:'1.22.0',canInstall:true,find:async()=>{checks++;return selectRelease([release(version)],'1.22.0');},download:async(_r,file)=>{downloads++;await fs.writeFile(file,content);}};
 const updater=new OnlineUpdate(options);await updater.check();
 await updater.install(async()=>({error:'Unsafe or invalid update entry.'}));
 assert.equal(updater.snapshot().phase,'error');assert.equal(downloads,1);assert.equal(checks,3,'initial lookup, install preflight, then bounded recovery');
 const reopened=new OnlineUpdate(options);await reopened.ready;assert.equal(reopened.snapshot().phase,'error');
 await reopened.check();assert.equal(downloads,1,'the rejected version is not silently downloaded again');
 version='1.23.1';reopened.set({checkedAt:Date.now()-6*60000});await reopened.check(true);
 assert.equal(downloads,2);assert.equal(reopened.snapshot().phase,'ready');assert.equal((await reopened.archive()).version,'1.23.1');
});
test('an install failure can immediately discover a newly published replacement',async()=>{
 let version='1.23.0';const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release(version)],'1.22.0'),download:async(_r,file)=>fs.writeFile(file,content)});
 await updater.check();await updater.install(async()=>{version='1.23.1';return {error:'Rejected package'};});
 assert.equal((await updater.archive()).version,'1.23.1');assert.equal(updater.snapshot().failedVersion,'');
});
test('replacement checks respect download preferences and offline installs remain possible',async()=>{
 let version='1.23.0';const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release(version)],'1.22.0'),download:async(_r,file)=>fs.writeFile(file,content)});
 await updater.check();await updater.preferences({autoDownload:false});version='1.23.1';
 await updater.install(async()=>assert.fail('the superseded package must not be installed'));assert.equal(updater.snapshot().phase,'available');
 await updater.startDownload();updater.find=async()=>{throw Error('Offline')};
 await updater.install(async(_f,v)=>{assert.equal(v,'1.23.1');return {cancelled:true};});assert.equal(updater.snapshot().phase,'ready');
});
test('cancelling install-time discovery stops installation and overlapping clicks are ignored',async()=>{
 let started,finish;const began=new Promise(r=>started=r);
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release('1.23.1')],'1.22.0'),download:async(_r,file)=>fs.writeFile(file,content)});
 await updater.check();updater.find=async(_v,{signal})=>{started();return new Promise((resolve,reject)=>{finish=resolve;signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});};
 let installs=0;const pending=updater.install(async()=>{installs++;return {restarting:true};});await began;
 await updater.install(async()=>assert.fail('duplicate install'));updater.cancel();await pending;
 assert.equal(installs,0);assert.equal(updater.snapshot().phase,'ready');
});
test('a failed manual recheck retains the verified download and preparation cannot be interrupted',async()=>{
 const updater=new OnlineUpdate({directory:await dir(),current:'1.22.0',canInstall:true,find:async()=>selectRelease([release('1.23.1')],'1.22.0'),download:async(_r,file)=>fs.writeFile(file,content)});
 await updater.check();updater.find=async()=>{throw Error('Offline');};
 await updater.check();assert.equal(updater.snapshot().phase,'ready');assert.match(updater.snapshot().message,/Offline/);
 assert.equal((await updater.archive()).version,'1.23.1');
 updater.set({phase:'preparing'});await updater.check();assert.equal(updater.snapshot().phase,'preparing');
});
test('cancelling an in-flight download returns to an available update',async()=>{
 let started;const begun=new Promise(resolve=>started=resolve);
 const updater=new OnlineUpdate({directory:await dir(),current:'1.1.4',canInstall:true,find:async()=>selectRelease([release()],'1.1.4'),download:async(_r,_f,{signal})=>{started();await new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}));}});
 const check=updater.check();await begun;updater.cancel();await check;assert.equal(updater.snapshot().phase,'available');assert.match(updater.snapshot().message,/cancelled/);
});
test('update IPC rejects foreign frames and development installs cannot replace app files',async()=>{
 const {installPortableUpdate}=require('../electron/portable-update.cjs'),directory=await dir(),handlers=new Map(),win=new EventEmitter(),url='http://127.0.0.1:43210';
 win.webContents=new EventEmitter();win.webContents.mainFrame={url:url+'/'};win.webContents.send=()=>{};win.isDestroyed=()=>false;
 installPortableUpdate({app:{isPackaged:false,getVersion:()=> '1.1.4',getPath:()=>directory},ipcMain:{handle:(key,fn)=>handlers.set(key,fn),removeHandler:key=>handlers.delete(key)},dialog:{},win,root:process.cwd(),url});
 const call=handlers.get('resonance:online-update'),event={sender:win.webContents,senderFrame:win.webContents.mainFrame};
 try{assert.equal((await call(event,'status')).canInstall,false);await assert.rejects(call({...event,senderFrame:{url:url+'/'}},'status'),/rejected/);await assert.rejects(call({...event,sender:{}},'status'),/rejected/);await assert.rejects(call(event,'unknown'),/Unknown/);assert.match((await handlers.get('resonance:update')(event)).message,/workspace installation/);}finally{win.emit('closed');}
 assert.equal(handlers.size,0);
});

test('both update screens distinguish test builds from approved releases',async()=>{
 for(const file of ['../public/app-update-ui.js','../android/shared/app-update-ui.js']){
  const {updateChannelLabel}=await import(file);
  assert.equal(updateChannelLabel({channel:'development'}),'Development channel · test builds');
  assert.equal(updateChannelLabel({channel:'release'}),'Release channel · approved updates');
 }
});
