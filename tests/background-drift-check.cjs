const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),output=path.join(root,'test-output');
app.setPath('userData',path.join(output,'background-drift-profile'));
let server,win,finished=false;
const finish=async result=>{
 if(finished)return;finished=true;
 try{if(win){const image=await win.webContents.capturePage();fs.writeFileSync(path.join(output,'background-drift-check.png'),image.toPNG());}
 fs.writeFileSync(path.join(output,'background-drift-check.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));}
 finally{win?.destroy();server?.close();app.exit(result.ok?0:1);}
};
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  const name=pathname==='/'?'background-drift-check.html':pathname.slice(1);
  if(!/^[a-z0-9-]+\.(html|js)$/.test(name)){res.writeHead(404);res.end();return;}
  const file=path.join(root,name.startsWith('background-drift-check.')?'tests':'public',name);
  if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.html')?'text/html':'text/javascript');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 win=new BrowserWindow({show:false,width:1050,height:900,webPreferences:{offscreen:true,contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 win.webContents.on('console-message',details=>{if(details.message?.startsWith('DRIFT_CHECK:'))void finish(JSON.parse(details.message.slice(12)));});
 setTimeout(()=>void finish({ok:false,error:'GPU check timed out'}),60000).unref();
 await win.loadURL('http://127.0.0.1:'+server.address().port);
}).catch(error=>void finish({ok:false,error:error.stack}));
