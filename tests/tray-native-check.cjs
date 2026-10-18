const {app,BrowserWindow,Tray,Menu}=require('electron'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=process.env.RESONANCE_TEST_APP_ROOT||path.resolve(__dirname,'..'),out=path.join(__dirname,'../test-output/release-work/tray-native');fs.mkdirSync(out,{recursive:true});app.setPath('userData',path.join(out,'profile'));
let win,controller,menu;app.whenReady().then(async()=>{
 win=new BrowserWindow({show:false,webPreferences:{offscreen:true,sandbox:true}});await win.loadURL('data:text/html,<title>Resonance tray test</title>');
 controller=require(path.join(root,'electron/tray.cjs')).installTray({app,Tray,Menu:{buildFromTemplate(rows){menu=Menu.buildFromTemplate(rows);return menu;}},win,root});
 const icon=controller.icon;assert.ok(icon&&!icon.isDestroyed());const bounds=icon.getBounds();assert.ok(bounds.width>0&&bounds.height>0,'Windows registered the icon');
 assert.deepEqual(menu.items.filter(i=>i.type!=='separator').map(i=>i.label),['Open Resonance','Hide window','Quit Resonance']);
 menu.items[0].click();assert.equal(win.isVisible(),true);win.minimize();icon.emit('click');assert.equal(win.isMinimized(),false);assert.equal(win.isVisible(),true);
 menu.items.find(i=>i.label==='Hide window').click();assert.equal(win.isVisible(),false);assert.equal(icon.isDestroyed(),false);
 // Quit must enter the same async save-before-close path while the icon remains.
 let prepared=false,closing=false;win.on('close',e=>{if(prepared)return;e.preventDefault();if(closing)return;closing=true;setTimeout(()=>{prepared=true;win.close();},50);});
 const closed=new Promise(r=>win.once('closed',r));menu.items.find(i=>i.label==='Quit Resonance').click();assert.equal(prepared,false);assert.equal(icon.isDestroyed(),false);await closed;assert.equal(prepared,true);assert.equal(icon.isDestroyed(),true);controller.dispose();
 const report={ok:true,bounds,restore:true,hide:true,saveBeforeQuit:true,iconRemoved:true};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));app.exit(0);
}).catch(e=>{console.error(e);controller?.dispose();win?.destroy();app.exit(1);});app.on('window-all-closed',()=>{});setTimeout(()=>app.exit(2),20000).unref();
