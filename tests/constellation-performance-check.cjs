// Repeatable large-library rendering probe. Timings are local measurements, not
// promises about a physical Android device or every graphics driver.
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),phase=process.env.POLISH_PHASE||'current',out=path.join(root,'test-output/release-work/polish',phase);
fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'performance-profile'));
process.on('uncaughtException',error=>{fs.writeFileSync(path.join(out,'performance-error.txt'),error.stack);app.exit(1);});
for(const stream of [process.stdout,process.stderr])stream.on('error',error=>{if(error.code!=='EPIPE')app.exit(1);});
let win,service;
app.whenReady().then(async()=>{
 const {startServer}=await import(pathToFileURL(path.join(root,'server.mjs')).href);service=await startServer({port:0,dataDir:fs.mkdtempSync(path.join(out,'performance-data-')),autoScan:false});
 const original=service.server.listeners('request')[0];service.server.removeAllListeners('request');service.server.on('request',(req,res)=>{if(req.url==='/probe'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><link rel="stylesheet" href="/constellation.css"><body class="constellation" style="margin:0;background:#080b14"><canvas id="map" style="width:100vw;height:100vh"></canvas><div id="labels" class="cx-groups" style="position:absolute;inset:0;pointer-events:none"></div></body>');}else original(req,res);});
 win=new BrowserWindow({show:false,width:1440,height:960,webPreferences:{offscreen:true,sandbox:true,contextIsolation:true,backgroundThrottling:false}});await win.loadURL(service.url+'/probe');
 const results=await win.webContents.executeJavaScript(`(async()=>{
  const {ConstellationScene}=await import('/constellation-scene.js'),{describe}=await import('/constellation-model.js');
  const {paintMapMarkers}=await import('/constellation-navigation.js');
  const canvas=document.querySelector('#map'),labels=document.querySelector('#labels');
  const scene=new ConstellationScene(canvas,{onGroups:groups=>paintMapMarkers(labels,groups)});
  const genres=['Electronic','Ambient','Rock','Jazz','Pop','Classical','Folk','Hip Hop'];
  const nodes=Array.from({length:3000},(_,i)=>describe({id:'fixture'+i,title:'Music '+i,artist:'Artist '+i%180,genre:genres[i%8],duration:200}));scene.setData(nodes,{});scene.home();await scene.sky.whenReady;
  const results=[];const draw=scene.draw.bind(scene);let samples=[],frames=[];
  scene.draw=pose=>{const t=performance.now();draw(pose);samples.push(performance.now()-t);frames.push(t);};
  for(const mode of ['overview','artist','journey','listening']){
   if(mode==='artist')scene.focusGroup(scene.data.artistGroups[0].id);
   if(mode==='journey'){scene.route=nodes.filter((_,i)=>i%250===0).map(n=>n.id);scene.home();}
   if(mode==='listening'){scene.route=[];scene.playback=()=>({id:nodes[0].id,ids:[nodes[0].id,nodes[400].id,nodes[800].id,nodes[1200].id,nodes[1600].id],time:performance.now()/1000%200,duration:200});scene.followQueue();}
   await new Promise(r=>setTimeout(r,1000));samples=[];frames=[];await new Promise(r=>setTimeout(r,3000));
   const sorted=[...samples].sort((a,b)=>a-b),gaps=frames.slice(1).map((f,i)=>f-frames[i]).sort((a,b)=>a-b);
   results.push({mode,tracks:nodes.length,frames:samples.length,drawMedianMs:sorted[Math.floor(sorted.length*.5)],drawP95Ms:sorted[Math.floor(sorted.length*.95)],frameMedianMs:gaps[Math.floor(gaps.length*.5)],frameP95Ms:gaps[Math.floor(gaps.length*.95)],spriteCache:scene.sprites.size,labels:labels.children.length});
  }
  scene.dispose();return results;
 })()`);
 fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify(results,null,2));win.destroy();service.server.close();service.lib.close();app.exit(0);
}).catch(error=>{fs.writeFileSync(path.join(out,'performance-error.txt'),error.stack);win?.destroy();service?.server.close();app.exit(1);});setTimeout(()=>app.exit(2),90000).unref();
