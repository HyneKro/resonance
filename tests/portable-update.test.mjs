import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const run=promisify(execFile),quote=s=>"'"+s.replaceAll("'","''")+"'",root=process.cwd();
const ps=(file,args=[])=>run('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron',file),...args],{windowsHide:true,timeout:60000});
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
 const code='public class Probe { public static void Main(){string root=System.AppDomain.CurrentDomain.BaseDirectory;System.IO.File.WriteAllText(System.IO.Path.Combine(root,"relaunched.txt"),System.IO.File.ReadAllText(System.IO.Path.Combine(root,"resources/app/package.json")));}}';
 await run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type -TypeDefinition ${quote(code)} -OutputAssembly ${quote(executable)} -OutputType WindowsApplication`],{windowsHide:true});
 const binary=await fs.readFile(executable);Object.assign(f.manifest.files.find(x=>x.path==='Resonance.exe'),{bytes:binary.length,sha256:createHash('sha256').update(binary).digest('hex')});
 await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);
 const parent=path.join(f.dir,'launcher.cjs');await fs.writeFile(parent,`const {execFile}=require('node:child_process');execFile('powershell.exe',${JSON.stringify(['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron','launch-update.ps1'),'-Helper',path.join(root,'electron','apply-update.ps1'),'-Destination',f.dest,'-Stage',f.stage])}.concat('-WaitFor',String(process.pid)),{windowsHide:true},(error,stdout)=>{if(error){console.error(error);process.exit(1)}const ready=JSON.parse(stdout.trim());if(!ready.pid)process.exit(2);process.exit(0)});`);
 await run(process.execPath,[parent],{windowsHide:true,timeout:10000});
 let report;for(let i=0;i<100;i++){try{report=JSON.parse((await fs.readFile(path.join(f.dest,'.updates/test/result.json'),'utf8')).replace(/^\uFEFF/,''));break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.ok(report,'helper wrote a result');assert.equal(report.ok,true,report.error);
 let launched;for(let i=0;i<50;i++){try{launched=JSON.parse(await fs.readFile(path.join(f.dest,'relaunched.txt'),'utf8'));break;}catch{}await new Promise(r=>setTimeout(r,100));}
 assert.equal(launched?.version,'1.1.0','the helper automatically launched the newly installed executable');
 assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
});

test('helper startup failure is reported before the caller closes',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);await fs.unlink(path.join(f.dest,'portable.flag'));
 await assert.rejects(ps('launch-update.ps1',['-Helper',path.join(root,'electron','apply-update.ps1'),'-Destination',f.dest,'-Stage',f.stage,'-WaitFor',String(process.pid),'-NoLaunch']),/stopped before it was ready/);
 assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');
});
test('a changed staged file rolls back earlier replacements',async()=>{
 const f=await fixture();await ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]);await fs.writeFile(path.join(f.stage,'resources/app/public/app.js'),'corrupt');
 await ps('apply-update.ps1',['-Destination',f.dest,'-Stage',f.stage,'-NoLaunch']);
 const report=JSON.parse((await fs.readFile(path.join(f.dest,'.updates/test/result.json'),'utf8')).replace(/^\uFEFF/,''));assert.equal(report.ok,false);assert.deepEqual(report.rollbackErrors,[]);assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');assert.equal(await fs.readFile(path.join(f.dest,'data/personal.txt'),'utf8'),'music, settings, playlists');
});
test('bad hashes, traversal and personal-data entries are rejected before installation',async()=>{
 for(const bad of ['hash','../outside.txt','data/library.sqlite']){const f=await fixture();if(bad==='hash')f.manifest.files[0].sha256='0'.repeat(64);else f.manifest.files[0].path=bad;await assert.rejects(ps('prepare-update.ps1',['-Archive',await f.archive(),'-Stage',f.stage]));assert.equal(await fs.readFile(path.join(f.dest,'Resonance.exe'),'utf8'),'old app');}
});
