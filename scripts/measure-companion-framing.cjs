// Development-only registration measurements. Original sprite pixels stay intact.
// Run with Electron; the output is a small table of whole-sprite X offsets.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-output/release-work/mascot-cleanup');
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'measure-profile'));
let win,server;
app.whenReady().then(async()=>{
 server=http.createServer((req,res)=>{try{const p=new URL(req.url,'http://localhost').pathname;let file=path.join(root,'public',p);if(p==='/') {res.setHeader('Content-Type','text/html');res.end('<!doctype html><body>Measuring sprites');return;}res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':'image/webp');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));win=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true}});await win.loadURL('http://127.0.0.1:'+server.address().port);
 const measured=await win.webContents.executeJavaScript(`(async()=>{
 const {CompanionRenderer}=await import('/companion-renderer.js'),{COMPANION_APPEARANCES}=await import('/companion-appearances.js');
 const renderer=new CompanionRenderer(document.createElement('canvas')),result={};
 for(const a of COMPANION_APPEARANCES){await renderer.setAppearance(a.id);const rows=[];
 for(let row=0;row<13;row++){const centers=[];
 for(let f=0;f<(a.id==='sona'||row>=8?8:12);f++){
 const pixels=renderer.frame(row,f).data;let sum=0,mass=0;
 // Upper-body centroid ignores feet/raised hands, the cause of side jumps
 // when every drawing had been centered on whichever foot was grounded.
 for(let y=20;y<88;y++)for(let x=15;x<145;x++){const alpha=pixels[(y*160+x)*4+3]/255;if(alpha>.5){sum+=x*alpha;mass+=alpha;}}
 centers.push(mass?sum/mass:80);
 }rows.push(centers);}
 result[a.id]=rows;
 }return result;})()`);
 // Use the same baseline for every routine. Corrections are capped so hair,
 // hats and genuine leans still move. No vertical re-registration: bends and
 // jumps must keep their authored height, with the grounded sole at y=143.
 const offsets={};for(const [id,rows]of Object.entries(measured)){
 const neutral=rows[12][0];offsets[id]=rows.map((row,r)=>row.map(x=>r===7?0:Math.round(Math.max(-7,Math.min(7,(neutral-x)*.65))*10)/10));
 }
 fs.writeFileSync(path.join(root,'public/companion-framing.js'),'// Measured whole-pose horizontal registration; source artwork is unchanged.\nexport const COMPANION_FRAMING='+JSON.stringify(offsets)+';\n');
 fs.writeFileSync(path.join(out,'centers.json'),JSON.stringify(measured,null,2));console.log('Measured all 30 appearances.');win.destroy();server.close();app.exit(0);
}).catch(e=>{console.error(e);app.exit(1);});
