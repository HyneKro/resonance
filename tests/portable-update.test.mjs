import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {verifyPortableUpdate} from '../scripts/verify-portable-update.mjs';
const run=promisify(execFile),quote=s=>"'"+s.replaceAll("'","''")+"'",root=process.cwd();
const ps=(file,args=[])=>run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron',file),...args],{windowsHide:true,timeout:60000});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function exists(file){return fs.stat(file).then(()=>true,()=>false);}
async function until(file){for(let i=0;i<120;i++){if(await exists(file))return;await sleep(50);}throw Error('Fixture did not become ready: '+file);}
async function report(f){return JSON.parse((await fs.readFile(path.join(f.dest,'.updates/test/result.json'),'utf8')).replace(/^\uFEFF/,''));}
async function holdFile(f,target){
 const ready=path.join(f.dir,'lock-ready'),release=path.join(f.dir,'release-lock');
 const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-Command',`$stream=[IO.File]::Open(${quote(target)},[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read);try{[IO.File]::WriteAllText(${quote(ready)},'ready');$deadline=[DateTime]::UtcNow.AddSeconds(20);while(-not(Test-Path -LiteralPath ${quote(release)}) -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 30}}finally{$stream.Dispose()}`],{windowsHide:true,stdio:'ignore'});
 const done=new Promise(resolve=>child.once('exit',resolve));await until(ready);
 return async()=>{await fs.writeFile(release,'release');await done;};
}
async function fixture(){
 const dir=await fs.mkdtemp(path.join(root,'test-output','portable-update-')),source=path.join(dir,'release'),dest=path.join(dir,'installed'),stage=path.join(dest,'.updates','test','payload');
 const contents={'Resonance.exe':'new app','portable.flag':'portable','resources/app/package.json':'{"version":"1.1.0"}','resources/app/config.json':'{"sources":[]}','resources/app/public/app.js':'new js','resources/app/electron/main.cjs':'main','version':'44','LICENSE':'license','resources.pak':'pak','START HERE.txt':'help','resources/app/tools/empty.txt':''};
 const manifest={product:'resonance-portable',schema:1,version:'1.1.0',files:[]};
 for(const [name,text]of Object.entries(contents)){const target=path.join(source,name);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,text);manifest.files.push({path:name,bytes:Buffer.byteLength(text),sha256:createHash('sha256').update(text).digest('hex')});}
 await fs.mkdir(path.dirname(stage),{recursive:true});await fs.mkdir(path.join(dest,'data'),{recursive:true});await fs.mkdir(path.join(dest,'resources','app'),{recursive:true});
 await fs.writeFile(path.join(dest,'portable.flag'),'portable');await fs.writeFile(path.join(dest,'Resonance.exe'),'old app');await fs.writeFile(path.join(dest,'data','personal.txt'),'music, settings, playlists');await fs.writeFile(path.join(dest,'resources','app','config.json'),'personal config');
 const archive=async()=>{await fs.writeFile(path.join(source,'resonance-update.json'),JSON.stringify(manifest));const zip=path.join(dir,'release-'+Date.now()+'.zip');await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -AssemblyName System.IO.Compression.FileSystem; [IO.Compression.ZipFile]::CreateFromDirectory(${quote(source)},${quote(zip)})`],{windowsHide:true});return zip;};
 return {dir,source,dest,stage,manifest,archive};
}
test('portable update preserves personal data/config and saves replaced files',async()=>{
 const f=await fixture(),zip=await f.archive();const prepared=await ps('prepare-update.ps1',['-Archive',zip,'-Stage',f.stage]);assert.equal(JSON.parse(prepared.stdout.replace(/^\uFEFF/,'')).version,'1.1.0');
 await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
 const read=p=>fs.readFile(path.join(f.dest,p),'utf8');assert.equal(await read('Resonance.exe'),'new app');assert.equal(await read('data/personal.txt'),'music, settings, playlists');assert.equal(await read('resources/app/config.json'),'personal config');assert.equal(await read('.updates/test/backup/Resonance.exe'),'old app');
 assert.equal(JSON.parse((await read('.updates/test/result.json')).replace(/^\uFEFF/,'' )).ok,true);
});

test('hidden helper acknowledges startup, survives parent exit and completes the update',async()=>{
 const f=await fixture(),executable=path.join(f.source,'Resonance.exe');await fs.unlink(executable);
 const code='public class Probe { [System.Runtime.InteropServices.StructLayout(System.Runtime.InteropServices.LayoutKind.Sequential)] public struct Startup {public int cb;public System.IntPtr reserved,desktop,title;public int x,y,xSize,ySize,xChars,yChars,fill,flags;public short showWindow,reserved2;public System.IntPtr reservedPtr,input,output,error;} [System.Runtime.InteropServices.DllImport("kernel32.dll")] static extern void GetStartupInfo(out Startup info);public static void Main(string[] args){Startup info;GetStartupInfo(out info);string root=System.AppDomain.CurrentDomain.BaseDirectory;System.IO.File.WriteAllText(System.IO.Path.Combine(root,"window.txt"),info.showWindow+"|"+string.Join(" ",args));System.IO.File.WriteAllText(System.IO.Path.Combine(root,"relaunched.txt"),System.IO.File.ReadAllText(System.IO.Path.Combine(root,"resources/app/package.json")));}}';
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -TypeDefinition ${quote(code)} -OutputAssembly ${quote(executable)} -OutputType WindowsApplication`],{windowsHide:true});
 const binary=await fs.readFile(executable);Object.assign(f.manifest.files.find(x=>x.path==='Resonance.exe'),{bytes:binary.length,sha256:createHash('sha256').update(binary).digest('hex')});
 await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const parent=path.join(f.dir,'launcher.cjs');await fs.writeFile(parent,`const {execFile}=require('node:child_process');execFile('powershell.exe',${JSON.stringify(['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron','launch-update.ps1'),'-Helper',path.join(root,'electron','apply-update.ps1'),'-Destination',f.dest,'-Stage',f.stage])}.concat('-WaitFor',String(process.pid)),{windowsHide:true},(error,stdout)=>{if(error){console.error(error);process.exit(1)}const ready=JSON.parse(stdout.trim());if(!ready.pid)process.exit(2);process.exit(0)});`);
 await run(process.execPath,[parent],{windowsHide:true,timeout:10000});
 let report;for(let i=0;i<100;i++){try{report=JSON.parse((await fs.readFile(path.join(f.dest,'.updates/test/result.json'),'utf8')).replace(/^\uFEFF/,''));break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(report,'helper wrote a result');assert.equal(report.ok,true,report.error);
 let launched;for(let i=0;i<50;i++){try{launched=JSON.parse(await fs.readFile(path.join(f.dest,'relaunched.txt'),'utf8'));break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal(launched?.version,'1.1.0','the helper automatically launched the newly installed executable');
 assert.equal(await fs.readFile(path.join(f.dest,'window.txt'),'utf8'),'1|--updated','the new app is launched with SW_SHOWNORMAL, not SW_HIDE');
 assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
});

test('helper startup failure is reported before the caller closes',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);await fs.unlink(path.join(f.dest,'portable.flag'));
 await assert.rejects(ps('launch-update.ps1',['-Helper',path.join(root,'electron','apply-update.ps1'),'-Destination',f.dest,'-Stage',f.stage,'-WaitFor',String(process.pid),'-NoLaunch']),/stopped before it was ready/);
 assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');
});
test('a tampered staged file is rejected before replacements',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);await fs.writeFile(path.join(f.stage,'resources/app/public/app.js'),'corrupt');
 await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
 const report=JSON.parse((await fs.readFile(path.join(f.dest,'.updates/test/result.json'),'utf8')).replace(/^\uFEFF/,''));assert.equal(report.ok,false);assert.deepEqual(report.rollbackErrors,[]);assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
});

