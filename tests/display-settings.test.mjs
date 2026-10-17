import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {createRequire} from 'node:module';
import {validRefreshRate,resolvedFrameRate,RefreshRateTracker} from '../public/display-settings.js';
import {DEFAULT_PREFERENCES,preferencesWithDefaults} from '../public/default-preferences.js';
import {startServer} from '../server.mjs';
const {installWindowControls}=createRequire(import.meta.url)('../electron/window-controls.cjs');

test('fresh defaults follow the screen; explicit frame caps are retained',()=>{
 assert.equal(DEFAULT_PREFERENCES.targetFPS,'auto');assert.equal(DEFAULT_PREFERENCES.hdrMode,'auto');assert.equal(preferencesWithDefaults({targetFPS:165}).targetFPS,165);
 for(const hz of [59.94,60,75,120,144,165,240,360,540]){assert.equal(resolvedFrameRate('auto',hz),hz);assert.equal(resolvedFrameRate(60,hz),60);}
 for(const bad of [undefined,0,-1,NaN,Infinity,'165'])assert.equal(validRefreshRate(bad),0);
 assert.equal(resolvedFrameRate('auto',0),60);
});

test('browser timing estimates follow a changed screen and ignore stalls',()=>{
 const tracker=new RefreshRateTracker();let time=0;
 for(const hz of [60,165,120,240]){tracker.reset();for(let i=0;i<260;i++){time+=1000/hz*(i%11===0?2:1);tracker.sample(time);}assert.equal(tracker.rate,hz);time+=2000;tracker.sample(time);assert.equal(tracker.rate,hz);}
});

test('native display rate updates when the window moves and only the trusted frame can read it',()=>{
 let handle,display={id:1,displayFrequency:165};const events=new Map(),screenEvents=new Map(),messages=[];
 const mainFrame={url:'http://127.0.0.1:7000/'};const contents={mainFrame,send:(channel,state)=>messages.push(state),on(){}};
 const win={getBounds:()=>({x:0,y:0,width:100,height:100}),isFullScreen:()=>false,isMaximized:()=>false,isDestroyed:()=>false,webContents:contents,on:(event,fn)=>events.set(event,fn)};
 const screen={getDisplayMatching:()=>display,on:(e,fn)=>screenEvents.set(e,fn),removeListener:(e)=>screenEvents.delete(e)};
 installWindowControls({win,screen,url:'http://127.0.0.1:7000',ipcMain:{handle:(_c,fn)=>handle=fn,removeHandler:()=>{handle=null;}}});
 const trusted={sender:contents,senderFrame:mainFrame};assert.equal(handle(trusted,'state').displayFrequency,165);
 display={id:2,displayFrequency:59.94};events.get('move')();assert.equal(messages.at(-1).displayFrequency,59.94);
 display.displayFrequency=120;screenEvents.get('display-metrics-changed')();assert.equal(messages.at(-1).displayFrequency,120);
 assert.throws(()=>handle({...trusted,senderFrame:{url:mainFrame.url}},'state'),/rejected/);events.get('closed')();assert.equal(screenEvents.size,0);assert.equal(handle,null);
});

test('Auto and HDR choices persist locally, invalid values cannot replace them',async()=>{
 const dir=await fs.mkdtemp(path.resolve('test-output/display-api-')),app=await startServer({port:0,dataDir:dir,autoScan:false});
 const save=async preferences=>(await (await fetch(app.url+'/api/config',{method:'POST',headers:{'Content-Type':'application/json','X-Resonance-Token':app.token},body:JSON.stringify({preferences})})).json()).preferences;
 try{
  for(const targetFPS of [60,165,240,'auto'])for(const hdrMode of ['off','on','auto']){const p=await save({targetFPS,hdrMode});assert.equal(p.targetFPS,targetFPS);assert.equal(p.hdrMode,hdrMode);}
  const p=await save({targetFPS:999,hdrMode:'broken'});assert.equal(p.targetFPS,'auto');assert.equal(p.hdrMode,'auto');assert.equal(app.lib.getSetting('config').preferences.hdrMode,'auto');
  for(const asset of ['hdr-output.js','display-settings.js','sync-review.js'])assert.equal((await fetch(app.url+'/'+asset)).status,200);
 }finally{app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.lib.close();}
});
