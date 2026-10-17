import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resedit} from '../node_modules/@electron/packager/dist/resedit.js';
const root=process.cwd(),runtime=path.join(root,'desktop-build','Resonance-win32-x64');
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const destination=path.join(root,'releases','Resonance-Portable-'+stamp),appDir=path.join(destination,'resources','app');
await fs.mkdir(appDir,{recursive:true});
// Build from explicit runtime and application allowlists. Never copy a user's database,
// music, cookies, thumbnail cache, download archive, debug log, or source configuration.
for(const name of ['locales','chrome_100_percent.pak','chrome_200_percent.pak','d3dcompiler_47.dll','dxcompiler.dll','dxil.dll','ffmpeg.dll','icudtl.dat','LICENSE','LICENSES.chromium.html','Resonance.exe','resources.pak','snapshot_blob.bin','v8_context_snapshot.bin','version','vk_swiftshader_icd.json','vk_swiftshader.dll','vulkan-1.dll'])await fs.cp(path.join(runtime,name),path.join(destination,name),{recursive:true});
await resedit(path.join(destination,'Resonance.exe'),{iconPath:path.join(root,'public','icon.ico')});
for(const name of ['storage.mjs','genre-research.mjs','spotify.mjs','metadata.mjs','genres.mjs','track-search.mjs','server.mjs','track-lyrics.mjs','track-research.mjs','remote-artwork.mjs','visual-identity.mjs','library.mjs','metadata.mjs','genres.mjs','sync.mjs','sources.mjs','public','electron'])await fs.cp(path.join(root,name),path.join(appDir,name),{recursive:true});
await fs.cp(path.join(runtime,'resources','app','node_modules'),path.join(appDir,'node_modules'),{recursive:true});
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));delete pkg.devDependencies;delete pkg.scripts;
await fs.writeFile(path.join(appDir,'package.json'),JSON.stringify(pkg,null,2));
await fs.writeFile(path.join(appDir,'config.json'),JSON.stringify({sources:[],downloadFormat:'best',autoEnrich:false,autoGenres:false},null,2));
await fs.mkdir(path.join(appDir,'tools'));
for(const name of ['yt-dlp.exe','ffmpeg.exe','ffprobe.exe','node.exe','yt-dlp-sha256.txt'])await fs.copyFile(path.join(root,'tools',name),path.join(appDir,'tools',name));
await fs.writeFile(path.join(destination,'portable.flag'),'Resonance portable library\n');
await fs.writeFile(path.join(destination,'START HERE.txt'),`RESONANCE

Extract the whole folder to a writable location on your Windows computer.
Open Resonance.exe. For future releases, go to Settings & library → App updates, choose the new portable ZIP, and restart when prompted. Your data folder stays intact. Keep it when updating; do not send your used data folder to anyone.

Choose Add music source to connect:
  • a local music folder (including subfolders),
  • a local M3U / M3U8 playlist,
  • a YouTube playlist and its download folder,
  • a public Spotify playlist (YouTube recording matches for review; up to 100 exposed tracks).

Update playlists checks connected online playlists. Spotify imports metadata, never protected audio. Review opens a recording comparison, with duration, artist and listening links. Select the versions you want, then Download selected.
Music files play from their original locations. Artwork, metadata, listening history and
settings are saved locally in the data folder next to Resonance.exe.

Desktop audio listens live to sound from other Windows apps. Stop listening returns to your paused local queue; Resume music continues it.
No audio is recorded or uploaded. Control desktop playback and volume in its source app or Windows.

Sound settings → Bluetooth & visual sync detects the current Windows output. Bluetooth uses the reported estimate; wired/USB outputs use zero automatic delay. Fine offsets and connection overrides are saved separately for each output.
Adjust Visual offset in 1 ms steps if your headphones still feel out of sync: positive values delay the visuals; negative values reduce the estimate. Turn Use device estimate off to set the whole delay manually. Desktop audio has its own saved manual offset. Only the visuals and Sona are delayed; playback quality stays unchanged.

Music only stops the visualizer and audio analysis, leaving covers, playback and queue.
Show visualizer brings the live scene back. Visual settings: Track character,
Musical flashes, Contrast, Movement, Beat motion, Response, Detail, Frame rate and HDR.
Bonus effects has twelve Kaleidoscope patterns and Sona, an optional dance companion, both off by default. Kaleidoscope patterns and its toggle dissolve smoothly, including when you change your mind during a transition.
Sona keeps her illustrated style with 104 poses: eight dance routines, head-bobbing, a dedicated idle blink, sleep, greetings and pickup/landing sequences. Deliberate frame timing keeps blinks brief and gestures readable. Fixed foot anchors keep her grounded; carrying swings gently from her headphone band. Fixed-speed loops run at up to 12 sprite FPS, with at least three complete loops before routine changes and a 24 FPS redraw limit. Sona does not accelerate, stretch or squash with the music.
Sona’s hair follows the richer live background colors while her outfit keeps softer theme accents. Click to say hello, hold or drag to pick her up, move, and drop; placement is remembered.
Her far headphone cup stays visible in front-facing poses. D6 is now a gentle alternating cheer bounce.
Focus her and use Space / Enter to pick up, arrows to move, Shift for fine placement, Escape to cancel.
Visual settings includes Reset Sona’s position.
Each visual or sound setting has a reset arrow for its individual default.
High detail, Auto frame rate and 2.55x Response are the default preset.
Auto follows the screen refresh rate, including when moving between monitors. Manual caps are available.
HDR offers Auto, On and Off with live output status. HDR must also be enabled in Windows on a compatible screen.
Actual FPS and HDR availability depend on the display and graphics card.

Click the dock cover for song details, saved lyrics and suggestions from your library.
Find missing details runs a fresh search; choose recording details or preview and save lyrics.
Genre discovery shows progress and results in the panel; Retry missing genres bypasses the lookup cache.
Track character is researched automatically and cached locally. Metadata searches send
title, artist, album and duration to MusicBrainz / LRCLIB, with Apple catalogue and linked Wikidata genre fallbacks; audio is never uploaded.
Cover and verified artist images are cached for a static record-sleeve collage.
Settings & library includes a refreshable storage estimate for music, artwork, library data, browser cache and the app.

Visual delay adjusts without emptying the buffered signal. Sona preserves her pose sequence through rendering stalls.

Beat motion uses the live rhythm estimate. No background BPM research or file decoding runs.
When returning from Music only, the static artwork stays visible until the full scene is ready, then fades away.
Genre and character research is gradual; all results stay local.
Click the volume percentage for precise adjustment, down to 0.1%.
Hold the left button on the scene and drag to orbit freely in either direction, including complete vertical turns while Rollercoaster is active. Visual settings offers a musical Rollercoaster rail, speed and Reset view. Rail speed reaches 20x; the new/reset default is 2.22x. Existing custom speeds are preserved; the previous 6.67x default migrates once.
Camera zoom is optional and off by default. Turn it on in Visual settings to travel into the particle field, with bass and loudness changing your depth. Zoom is fully audio reactive, with strength capped at 3. The view widens as you move closer; silence returns to the wide view. It combines with orbit and Rollercoaster; Reset view switches both effects off and smoothly returns to the wide view. Reduced motion keeps zoom static.
Enable Sona, then Keep Sona above other windows for compact translucent floating controls while using other apps. Resonance must stay open. Her headset carries Resonance’s clef in your music’s colors.
Scroll the background or Sona: volume. Shift: fine adjustment.
Right-drag right/left: next/previous. Right-drag up/down: seek; Shift: fine seeking. Left-click while right-dragging, or press Escape, to cancel.
Click outside Library or visual settings to close them.

Space: play/pause. L: library. Q: queue. H: immerse. Ctrl K: search.
F11: fullscreen. Escape: exit fullscreen or close an overlay.
Drag the translucent title bar to move the window; double-click to maximize/restore.

This clean copy contains no music, personal sources, listening history or accounts.
Once you use it, its data folder is personal: do not redistribute that used folder.
`);
// Every distributable carries an integrity manifest for in-place portable updates.
const updateFiles=[];
async function inventory(dir,relative=''){for(const entry of await fs.readdir(dir,{withFileTypes:true})){const name=relative+entry.name,file=path.join(dir,entry.name);if(entry.isDirectory())await inventory(file,name+'/');else{const bytes=await fs.readFile(file);updateFiles.push({path:name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await inventory(destination);await fs.writeFile(path.join(destination,'resonance-update.json'),JSON.stringify({product:'resonance-portable',schema:1,version:pkg.version,createdAt:new Date().toISOString(),files:updateFiles},null,2));
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const zip=destination+'.zip';
console.log('Prepared clean portable folder:',destination);
await promisify(execFile)('powershell.exe',['-NoProfile','-Command',`Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(destination)},${quote(zip)},[System.IO.Compression.CompressionLevel]::Optimal,$true)`],{windowsHide:true,maxBuffer:1e6});
console.log('Portable archive:',zip);
await fs.writeFile(path.join(root,'releases','latest.json'),JSON.stringify({folder:destination,zip},null,2));
