import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {showMainWindow,showWhenReady} from '../electron/window-activation.cjs';
function window({hideFirst=false}={}){
 const w=new EventEmitter();Object.assign(w,{visible:false,minimized:false,destroyed:false,calls:[],isDestroyed(){return this.destroyed},isMinimized(){return this.minimized},isVisible(){return this.visible},restore(){this.calls.push('restore');this.minimized=false},show(){this.calls.push('show');if(hideFirst)hideFirst=false;else this.visible=true},moveTop(){this.calls.push('top')},focus(){this.calls.push('focus')}});return w;
}
test('older hidden update launch gets a second chance to show the window',()=>{
 const w=window({hideFirst:true});let retry;showWhenReady(w,{schedule:fn=>retry=fn});w.emit('ready-to-show');assert.equal(w.visible,false);retry();assert.equal(w.visible,true);assert.equal(w.calls.filter(x=>x==='show').length,2);
});
test('ordinary startup focuses once and the fallback respects user actions',()=>{
 for(const action of ['alt-tab','minimize','close']){const w=window();let retry;showWhenReady(w,{schedule:fn=>retry=fn});w.emit('ready-to-show');if(action==='minimize'){w.minimized=true;w.visible=false;}if(action==='close')w.destroyed=true;retry();assert.deepEqual(w.calls,['show','top','focus']);}
});
test('opening a second instance restores and focuses the existing window',()=>{const w=window();w.minimized=true;showMainWindow(w);assert.deepEqual(w.calls,['restore','show','top','focus']);w.destroyed=true;showMainWindow(w);assert.equal(w.calls.length,4);});

test('startup fallback respects a deliberate Hide window from the notification menu',()=>{const w=window();let retry;showWhenReady(w,{schedule:fn=>retry=fn});w.emit('ready-to-show');w.visible=false;w.emit('hide');retry();assert.equal(w.visible,false);assert.equal(w.calls.filter(c=>c==='show').length,1);assert.equal(w.listenerCount('hide'),0);});
