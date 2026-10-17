import { packager } from '@electron/packager';
import path from 'node:path';
import fs from 'node:fs/promises';
const root=process.cwd();
const result=await packager({dir:root,name:'Resonance',executableName:'Resonance',platform:'win32',arch:'x64',out:path.join(root,'desktop-staging'),overwrite:true,asar:false,icon:path.join(root,'public','icon.ico'),electronVersion:'44.7.0',electronZipDir:undefined,ignore:[/^\/android($|\/)/,/^\/checkpoints($|\/)/,/^\/releases($|\/)/,/^\/Resonance-.*\.(png|jpg)$/,/^\/data($|\/)/,/^\/desktop-(build|staging)($|\/)/,/^\/test-output($|\/)/,/^\/tests($|\/)/,/^\/scripts($|\/)/,/^\/\.git($|\/)/,/^\/tools\/playlist-/,/\.log$/,/\.lnk$/],prune:true,win32metadata:{CompanyName:'Personal music library',FileDescription:'Resonance',ProductName:'Resonance',InternalName:'Resonance'}});
// Windows can keep an empty app directory open in Explorer or a launcher.
// Stage the package separately, then update its contents without removing that directory.
const destination=path.join(root,'desktop-build','Resonance-win32-x64');
await fs.mkdir(destination,{recursive:true});await fs.cp(result[0],destination,{recursive:true,force:true});
console.log(destination);
