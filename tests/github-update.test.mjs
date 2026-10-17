import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {EventEmitter} from 'node:events';
const require=createRequire(import.meta.url);
const {compareVersions,selectRelease,findRelease,downloadRelease,allowedUrl,RELEASES_URL}=require('../electron/github-releases.cjs');
const {OnlineUpdate,restoreRelease}=require('../electron/online-update.cjs');
const content=Buffer.from('verified portable archive'),hash=createHash('sha256').update(content).digest('hex');
function release(v='1.1.5',platform='pc'){const name=platform==='pc'?`Resonance-PC-${v}-portable.zip`:`Resonance-Android-${v}.apk`,tag=platform+'-v'+v;return {tag_name:tag,assets:[{name,size:content.length,state:'uploaded',digest:'sha256:'+hash,browser_download_url:RELEASES_URL+'/download/'+tag+'/'+name}],body:'Changes'};}
const dir=async()=>fs.mkdtemp(path.join(process.cwd(),'test-output','github-update-'));
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
