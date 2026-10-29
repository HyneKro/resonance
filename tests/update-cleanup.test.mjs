import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
async function versionFixture(t,current){
 const root=await fs.mkdtemp(path.resolve('test-output/update-retention-'));
 t.after(async()=>{assert.ok(root.startsWith(path.resolve('test-output')+path.sep+'update-retention-'));await fs.rm(root,{recursive:true,force:true});});
 const write=async(file,data)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof data==='string'?data:JSON.stringify(data));};
 await write(path.join(root,'portable.flag'),'');await write(path.join(root,'resources/app/package.json'),{version:current});
 const run=async version=>{const dir=path.join(root,'.updates',randomUUID());await write(path.join(dir,'payload/app.txt'),'payload');await write(path.join(dir,'backup/app.txt'),'backup');await write(path.join(dir,'result.json'),{ok:true,version});return dir;};
 const cleanup=async apply=>JSON.parse((await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('electron/cleanup-updates.ps1'),'-Destination',root,...(apply?['-Apply']:[])],{windowsHide:true})).stdout);
 return {root,run,cleanup};
}
test('installed update retention keeps one rollback, pending work and personal data',async()=>{
 const root=await fs.mkdtemp(path.resolve('test-output/update-retention-'));
 const write=async(file,data)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,typeof data==='string'?data:JSON.stringify(data));};
 await write(path.join(root,'portable.flag'),'');await write(path.join(root,'resources/app/package.json'),{version:'2.0.0'});
 await write(path.join(root,'data/library.sqlite'),'personal');
 const run=async(version,extra={})=>{const dir=path.join(root,'.updates',randomUUID());await write(path.join(dir,'payload/app.txt'),'payload');await write(path.join(dir,'backup/app.txt'),'backup');if(version)await write(path.join(dir,'result.json'),{ok:true,version,...extra});return dir;};
 const older=await run('1.0.0'),latest=await run('2.0.0'),pending=await run(null),failed=await run('1.5.0',{ok:false,rollbackErrors:['locked']});
 const active=await run('1.1.0');await write(path.join(active,'ready.json'),{pid:process.pid});
 const personal=await run('1.2.0');await write(path.join(personal,'backup/data/music.flac'),'personal');
 const linked=await run('1.3.0');await fs.symlink(path.join(root,'data'),path.join(linked,'payload/redirect'),'junction');
 const empty=path.join(root,'.updates',randomUUID());await fs.mkdir(empty);
 const discarded=path.join(root,'.updates',randomUUID());await write(path.join(discarded,'owner.json'),{pid:0,phase:'discarded'});await write(path.join(discarded,'payload/app.txt'),'discarded');
 const cleanup=async apply=>JSON.parse((await exec('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.resolve('electron/cleanup-updates.ps1'),'-Destination',root,...(apply?['-Apply']:[])],{windowsHide:true})).stdout);
 const plan=await cleanup(false);assert.equal(plan.removed.length,4);assert.ok(await fs.stat(older));
 const result=await cleanup(true);assert.equal(result.removed.length,4);
 for(const file of [older,empty,discarded,path.join(latest,'payload')])await assert.rejects(fs.stat(file),{code:'ENOENT'});
 for(const file of [path.join(latest,'backup'),pending,failed,active,personal,linked])assert.ok(await fs.stat(file));
 assert.equal(await fs.readFile(path.join(root,'data/library.sqlite'),'utf8'),'personal');
 assert.equal((await cleanup(true)).removed.length,0,'second run is idempotent');
 await fs.unlink(path.join(linked,'payload/redirect'));
});
test('development update cleanup orders numeric revisions and retains future or unknown versions',async t=>{
 const {run,cleanup}=await versionFixture(t,'1.26.3-dev.10');
 // Write the older result last: rollback selection must use versions, not timestamps.
 const latest=await run('1.26.3-dev.10'),older=await run('1.26.3-dev.9'),oldCore=await run('1.26.2');
 const future=[];for(const version of ['1.26.3-dev.11','1.26.3-preview','1.26.3','1.26.4-dev.1'])future.push(await run(version));
 const unknown=[];for(const version of ['1.26.3-nightly.1','1.26.3-dev.bad','1.26.3-DEV.1','1.26','9007199254740992.0.0','1.26.3-dev.9007199254740992',null])unknown.push(await run(version));
 const plan=await cleanup(false);assert.equal(plan.removed.length,3);assert.ok(await fs.stat(path.join(latest,'payload')));
 const result=await cleanup(true);assert.equal(result.removed.length,3);
 for(const file of [older,oldCore,path.join(latest,'payload')])await assert.rejects(fs.stat(file),{code:'ENOENT'});
 assert.ok(await fs.stat(path.join(latest,'backup')));
 for(const dir of [...future,...unknown]){assert.ok(await fs.stat(path.join(dir,'payload')));assert.ok(await fs.stat(path.join(dir,'backup')));assert.ok(result.kept.some(entry=>entry.path===dir));}
 assert.equal((await cleanup(true)).removed.length,0);
});
test('preview and stable cleanup use the updater prerelease ordering for rollback',async t=>{
 for(const [current,olderVersions] of [['2.0.0-preview.10',['2.0.0-preview.9','2.0.0-preview','2.0.0-dev.999']],['2.0.0',['2.0.0-preview.10','2.0.0-dev.999']]]){
  const {run,cleanup}=await versionFixture(t,current),latest=await run(current),older=[];
  for(const version of olderVersions)older.push(await run(version));
  const result=await cleanup(true);assert.equal(result.removed.length,older.length+1);
  for(const file of [...older,path.join(latest,'payload')])await assert.rejects(fs.stat(file),{code:'ENOENT'});
  assert.ok(await fs.stat(path.join(latest,'backup')));
 }
});
test('unknown installed version stops cleanup before removing any update',async t=>{
 const {run,cleanup}=await versionFixture(t,'1.26.3-local.1'),completed=await run('1.26.3-dev.1');
 await assert.rejects(cleanup(true),/Unsupported release version/);
 for(const name of ['backup','payload','result.json'])assert.ok(await fs.stat(path.join(completed,name)));
});
