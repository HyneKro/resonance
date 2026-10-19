import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'test-output/release-work/polish');fs.mkdirSync(output,{recursive:true});
// Give GUI children persistent file handles. A discarded terminal pipe must
// never turn console output into repeating Electron error dialogs.
const env={...process.env,POLISH_PHASE:process.env.POLISH_PHASE||'final'};delete env.ELECTRON_RUN_AS_NODE;
for(const name of ['polish-ui-check','constellation-performance-check','startup-polish-check']){
 const log=fs.openSync(path.join(output,name+'.log'),'w');
 try{
  const code=await new Promise((resolve,reject)=>{
   const child=spawn(require('electron'),[path.join(root,'tests',name+'.cjs')],{cwd:root,env,windowsHide:true,stdio:['ignore',log,log]});
   child.once('error',reject);child.once('exit',code=>resolve(code??1));
  });
  if(code)throw Error(`${name} failed (${code}); see test-output/release-work/polish/${name}.log`);
  console.log(name+': passed');
 }finally{fs.closeSync(log);}
}
