import {deezerPlaylistId} from './deezer.mjs';
import {spotifyPlaylistId} from './spotify.mjs';
import fs from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

export const AUDIO_EXTENSIONS=new Set(['.flac','.mp3','.m4a','.aac','.ogg','.opus','.wav','.webm','.aiff']);
export const sourceType=s=>s.type||(s.playlist?'youtube':'folder');
const canonical=p=>process.platform==='win32'?p.toLowerCase():p;
export function playlistId(value){
  const text=String(value||'').trim();
  if(/^[\w-]{10,150}$/.test(text))return text;
  let url;try{url=new URL(text);}catch{throw Error('Paste a YouTube or YouTube Music playlist link.');}
  if(url.protocol!=='https:'||!['youtube.com','www.youtube.com','music.youtube.com','m.youtube.com'].includes(url.hostname)||url.username||url.password||url.port)throw Error('Use a playlist link from youtube.com or music.youtube.com.');
  const id=url.searchParams.get('list');if(!id||!/^[-\w]{2,150}$/.test(id))throw Error('This link needs a playlist. Open the playlist and copy its link.');return id;
}
export async function validateSource(input,existing){
  const type=input.type;if(!['youtube','spotify','deezer','folder','m3u'].includes(type))throw Error('Choose YouTube, Spotify, Deezer, a music folder, or a playlist file.');
  const name=String(input.name||'').trim();if(!name||name.length>100)throw Error('Give this source a name (up to 100 characters).');
  let location=String(input.path||'').trim().replace(/^"(.*)"$/,'$1');
  if(!path.isAbsolute(location)||location.includes('\0')||/^\\\\\.\\/.test(location))throw Error('Choose a folder or paste its full path.');
  try{location=await fs.realpath(location);}catch{throw Error('That location is unavailable. Check the path and reconnect the drive.');}
  const stat=await fs.stat(location);
  if(type==='m3u'){if(!stat.isFile()||!['.m3u','.m3u8'].includes(path.extname(location).toLowerCase()))throw Error('Choose an .m3u or .m3u8 playlist file.');}
  else if(!stat.isDirectory())throw Error('Choose a folder for your music.');
  try{await fs.access(location,['youtube','spotify','deezer'].includes(type)?constants.R_OK|constants.W_OK:constants.R_OK);}catch{throw Error(['youtube','spotify','deezer'].includes(type)?'This download folder must be readable and writable.':'This location is not readable.');}
  const playlist=type==='youtube'?playlistId(input.url||input.playlist):type==='spotify'?spotifyPlaylistId(input.url||('https://open.spotify.com/playlist/'+input.playlist)):type==='deezer'?deezerPlaylistId(input.url||('https://www.deezer.com/playlist/'+input.playlist)):'';
  for(const source of existing){
    if(source.id===input.id)continue;
    const other=canonical(path.resolve(source.path)),candidate=canonical(location);
    if(playlist&&sourceType(source)===type&&source.playlist===playlist)throw Error('This playlist is already connected.');
    if(other===candidate)throw Error('This location is already connected.');
    if(type!=='m3u'&&sourceType(source)!=='m3u'&&(candidate.startsWith(other+path.sep)||other.startsWith(candidate+path.sep)))throw Error('This folder overlaps another source. Choose a separate folder to keep your collections distinct.');
  }
  return {id:input.id||randomUUID(),name,path:location,type,kind:input.kind==='mix'?'mix':'track',playlist};
}

export async function sourceFiles(source){
  const files=[],errors=[];let complete=true;
  if(sourceType(source)==='m3u'){
    const stat=await fs.stat(source.path);if(stat.size>2e6)throw Error('Playlist files must be smaller than 2 MB.');
    const bytes=await fs.readFile(source.path);let text;
    try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{text=new TextDecoder('windows-1252').decode(bytes);}
    let skipped=0;
    for(const line of text.replace(/^\uFEFF/,'').split(/\r?\n/)){
      const entry=line.trim();if(!entry||entry.startsWith('#'))continue;
      let file=entry.replace(/^"(.*)"$/,'$1');
      if(/^file:/i.test(file)){try{file=fileURLToPath(file);}catch{skipped++;continue;}}
      else if(/^[a-z][a-z0-9+.-]*:\/\//i.test(file)){skipped++;continue;}
      file=path.resolve(path.dirname(source.path),file);
      if(!AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())){skipped++;continue;}
      files.push(file);if(files.length>10000)throw Error('This playlist has more than 10,000 entries. Split it into smaller playlists.');
    }
    if(skipped)errors.push(`${source.name}: skipped ${skipped} streams or unsupported entries; only local audio is imported.`);
  }else{
    const walk=async dir=>{let entries;try{entries=await fs.readdir(dir,{withFileTypes:true});}catch(e){complete=false;errors.push(`${source.name}: ${e.message}`);return;}
      entries.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
      for(const ent of entries){if(ent.isSymbolicLink())continue;const file=path.join(dir,ent.name);if(ent.isDirectory())await walk(file);else if(AUDIO_EXTENSIONS.has(path.extname(file).toLowerCase())&&!(source.playlist&&/\[[\w-]{11}\]\.(?:temp|f\d+)\.[^.]+$/i.test(file)))files.push(file);}
    };await walk(source.path);
  }
  const unique=new Map(files.map(file=>[canonical(path.resolve(file)),file]));return {files:[...unique.values()],errors,complete};
}
