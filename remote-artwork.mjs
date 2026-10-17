import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
const hosts=new Set(['lrclib.net','coverartarchive.org','archive.org','en.wikipedia.org','commons.wikimedia.org','upload.wikimedia.org','i.ytimg.com']);
export function allowedRemote(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(hosts.has(u.hostname)||/^[a-z0-9.-]+\.archive\.org$/.test(u.hostname))&&!u.port;}catch{return false;}}
export async function remoteBytes(url,{fetcher=fetch,max=12e6,signal}={}){
 for(let redirects=0;redirects<5;redirects++){
  if(!allowedRemote(url))throw Error('Unsupported artwork or metadata host');
  const r=await fetcher(url,{redirect:'manual',headers:{'User-Agent':'Resonance/1.2 (personal local music library)'},signal:signal?AbortSignal.any([signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)});
  if([301,302,303,307,308].includes(r.status)){const next=new URL(r.headers.get('location'),url);if(next.protocol==='http:'&&(next.hostname==='archive.org'||next.hostname.endsWith('.archive.org')))next.protocol='https:';url=next.href;await r.body?.cancel();continue;}
  if(r.status===404){await r.body?.cancel();return null;}if(!r.ok){await r.body?.cancel();throw Error(`Source returned ${r.status}`);}if(Number(r.headers.get('content-length'))>max){await r.body?.cancel();throw Error('Source too large');}
  let size=0;const chunks=[];for await(const chunk of r.body){size+=chunk.length;if(size>max)throw Error('Source too large');chunks.push(chunk);}return {data:Buffer.concat(chunks),type:r.headers.get('content-type')||'',url};
 }throw Error('Too many redirects');
}
export async function remoteJSON(url,options){const result=await remoteBytes(url,{max:2e6,...options});return result?JSON.parse(result.data.toString('utf8')):null;}
export function imageSize(b){
 if(b.length>=24&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {width:b.readUInt32BE(16),height:b.readUInt32BE(20),ext:'png'};
 if(b.length>4&&b[0]===255&&b[1]===216){let p=2;while(p+8<b.length){if(b[p++]!==255)continue;let marker=b[p++];if(marker===255){p--;continue;}if(marker===217||marker===218)break;if(marker===216||marker===1||marker>=208&&marker<=215)continue;const len=b.readUInt16BE(p);if(len<2||p+len>b.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return {width:b.readUInt16BE(p+5),height:b.readUInt16BE(p+3),ext:'jpg'};p+=len;}}
 if(b.length>=30&&b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP'){
  const type=b.toString('ascii',12,16);if(type==='VP8X')return {width:1+b.readUIntLE(24,3),height:1+b.readUIntLE(27,3),ext:'webp'};
  if(type==='VP8 ')return {width:b.readUInt16LE(26)&16383,height:b.readUInt16LE(28)&16383,ext:'webp'};
  if(type==='VP8L'){const bits=b.readUInt32LE(21);return {width:(bits&16383)+1,height:((bits>>>14)&16383)+1,ext:'webp'};}
 }return null;
}
export async function cacheWallpaper(lib,url,credit={},options={}){
 const result=await remoteBytes(url,options);if(!result)return null;const size=imageSize(result.data);
 if(!size||size.width<640||size.height<360||size.width*size.height>40e6)return null;
 const file=createHash('sha256').update(url).digest('hex').slice(0,24)+'.'+size.ext;await fs.mkdir(path.join(lib.dataDir,'wallpapers'),{recursive:true});await fs.writeFile(path.join(lib.dataDir,'wallpapers',file),result.data);
 return {file,width:size.width,height:size.height,...credit};
}
