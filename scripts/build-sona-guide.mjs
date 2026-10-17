import fs from 'node:fs/promises';
import path from 'node:path';
const target=process.argv[2]||'test-output/sona-headset-cheer.html';
const [template,atlas,motion,atlasModule]=await Promise.all([
 fs.readFile('test-output/sona-animation-guide.template.html','utf8'),fs.readFile('test-output/sona-guide-atlas.txt','utf8'),
 fs.readFile('public/companion-motion.js','utf8'),fs.readFile('public/companion-atlas.js','utf8')
]);
const clipSource=atlasModule.match(/export const SONA_CLIPS=Object.freeze\([\s\S]*?\n\}\);/)[0].replace('export ','');
const motionSource=motion.replace(/^import .*;\r?\n/gm,'').replace(/\bexport /g,'');
const html=template.replace('/*__MOTION_MODULE__*/',clipSource+'\n'+motionSource).replace('__SONA_ATLAS_DATA__',atlas);
if(Buffer.byteLength(html)>1_000_000)throw Error('Guide exceeds inline size limit');
if(/__SONA_|__MOTION_|<!doctype|<html|<head|<body/i.test(html))throw Error('Invalid inline guide');
await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,html);
await fs.writeFile('test-output/sona-guide-manifest.json',JSON.stringify({created:'2026-10-15',source:'Current Sona sprites and companion-motion.js',path:target,ids:{D1:'two-step',D2:'side-sway',D3:'head-bob / listening',D4:'hand-wave',D5:'shoulder-groove',D6:'cheer',D7:'soft-bounce',D8:'twirl',I1:'idle',I2:'sleep',I3:'pressed',I4:'clicked',I5:'pickup',I6:'held',I7:'drop'}},null,2));
console.log(target+' · '+Buffer.byteLength(html)+' bytes');
