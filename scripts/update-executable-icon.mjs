import fs from 'node:fs/promises';import path from 'node:path';
import {resedit} from '../node_modules/@electron/packager/dist/resedit.js';
const executable=path.resolve(process.argv[2]||'desktop-build/Resonance-win32-x64/Resonance.exe'),staged=executable+'.icon-update';
await fs.copyFile(executable,staged);await resedit(staged,{iconPath:path.resolve('public/icon.ico')});
await fs.copyFile(staged,executable);await fs.unlink(staged);console.log('Windows application icon updated.');