test('temporary Windows file locks are retried before replacing anything',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const release=await holdFile(f,path.join(f.dest,'Resonance.exe'));
 try{
  const applying=ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
  await until(path.join(f.dest,'.updates/test/ready.json'));await sleep(800);
  assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');
  await release();await applying;
  const result=await report(f);assert.equal(result.ok,true,result.error);assert.ok(result.lockRetries>0);
  assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'new app');
 }finally{await release();}
});

test('persistent locks leave the entire old installation intact without false rollback errors',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 // Put the locked file last: preflight must still prevent earlier replacements.
 const manifest=JSON.parse(await fs.readFile(path.join(f.stage,'resonance-update.json'),'utf8').then(s=>s.replace(/^\uFEFF/,'')));
 manifest.files.push(manifest.files.shift());await fs.writeFile(path.join(f.stage,'resonance-update.json'),JSON.stringify(manifest));
 const release=await holdFile(f,path.join(f.dest,'Resonance.exe'));
 try{await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch','-LockTimeoutSeconds','1']);}
 finally{await release();}
 const result=await report(f);assert.equal(result.ok,false);assert.equal(result.reason,'files-in-use');assert.equal(result.changedFiles,0);assert.deepEqual(result.rollbackErrors,[]);
 assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');
 assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
 assert.equal(await exists(path.join(f.dest,'resources/app/public/app.js')),false);
});

