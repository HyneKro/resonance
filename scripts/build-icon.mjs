import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {EMBLEM} from '../public/brand.js';

// The app emblem, browser icon and all seven native icon sizes share one drawing.
await fs.writeFile('public/icon.svg',`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="a" x2="1" y2="1"><stop stop-color="#e1c9ff"/><stop offset="1" stop-color="#87e4dc"/></linearGradient></defs><rect width="64" height="64" rx="17" fill="#11141b"/><g transform="translate(8 8)" fill="url(#a)">${EMBLEM}</g></svg>\n`);
execFileSync('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File','scripts/icon.ps1'],{stdio:'inherit',windowsHide:true});
