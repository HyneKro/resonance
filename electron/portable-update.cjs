const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto'),{execFile}=require('node:child_process'),{promisify}=require('node:util');
const {OnlineUpdate,RELEASES_URL}=require('./online-update.cjs');
function installPortableUpdate({app,ipcMain,dialog,win,root,url,exitForUpdate=()=>app.quit()}){
 let busy=false;
 const portableRoot=path.dirname(process.execPath);
 const canInstall=app.isPackaged&&require('node:fs').existsSync(path.join(portableRoot,'portable.flag'));
 const updater=new OnlineUpdate({directory:path.join(app.getPath('userData'),'app-updates'),current:app.getVersion(),canInstall,emit:state=>{if(!win.isDestroyed())win.webContents.send('resonance:update-state',state);}});
 const trusted=event=>{if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!event.senderFrame.url.startsWith(url+'/'))throw Error('Update request rejected');};
 let checkTimer,periodic;
 win.webContents.once('did-finish-load',()=>{checkTimer=setTimeout(()=>void updater.check(true),30000);periodic=setInterval(()=>void updater.check(true),6*3600000);});
 ipcMain.handle('resonance:online-update',async(event,action,data={})=>{
  trusted(event);await updater.ready;
  switch(action){
   case 'status':return updater.snapshot();
   case 'preferences':return updater.preferences(data);
   case 'check':if(!busy)void updater.check();return updater.snapshot();
   case 'download':if(!busy)void updater.startDownload();return updater.snapshot();
   case 'cancel':return updater.cancel();
   case 'releases':await require('electron').shell.openExternal(RELEASES_URL);return updater.snapshot();
   case 'install':{if(busy)return updater.snapshot();const r=await updater.archive();updater.set({phase:'preparing',message:'Checking and preparing the update…'});const result=await installArchive(r.file,r.version);updater.set({phase:result.restarting?'restarting':'ready',message:result.error||result.message||(result.restarting?'Restarting to install…':'Ready whenever you are.')});return updater.snapshot();}
   default:throw Error('Unknown update action');
  }
 });
 // Report an interrupted/failed replacement on the next launch, after the
 // helper has restored the previous files and restarted the player.
 win.webContents.once('did-finish-load',async()=>{
  if(!app.isPackaged)return;
  try{const runs=await fs.readdir(path.join(portableRoot,'.updates'));const reports=[];
   for(const name of runs){if(!/^[a-f0-9-]{36}$/.test(name))continue;const file=path.join(portableRoot,'.updates',name,'result.json');try{const stat=await fs.stat(file);reports.push({file,time:stat.mtimeMs});}catch{}}
   const latest=reports.sort((a,b)=>b.time-a.time)[0];if(!latest)return;
   const report=JSON.parse((await fs.readFile(latest.file,'utf8')).replace(/^\uFEFF/,''));if(report.ok||report.notified)return;
   await dialog.showMessageBox(win,{type:'warning',title:'Update was not completed',message:report.rollbackErrors?.length?'The update needs attention.':'Your previous version has been restored.',detail:String(report.error||'A file could not be replaced.')+'\nClose any other copies of Resonance and try installing the ZIP again.',buttons:['OK']});report.notified=true;await fs.writeFile(latest.file,JSON.stringify(report));
  }catch{}
 });
 ipcMain.handle('resonance:update',async(event)=>{
  trusted(event);return installArchive();
 });
 async function installArchive(archive,expectedVersion){
  if(busy)return {message:'An update is already being prepared.'};
  if(!canInstall)return {message:'This workspace installation is updated in place. The update installer is available in the portable release for friends.'};
  busy=true;
  try{
   if(!archive){const picked=await dialog.showOpenDialog(win,{title:'Choose a newer Resonance portable ZIP',properties:['openFile'],filters:[{name:'Resonance portable update',extensions:['zip']}]});if(picked.canceled)return {cancelled:true};archive=picked.filePaths[0];}
   const run=path.join(portableRoot,'.updates',randomUUID()),stage=path.join(run,'payload');await fs.mkdir(run,{recursive:true});
   const result=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron','prepare-update.ps1'),'-Archive',archive,'-Stage',stage],{windowsHide:true,timeout:300000,maxBuffer:1000000});
   const info=JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim());
   if(expectedVersion&&info.version!==expectedVersion)throw Error('The archive version does not match the GitHub release.');
   const choice=await dialog.showMessageBox(win,{type:'info',title:'Resonance update is ready',message:'Install Resonance '+info.version+'?',detail:'Your music, playlists and settings stay in this folder. Resonance will restart. A backup of replaced app files will be kept in .updates.',buttons:['Restart & update','Cancel'],defaultId:0,cancelId:1});if(choice.response!==0)return {cancelled:true};
   await Promise.race([win.webContents.executeJavaScript('window.resonancePrepareClose?.()'),new Promise(resolve=>setTimeout(resolve,2500))]);
   const helper=path.join(run,'apply-update.ps1');await fs.copyFile(path.join(root,'electron','apply-update.ps1'),helper);
   await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron','launch-update.ps1'),'-Helper',helper,'-Destination',portableRoot,'-Stage',stage,'-WaitFor',String(process.pid)],{windowsHide:true,timeout:25000,maxBuffer:100000});
   // The independent helper has acknowledged startup and is waiting for this PID.
   // The playback checkpoint above is complete, so do not re-enter window close hooks.
   setTimeout(exitForUpdate,150);return {restarting:true};
  }catch(error){return {error:'The update could not be installed. Your current app is still available. '+String(error.stderr||error.message).slice(0,700)};}finally{busy=false;}
 }
 win.on('closed',()=>{clearTimeout(checkTimer);clearInterval(periodic);updater.close();ipcMain.removeHandler('resonance:update');ipcMain.removeHandler('resonance:online-update');});
}
module.exports={installPortableUpdate};