test('unchanged binaries are not overwritten or backed up even when held read-only',async()=>{
 const f=await fixture();await fs.copyFile(path.join(f.source,'Resonance.exe'),path.join(f.dest,'Resonance.exe'));
 await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const release=await holdFile(f,path.join(f.dest,'Resonance.exe'));
 try{await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch','-LockTimeoutSeconds','1']);}
 finally{await release();}
 const result=await report(f);assert.equal(result.ok,true,result.error);assert.ok(result.unchangedFiles>=1);
 assert.equal(await exists(path.join(f.dest,'.updates/test/backup/Resonance.exe')),false);
});

test('only one helper can apply an update to an installation at a time',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const release=await holdFile(f,path.join(f.dest,'Resonance.exe'));
 const applying=ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
 try{
  await until(path.join(f.dest,'.updates/test/ready.json'));
  await assert.rejects(ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']),/Another update is already finishing/);
  assert.equal(await exists(path.join(f.dest,'.updates/test/result.json')),false,'Rejected helper cannot write a result for the active run');
 }finally{await release();await applying;}
 assert.equal((await report(f)).ok,true);
});

test('post-install validation failure atomically restores actual replacements and the previous manifest',async()=>{
 const f=await fixture();await fs.writeFile(path.join(f.dest,'resonance-update.json'),'previous manifest');
 await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const changed='{"version":"9.0.0"}',entry=f.manifest.files.find(x=>x.path==='resources/app/package.json');
 entry.bytes=Buffer.byteLength(changed);entry.sha256=createHash('sha256').update(changed).digest('hex');
 await fs.writeFile(path.join(f.stage,entry.path),changed);await fs.writeFile(path.join(f.stage,'resonance-update.json'),JSON.stringify(f.manifest));
 await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
 const result=await report(f);assert.equal(result.ok,false);assert.ok(result.changedFiles>0);assert.deepEqual(result.rollbackErrors,[]);
 assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');
 assert.equal(await fs.readFile(path.join(f.dest,'resonance-update.json'),'utf8'),'previous manifest');
 assert.equal(await fs.readFile(path.join(f.dest,'resources/app/config.json'),'utf8'),'personal config');
 assert.equal(await exists(path.join(f.dest,'resources/app/package.json')),false);
});

test('the helper waits for remaining app processes and excludes another installation',async()=>{
 const f=await fixture(),exe=path.join(f.dest,'Resonance.exe'),other=path.join(f.dir,'other-install');
 await fs.unlink(exe);await fs.mkdir(other);
 const code='public class Hold {public static void Main(string[] args){string root=System.AppDomain.CurrentDomain.BaseDirectory;System.IO.File.WriteAllText(System.IO.Path.Combine(root,"holding"),"ready");while(!System.IO.File.Exists(System.IO.Path.Combine(root,"release")))System.Threading.Thread.Sleep(30);}}';
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -TypeDefinition ${quote(code)} -OutputAssembly ${quote(exe)} -OutputType WindowsApplication`],{windowsHide:true});
 await fs.copyFile(exe,path.join(other,'Resonance.exe'));await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const own=spawn(exe,[],{windowsHide:true,stdio:'ignore'}),foreign=spawn(path.join(other,'Resonance.exe'),[],{windowsHide:true,stdio:'ignore'});
 const ownExit=new Promise(resolve=>own.once('exit',resolve)),foreignExit=new Promise(resolve=>foreign.once('exit',resolve));
 try{
  await until(path.join(f.dest,'holding'));await until(path.join(other,'holding'));
  const applying=ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
  await until(path.join(f.dest,'.updates/test/ready.json'));await sleep(600);
  assert.equal(await exists(path.join(f.dest,'.updates/test/result.json')),false);
  await fs.writeFile(path.join(f.dest,'release'),'release');await ownExit;await applying;
  const result=await report(f);assert.equal(result.ok,true,result.error);assert.ok(result.processWaits>0);
  assert.equal(foreign.exitCode,null,'Another portable installation is left running');
 }finally{await fs.writeFile(path.join(f.dest,'release'),'release');await fs.writeFile(path.join(other,'release'),'release');await Promise.all([ownExit,foreignExit]);}
});
test('bad hashes, traversal and personal-data entries are rejected before installation',async()=>{
 for(const bad of ['hash','../outside.txt','data/library.sqlite']){const f=await fixture();if(bad==='hash')f.manifest.files[0].sha256='0'.repeat(64);else f.manifest.files[0].path=bad;await assert.rejects(ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]));assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');}
});

test('release gate rejects the 1.23.0 helper location and accepts the compatible layout',async()=>{
 const f=await fixture(),helper=Buffer.from('# Historical native helper fixture\n');
 const entry={path:'resources/app/lyrics-extract.ps1',bytes:helper.length,sha256:createHash('sha256').update(helper).digest('hex')};
 await fs.writeFile(path.join(f.source,entry.path),helper);f.manifest.files.push(entry);
 await assert.rejects(verifyPortableUpdate(await f.archive()),/Unsafe or invalid update entry/);
 const old=path.join(f.source,entry.path);entry.path='resources/app/electron/lyrics-extract.ps1';
 await fs.rename(old,path.join(f.source,entry.path));
 assert.equal((await verifyPortableUpdate(await f.archive())).version,'1.1.0');
 assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
});
