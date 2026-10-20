import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn} from 'node:child_process';
import {Worker} from 'node:worker_threads';
import os from 'node:os';
import {fileURLToPath} from 'node:url';

export const ENGINE_FILES=[
 {name:'engine.zip',size:8928640,sha256:'6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb',url:'https://github.com/ggml-org/whisper.cpp/releases/download/b5454/whisper-bin-x64.zip'},
 {name:'model.bin',size:190085487,sha256:'ae85e4a935d7a567bd102fe55afc16bb595bdb618e11b2fc7591bc08120411bb',url:'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small-q5_1.bin'}
];
export const engineDirectory=base=>path.join(base,'lyrics-engine','b5454-small-q5_1');
export async function hashFile(file){const hash=createHash('sha256');for await(const chunk of createReadStream(file))hash.update(chunk);return hash.digest('hex');}
export function runQuiet(file,args,{signal,timeout=1800000,onOutput=()=>{}}={}){
 return new Promise((resolve,reject)=>{
  const child=spawn(file,args,{windowsHide:true,stdio:['ignore','pipe','pipe'],signal});
  try{os.setPriority(child.pid,os.constants.priority.PRIORITY_BELOW_NORMAL);}catch{}
  let tail='',expired=false;const timer=setTimeout(()=>{expired=true;child.kill();},timeout);timer.unref();
  const output=chunk=>{tail=(tail+chunk).slice(-4000);onOutput(String(chunk));};child.stdout.on('data',output);child.stderr.on('data',output);
  child.once('error',e=>{clearTimeout(timer);reject(e);});
  child.once('close',code=>{clearTimeout(timer);code===0&&!expired?resolve():reject(Error(signal?.aborted?'Cancelled':expired?'Analysis took too long. Try a shorter song.':'The local lyrics tool could not finish. '+tail.slice(-450)));});
 });
}
async function removeWork(base,work){const parent=path.resolve(base)+path.sep,target=path.resolve(work);if(!target.startsWith(parent))throw Error('Unsafe temporary path');await fs.rm(target,{recursive:true,force:true});}
export async function installLyricsEngine(base,{signal,onProgress=()=>{}}={}){
 const parent=path.join(base,'lyrics-engine');await fs.mkdir(parent,{recursive:true});
 const disk=await fs.statfs(parent);if(disk.bavail*disk.bsize<650e6)throw Error('Free at least 650 MB before installing the lyrics tool.');
 const work=await fs.mkdtemp(path.join(parent,'install-'));
 try{
  let received=0;const total=ENGINE_FILES.reduce((n,f)=>n+f.size,0);
  for(const item of ENGINE_FILES){
   const response=await fetch(item.url,{signal:AbortSignal.any([signal||new AbortController().signal,AbortSignal.timeout(1200000)])});if(!response.ok)throw Error('Could not download the lyrics tool. Try again later.');
   const file=await fs.open(path.join(work,item.name),'wx'),hash=createHash('sha256');let size=0;
   try{for await(const chunk of response.body){size+=chunk.length;if(size>item.size)throw Error('Unexpected download size');hash.update(chunk);await file.write(chunk);received+=chunk.length;onProgress(received/total);}}finally{await file.close();}
   if(size!==item.size||hash.digest('hex')!==item.sha256)throw Error('Lyrics tool verification failed. Nothing was installed.');
  }
  await runQuiet('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',fileURLToPath(new URL('./lyrics-extract.ps1',import.meta.url)),path.join(work,'engine.zip'),path.join(work,'runtime')],{signal,timeout:120000});
  const executable=path.join(work,'runtime','Release','whisper-cli.exe');await fs.access(executable);
  await fs.unlink(path.join(work,'engine.zip'));
  const files={};for(const name of await fs.readdir(path.join(work,'runtime','Release')))if(/\.(exe|dll)$/i.test(name))files[name]=await hashFile(path.join(work,'runtime','Release',name));
  await fs.writeFile(path.join(work,'verified.json'),JSON.stringify({files,model:ENGINE_FILES[1].sha256}));
  if(await fs.stat(engineDirectory(base)).catch(()=>null))await removeWork(parent,engineDirectory(base));
  await fs.rename(work,engineDirectory(base));
 }finally{await removeWork(parent,work);}
}
export async function checkLyricsEngine(base,{verify=false}={}){
 const directory=engineDirectory(base);
 try{const manifest=JSON.parse(await fs.readFile(path.join(directory,'verified.json'),'utf8'));if(manifest.model!==ENGINE_FILES[1].sha256)return false;
  await fs.access(path.join(directory,'runtime','Release','whisper-cli.exe'));await fs.access(path.join(directory,'model.bin'));
  if(verify){if(await hashFile(path.join(directory,'model.bin'))!==manifest.model)return false;for(const [name,hash] of Object.entries(manifest.files)){if(path.basename(name)!==name||await hashFile(path.join(directory,'runtime','Release',name))!==hash)return false;}}
  return true;
 }catch{return false;}
}
export async function analyzeLyricsAudio(base,track,record,{signal,onProgress=()=>{}}={}){
 const parent=path.join(base,'lyrics-work');await fs.mkdir(parent,{recursive:true});const work=await fs.mkdtemp(path.join(parent,'song-')),engine=engineDirectory(base);
 try{
  await runQuiet(path.join(fileURLToPath(new URL('.',import.meta.url)),'tools','ffmpeg.exe'),['-hide_banner','-nostdin','-loglevel','error','-threads','1','-filter_threads','1','-i',track.path,'-t','1200','-map','0:a:0','-vn','-ar','16000','-ac','1','-c:a','pcm_s16le',path.join(work,'audio.wav')],{signal,timeout:120000});
  onProgress(.03);
  // A second bounded pass can recover vocals initially classified as music.
  // Never retry tool failures, cancellation, or a successful alignment.
  for(let pass=0;pass<2;pass++){
   await runQuiet(path.join(engine,'runtime','Release','whisper-cli.exe'),['-m',path.join(engine,'model.bin'),'-f',path.join(work,'audio.wav'),'-t','2','-ng','-l','auto','-ojf','-of',path.join(work,'result'),'-dtw','small','-nfa','-bo',pass?'3':'1','-bs',pass?'3':'1','-nf','-pp',...(pass?['-sns','-mc','0']:[])],{signal,onOutput:text=>{const m=text.match(/progress\s*=\s*(\d+)%/);if(m)onProgress(.03+pass*.47+.46*Number(m[1])/100);}});
   const file=path.join(work,'result.json');if((await fs.stat(file)).size>12e6)throw Error('Lyrics analysis output is too large.');
   const result=JSON.parse(await fs.readFile(file,'utf8'));
   try{const value=await alignInWorker(record,result,track.duration,signal);onProgress(1);return value;}
   catch(e){if(pass||signal?.aborted||!e.unmatched)throw e;}
  }
 }finally{await removeWork(parent,work);}
}
function alignInWorker(record,result,duration,signal){
 return new Promise((resolve,reject)=>{
   const worker=new Worker(new URL('./lyric-alignment-worker.mjs',import.meta.url),{workerData:{record,result,duration}});
   const cancel=()=>{void worker.terminate();reject(Error('Cancelled'));};signal?.addEventListener('abort',cancel,{once:true});
   worker.once('message',r=>{signal?.removeEventListener('abort',cancel);r.error?reject(Object.assign(Error(r.error),{unmatched:true})):resolve(r.value);});
   worker.once('error',reject);worker.once('exit',code=>{signal?.removeEventListener('abort',cancel);if(code)reject(Error('Lyrics alignment stopped.'));});
   if(signal?.aborted)cancel();
 });
}
