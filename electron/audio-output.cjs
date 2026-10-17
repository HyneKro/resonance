const {spawn}=require('node:child_process'),path=require('node:path'),{createHash}=require('node:crypto');
function installAudioOutput({ipcMain,win,url}){
 let current={id:'',label:'Detecting audio output…',transport:'unknown'},process,buffer='';
 const trusted=e=>e.sender===win.webContents&&e.senderFrame===win.webContents.mainFrame&&e.senderFrame.url.startsWith(url+'/');
 ipcMain.handle('resonance:audio-output',e=>{if(!trusted(e))throw Error('Output request rejected');return current;});
 if(global.process.platform==='win32'){
  process=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File',path.join(__dirname,'audio-output.ps1')],{windowsHide:true,stdio:['ignore','pipe','ignore']});
  process.stdout.on('data',data=>{buffer+=data.toString();let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);try{const v=JSON.parse(line);current={id:v.id?createHash('sha256').update(v.id).digest('hex').slice(0,24):'',label:String(v.label||'Audio output').slice(0,160),transport:['direct','bluetooth'].includes(v.transport)?v.transport:'unknown'};if(!win.isDestroyed())win.webContents.send('resonance:audio-output-state',current);}catch{}}if(buffer.length>10000)buffer='';});
  process.on('error',()=>{});
 }
 win.on('closed',()=>{process?.kill();ipcMain.removeHandler('resonance:audio-output');});
}
module.exports={installAudioOutput};
