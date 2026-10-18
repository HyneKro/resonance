// Development-only whole-sprite registration. Character artwork is unchanged.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/mascot-registration');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'measure-profile'));
let win,server;
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;if(p==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Measuring sprites');return;}const file=path.join(root,'public',p);res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'image/webp');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true}});await win.loadURL('http://127.0.0.1:'+server.address().port);
 const measured=await win.webContents.executeJavaScript(`(async()=>{
  const {CompanionRenderer}=await import('/companion-renderer.js'),{COMPANION_APPEARANCES}=await import('/companion-appearances.js'),{COMPANION_FRAMING}=await import('/companion-framing.js');
  const renderer=new CompanionRenderer(document.createElement('canvas')),offsets={sona:COMPANION_FRAMING.sona},report=[];
  function score(reference,pixels,dx,dy){
   let sum=0,count=0;
   for(let y=32;y<96;y+=3)for(let x=40;x<120;x+=3){
    const i=(y*160+x)*4,j=((y-dy)*160+x-dx)*4,a=reference[i+3]/255,b=pixels[j+3]/255;
    if(a<.5&&b<.5)continue;
    sum+=Math.abs(a-b)*80;
    for(let c=0;c<3;c++)sum+=Math.min(80,Math.abs(reference[i+c]*a-pixels[j+c]*b))/3;
    count++;
   }
   return sum/Math.max(1,count)+Math.abs(dx)*.035+Math.abs(dy)*.025;
  }
  function match(reference,pixels){
   let best={value:Infinity,x:0,y:0};
   for(let dy=-8;dy<=8;dy+=2)for(let dx=-18;dx<=18;dx++){
    const value=score(reference,pixels,dx,dy);if(value<best.value)best={value,x:dx,y:dy};
   }
   return best;
  }
  function safeOffset(pixels,x){
   let left=160,right=0;
   for(let y=0;y<160;y++)for(let px=0;px<160;px++)if(pixels[(y*160+px)*4+3]>96){left=Math.min(left,px);right=Math.max(right,px);}
   return Math.max(3-left,Math.min(156-right,x));
  }
  for(const appearance of COMPANION_APPEARANCES.filter(a=>a.id!=='sona')){
   await renderer.setAppearance(appearance.id);
   const neutral=renderer.frame(12,0).data,rows=[];
   for(let row=0;row<13;row++){
    const reference=renderer.frame(row,0).data,origin=match(neutral,reference),values=[];
    for(let frame=0;frame<(row<8?12:8);frame++){
     const pixels=renderer.frame(row,frame).data;
     // A turn deliberately changes silhouette; do not match a side view to a front face.
     const fit=row===7?{x:0}:match(reference,pixels);
     values.push(safeOffset(pixels,row===7?0:origin.x+fit.x));
    }
    rows.push(values);
   }
   offsets[appearance.id]=rows;report.push({id:appearance.id,maximum:Math.max(...rows.flat().map(Math.abs))});
  }
  return {offsets,report};
 })()`);
 fs.writeFileSync(path.join(root,'public/companion-framing.js'),'// Whole-sprite face-template registration; Sona retains her approved offsets.\nexport const COMPANION_FRAMING='+JSON.stringify(measured.offsets)+';\n');
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(measured.report,null,2));console.log('Registered all guest poses against stable templates; Sona unchanged.');win.destroy();server.close();app.exit(0);
}).catch(e=>{console.error(e);win?.destroy();server?.close();app.exit(1);});
