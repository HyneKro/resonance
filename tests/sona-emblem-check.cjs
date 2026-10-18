const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output');app.setPath('userData',path.join(out,'sona-emblem-profile'));
let server,win;
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{
  const name=new URL(req.url,'http://localhost').pathname.slice(1);
  if(!name){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Sona emblem check</title>');return;}
  if(!/^[a-z0-9-]+\.(js|webp)$/.test(name)){res.writeHead(404);res.end();return;}
  const file=path.join(root,'public',name);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':'image/webp');res.end(fs.readFileSync(file));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 win=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true}});
 await win.loadURL('http://127.0.0.1:'+server.address().port);
 const result=await win.webContents.executeJavaScript(`(async()=>{
  const {CompanionRenderer}=await import('/companion-renderer.js'),{SONA_BADGES}=await import('/companion-emblem.js');
  const renderer=new CompanionRenderer(document.createElement('canvas'));if(!await renderer.load())throw Error('Sprite load failed');
  const scratch=document.createElement('canvas');scratch.width=scratch.height=160;const ctx=scratch.getContext('2d',{willReadFrequently:true});
  const palettes=[[[185,142,237],[126,201,229]],[[245,164,175],[231,112,173]],[[130,211,190],[171,190,99]]],names=['Head bob','Two step','Bounce','Shoulder groove','Wave','Sway','Cheer','Twirl','Sleep','Clicked','Held','Drop','Idle'];
  const sheets=[document.createElement('canvas'),document.createElement('canvas')];sheets.forEach((c,i)=>{c.width=1280;c.height=(i?6:7)*184;const x=c.getContext('2d');x.fillStyle='#15131e';x.fillRect(0,0,c.width,c.height);});
  const detail=document.createElement('canvas');detail.width=800;detail.height=13*88;const dc=detail.getContext('2d');dc.fillStyle='#15131e';dc.fillRect(0,0,detail.width,detail.height);
  let modified=0,untouched=0;
  for(let row=0;row<13;row++)for(let frame=0;frame<8;frame++){
   ctx.clearRect(0,0,160,160);ctx.drawImage(renderer.images[0],frame*160,row*160,160,160,0,0,160,160);
   const before=ctx.getImageData(0,0,160,160).data,after=renderer.frame(row,frame).data,badge=SONA_BADGES[row][frame];let changed=0;
   for(let p=0;p<before.length;p+=4){if(before[p+3]!==after[p+3])throw Error('Silhouette changed: '+row+':'+frame);if(before.slice(p,p+3).some((v,i)=>Math.abs(v-after[p+i])>2)){changed++;const x=(p/4)%160,y=Math.floor(p/4/160);if(!badge||Math.abs(x-badge[0])>12||Math.abs(y-badge[1])>12)throw Error('Changed outside the earcup: '+row+':'+frame);}}
   if(badge){if(changed<20)throw Error('Emblem missing: '+row+':'+frame);modified++;}else{if(changed)throw Error('Hidden earcup changed');untouched++;}
   const painted=renderer.painted(row,frame,palettes[row%3]),sheet=sheets[row<7?0:1],sc=sheet.getContext('2d'),y=(row<7?row:row-7)*184;
   sc.drawImage(painted,frame*160,y+22);sc.fillStyle='#bcb7ce';sc.font='12px system-ui';sc.fillText(names[row]+' · '+(frame+1),frame*160+10,y+17);
   dc.fillStyle='#bcb7ce';dc.font='11px system-ui';dc.fillText(names[row]+' '+(frame+1),frame*100+3,row*88+12);
   if(badge){dc.imageSmoothingEnabled=false;dc.drawImage(painted,badge[0]-12,badge[1]-12,24,24,frame*100+15,row*88+15,66,66);}
  }
  return {modified,untouched,framesCached:renderer.frames.size,tintsCached:renderer.tints.size,images:[...sheets,detail].map(c=>c.toDataURL('image/png').split(',')[1])};
 })()`);
 assert.equal(result.modified,101);assert.equal(result.untouched,3);assert.ok(result.framesCached<=32&&result.tintsCached<=16);
 const names=['sona-emblem-poses-a.png','sona-emblem-poses-b.png','sona-emblem-details.png'];result.images.forEach((s,i)=>fs.writeFileSync(path.join(out,names[i]),Buffer.from(s,'base64')));delete result.images;
 fs.writeFileSync(path.join(out,'sona-emblem-check.json'),JSON.stringify({ok:true,...result},null,2));console.log(JSON.stringify({ok:true,...result}));win.destroy();server.close();app.exit(0);
}).catch(e=>{console.error(e);win?.destroy();server?.close();app.exit(1);});setTimeout(()=>app.exit(2),30000).unref();
