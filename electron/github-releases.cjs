const fs=require('node:fs/promises'),{createHash}=require('node:crypto');
const REPOSITORY='HyneKro/resonance',RELEASES_URL='https://github.com/'+REPOSITORY+'/releases';
const API='https://api.github.com/repos/'+REPOSITORY+'/releases';
function version(value){const m=/^(\d+)\.(\d+)\.(\d+)(?:-(preview)(?:\.(\d+))?)?$/.exec(value);if(!m)return null;const parts=[+m[1],+m[2],+m[3],m[4]?0:1,+(m[5]||0)];return parts.every(Number.isSafeInteger)?parts:null;}
function compareVersions(a,b){const x=version(a),y=version(b);if(!x||!y)throw Error('Unsupported release version');for(let i=0;i<x.length;i++){if(x[i]!==y[i])return Math.sign(x[i]-y[i]);}return 0;}
function selectRelease(releases,current,platform='pc'){
 const candidates=[];
 for(const r of releases){
  const v=String(r.tag_name||'').replace(new RegExp('^'+platform+'-v'),'');
  if(r.draft||!r.tag_name?.startsWith(platform+'-v')||!version(v)||compareVersions(v,current)<=0||platform==='pc'&&(r.prerelease||v.includes('-')))continue;
  const name=platform==='pc'?`Resonance-PC-${v}-portable.zip`:`Resonance-Android-${v}.apk`,assets=(r.assets||[]).filter(a=>a.name===name);
  if(assets.length!==1)continue;const a=assets[0];
  if(a.state!=='uploaded'||!/^sha256:[a-f0-9]{64}$/.test(a.digest||'')||!Number.isSafeInteger(a.size)||a.size<=0||a.size>(platform==='pc'?2e9:512e6)||a.browser_download_url!==`${RELEASES_URL}/download/${r.tag_name}/${name}`)continue;
  candidates.push({version:v,tag:r.tag_name,name,url:a.browser_download_url,bytes:a.size,sha256:a.digest.slice(7),notes:String(r.body||'').slice(0,12000),page:`${RELEASES_URL}/tag/${r.tag_name}`});
 }
 return candidates.sort((a,b)=>compareVersions(b.version,a.version))[0]||null;
}
function allowedUrl(address,api=false){const u=new URL(address);if(u.protocol!=='https:'||u.username||u.password||u.port)throw Error('Unexpected update download address');
 if(api?u.origin!=='https://api.github.com'||u.pathname!==`/repos/${REPOSITORY}/releases`:!(u.hostname==='github.com'&&u.pathname.startsWith(`/${REPOSITORY}/releases/download/`)||['release-assets.githubusercontent.com','objects.githubusercontent.com'].includes(u.hostname)))throw Error('Unexpected update download address');return u;}
function httpError(status){return Error(status===403||status===429?'GitHub’s update limit was reached. Try again later.':status===404?'The release is not available. You can keep using this version.':`GitHub could not deliver the update (HTTP ${status}). Try again later.`);}
async function open(address,{api=false,signal,fetchImpl=fetch}={}){
 for(let redirects=0;redirects<6;redirects++){
  allowedUrl(address,api);const response=await fetchImpl(address,{redirect:'manual',signal,headers:{'User-Agent':'Resonance-Updater','Accept':api?'application/vnd.github+json':'application/octet-stream'}});
  if([301,302,303,307,308].includes(response.status)){const location=response.headers.get('location');await response.body?.cancel();if(api||!location)throw Error('Unexpected update redirect');address=new URL(location,address).href;continue;}
  if(response.status!==200){await response.body?.cancel();throw httpError(response.status);}return response;
 }throw Error('Too many update redirects');
}
async function boundedJson(response){const chunks=[];let total=0;for await(const chunk of response.body){total+=chunk.length;if(total>4e6)throw Error('Update response is too large');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());}
async function findRelease(current,{signal,fetchImpl=fetch}={}){
 const all=[];for(let page=1;page<=10;page++){const response=await open(`${API}?per_page=100&page=${page}`,{api:true,signal,fetchImpl});const rows=await boundedJson(response);if(!Array.isArray(rows))throw Error('Unexpected release list');all.push(...rows);if(rows.length<100)return selectRelease(all,current);}
 throw Error('The release list is too large. Open GitHub Releases to update manually.');
}
async function verifyFile(file,release){let handle;try{handle=await fs.open(file,'r');if((await handle.stat()).size!==release.bytes)return false;const hash=createHash('sha256');for await(const chunk of handle.createReadStream({autoClose:false}))hash.update(chunk);return hash.digest('hex')===release.sha256;}catch{return false;}finally{await handle?.close();}}
async function downloadRelease(release,file,{signal,fetchImpl=fetch,onProgress=()=>{}}={}){
 // Metadata and path originate in the main process, never from renderer input.
 const part=file+'.part';let handle;
 try{const response=await open(release.url,{signal,fetchImpl});const length=response.headers.get('content-length');if(length&&Number(length)!==release.bytes){await response.body?.cancel();throw Error('Update size does not match its release');}
  handle=await fs.open(part,'w');const hash=createHash('sha256');let received=0,last=0;
  for await(const chunk of response.body){signal?.throwIfAborted();received+=chunk.length;if(received>release.bytes)throw Error('Update exceeds its expected size');hash.update(chunk);await handle.writeFile(chunk);if(Date.now()-last>250){last=Date.now();onProgress(received,release.bytes);}}
  if(received!==release.bytes||hash.digest('hex')!==release.sha256)throw Error('Update verification failed. The current app has been kept.');
  await handle.sync();await handle.close();handle=null;await fs.rename(part,file);onProgress(received,release.bytes);
 }catch(e){await handle?.close();await fs.unlink(part).catch(()=>{});throw e;}
}
module.exports={REPOSITORY,RELEASES_URL,compareVersions,selectRelease,allowedUrl,findRelease,downloadRelease,verifyFile};
