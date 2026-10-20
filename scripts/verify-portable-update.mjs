import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const root=fileURLToPath(new URL('../',import.meta.url));
// Frozen installed updater: testing only the new release's updater can hide
// packages that existing installations cannot accept. Do not relax this fixture.
const baseline=path.join(root,'tests/fixtures/updater/prepare-update-1.22.0.ps1');

export async function verifyPortableUpdate(archive) {
 const parent=path.resolve(root,'test-output/release-work/update-compatibility');
 await fs.mkdir(parent,{recursive:true});
 const work=await fs.mkdtemp(path.join(parent,'verify-'));
 try {
  const {stdout}=await promisify(execFile)('powershell.exe',[
   '-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass',
   '-File',baseline,'-Archive',path.resolve(archive),'-Stage',path.join(work,'payload')
  ],{windowsHide:true,timeout:300000,maxBuffer:1e6});
  return JSON.parse(stdout.replace(/^\uFEFF/,'').trim());
 } finally {
  // Only remove this invocation's fresh temporary directory, never an installation.
  const target=path.resolve(work);
  if(path.dirname(target)!==parent||!path.basename(target).startsWith('verify-'))
   throw Error('Unsafe compatibility-check cleanup path');
  await fs.rm(target,{recursive:true,force:true});
 }
}

if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 if(!process.argv[2])throw Error('Pass the complete portable ZIP to verify.');
 console.log(JSON.stringify(await verifyPortableUpdate(process.argv[2])));
}
