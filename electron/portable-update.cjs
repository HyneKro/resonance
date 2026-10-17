const fs=require('node:fs/promises'),path=require('node:path'),{randomUUID}=require('node:crypto'),{execFile,spawn}=require('node:child_process'),{promisify}=require('node:util');
function installPortableUpdate({app,ipcMain,dialog,win,root,url}){
 let busy=false;
 const portableRoot=path.dirname(process.execPath);
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
  if(event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame||!event.senderFrame.url.startsWith(url+'/'))throw Error('Update request rejected');
  if(busy)return {message:'An update is already being prepared.'};
  if(!app.isPackaged||!await fs.stat(path.join(portableRoot,'portable.flag')).then(()=>true).catch(()=>false))return {message:'This workspace installation is updated in place. The update installer is available in the portable release for friends.'};
  busy=true;
  try{
   const picked=await dialog.showOpenDialog(win,{title:'Choose a newer Resonance portable ZIP',properties:['openFile'],filters:[{name:'Resonance portable update',extensions:['zip']}]});if(picked.canceled)return {cancelled:true};
   const run=path.join(portableRoot,'.updates',randomUUID()),stage=path.join(run,'payload');await fs.mkdir(run,{recursive:true});
   const result=await promisify(execFile)('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(root,'electron','prepare-update.ps1'),'-Archive',picked.filePaths[0],'-Stage',stage],{windowsHide:true,timeout:300000,maxBuffer:1000000});
   const info=JSON.parse(result.stdout.replace(/^\uFEFF/,'').trim());
   const choice=await dialog.showMessageBox(win,{type:'info',title:'Resonance update is ready',message:'Install Resonance '+info.version+'?',detail:'Your music, playlists and settings stay in this folder. Resonance will restart. A backup of replaced app files will be kept in .updates.',buttons:['Restart & update','Cancel'],defaultId:0,cancelId:1});if(choice.response!==0)return {cancelled:true};
   await Promise.race([win.webContents.executeJavaScript('window.resonancePrepareClose?.()'),new Promise(resolve=>setTimeout(resolve,2500))]);
   const helper=path.join(run,'apply-update.ps1');await fs.copyFile(path.join(root,'electron','apply-update.ps1'),helper);
   const child=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',helper,'-Destination',portableRoot,'-Stage',stage,'-WaitFor',String(process.pid)],{windowsHide:true,detached:true,stdio:'ignore'});
   await new Promise((resolve,reject)=>{child.once('spawn',resolve);child.once('error',reject);});child.unref();setTimeout(()=>app.quit(),150);return {restarting:true};
  }catch(error){return {error:'The update could not be installed. Your current app is still available. '+String(error.stderr||error.message).slice(0,700)};}finally{busy=false;}
 });
 win.on('closed',()=>ipcMain.removeHandler('resonance:update'));
}
module.exports={installPortableUpdate};
