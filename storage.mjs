import fs from 'node:fs/promises';
import path from 'node:path';

const key=p=>process.platform==='win32'?path.resolve(p).toLowerCase():path.resolve(p);
const inside=(p,root)=>p===root||p.startsWith(root+path.sep);
const bucket=()=>({bytes:0,files:0});
export function musicStorage(tracks){
 const result={...bucket(),unavailable:0,unknown:0},seen=new Set();
 for(const track of tracks){
  if(!track.path)continue;const name=key(track.path);if(seen.has(name))continue;seen.add(name);
  if(!track.available){result.unavailable++;continue;}
  result.files++;if(Number.isFinite(track.size)&&track.size>=0)result.bytes+=track.size;else result.unknown++;
 }
 return result;
}

// Read metadata only: no music decoding, file changes, or directory-link traversal.
// More specific roots win, so portable browser data is never counted twice.
export async function measureStorage({tracks=[],dataDir,profileDir,applicationPaths=[]}){
 const result={music:musicStorage(tracks),artwork:bucket(),library:bucket(),browser:bucket(),application:bucket(),browserMeasured:!!profileDir,skipped:0};
 const roots=[{path:dataDir,kind:'library'},{path:path.join(dataDir,'artwork'),kind:'artwork'},{path:path.join(dataDir,'wallpapers'),kind:'artwork'},...(profileDir?[{path:profileDir,kind:'browser'}]:[]),...applicationPaths.map(p=>({path:p,kind:'application'}))].map(r=>({...r,path:key(r.path)}));
 const priority=[...roots].sort((a,b)=>b.path.length-a.path.length),seen=new Set(),musicPaths=new Set(tracks.filter(t=>t.available&&t.path).map(t=>key(t.path)));
 const visit=async(file,root=false)=>{
  const name=key(file);if(seen.has(name))return;seen.add(name);
  let stat;try{stat=await fs.lstat(file);}catch(e){if(!root||e.code!=='ENOENT')result.skipped++;return;}
  if(stat.isSymbolicLink())return;
  if(stat.isDirectory()){
   try{const directory=await fs.opendir(file);for await(const entry of directory)await visit(path.join(file,entry.name));}catch{result.skipped++;}
  }else if(stat.isFile()&&!musicPaths.has(name)){
   const category=priority.find(r=>inside(name,r.path))?.kind;if(category){result[category].bytes+=stat.size;result[category].files++;}
  }
 };
 for(const root of roots)await visit(root.path,true);
 result.totalBytes=['music','artwork','library','browser','application'].reduce((sum,k)=>sum+result[k].bytes,0);
 result.checkedAt=Date.now();result.estimated=true;return result;
}

export function createStorageReader(lib,{profileDir,applicationPaths,now=Date.now,measure=measureStorage}={}){
 let cached,pending;
 return async({refresh=false}={})=>{
  if(pending)return pending;
  if(cached&&now()-cached.checkedAt<(refresh?5000:60000)){const music=musicStorage(lib.list());return {...cached,music,totalBytes:cached.totalBytes-cached.music.bytes+music.bytes};}
  pending=measure({tracks:lib.list(),dataDir:lib.dataDir,profileDir,applicationPaths}).then(result=>cached=result).finally(()=>{pending=null;});return pending;
 };
}

export async function applicationStoragePaths(root){
 const files=(await fs.readdir(root)).filter(name=>name.endsWith('.mjs')||['package.json','package-lock.json','config.json'].includes(name));
 return [...files,'public','electron','tools','node_modules'].map(name=>path.join(root,name));
}
