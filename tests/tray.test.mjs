import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {installTray} from '../electron/tray.cjs';

function fixture(platform='win32'){
 const app=new EventEmitter();app.quit=()=>app.quits=(app.quits||0)+1;
 const win=new EventEmitter();Object.assign(win,{visible:true,minimized:false,destroyed:false,closes:0,focuses:0,
  isDestroyed(){return this.destroyed},isVisible(){return this.visible},isMinimized(){return this.minimized},
  restore(){this.minimized=false;this.emit('restore')},show(){this.visible=true;this.emit('show')},hide(){this.visible=false;this.emit('hide')},moveTop(){},focus(){this.focuses++},close(){this.closes++},
 });
 class Tray extends EventEmitter{constructor(file,guid){super();this.file=file;this.guid=guid;this.destroyed=0;}setToolTip(text){this.tooltip=text}setContextMenu(menu){this.menu=menu}destroy(){this.destroyed++}}
 const controller=installTray({app,Tray,Menu:{buildFromTemplate:rows=>rows},win,root:process.cwd(),platform});
 return {app,win,controller,tray:controller.icon};
}
test('notification icon is available while visible, minimized and hidden, using the app icon',()=>{
 const {win,tray}=fixture();assert.match(tray.file,/[\\/]public[\\/]icon\.ico$/);assert.equal(tray.guid,undefined);
 assert.match(tray.tooltip,/Running$/);win.minimized=true;win.emit('minimize');assert.match(tray.tooltip,/background/);
 win.restore();assert.match(tray.tooltip,/Running$/);tray.menu.find(i=>i.label==='Hide window').click();assert.equal(win.visible,false);assert.match(tray.tooltip,/background/);assert.equal(tray.destroyed,0);
 assert.equal(tray.menu.find(i=>i.label==='Hide window').enabled,false);
});
test('tray clicks and Open restore and focus without toggling the window closed',()=>{
 const {win,tray}=fixture();win.minimized=true;win.hide();tray.emit('click');assert.equal(win.visible,true);assert.equal(win.minimized,false);
 tray.emit('double-click');assert.equal(win.visible,true);assert.equal(win.focuses,2);
 win.hide();tray.menu.find(i=>i.label==='Open Resonance').click();assert.equal(win.visible,true);assert.equal(win.focuses,3);assert.equal(win.closes,0);
});
test('Quit follows the existing save-before-close path; hiding never exits',()=>{
 const {app,win,tray}=fixture();tray.menu.find(i=>i.label==='Hide window').click();assert.equal(win.closes,0);
 tray.menu.find(i=>i.label==='Quit Resonance').click();assert.equal(win.closes,1);assert.equal(app.quits,undefined);assert.equal(tray.destroyed,0);
 win.destroyed=true;win.emit('closed');assert.equal(tray.destroyed,1);
});
test('close, quit and update disposal remove the icon and all event handlers exactly once',()=>{
 for(const event of ['closed','will-quit','update']){
  const {app,win,tray,controller}=fixture();if(event==='closed')win.emit(event);else if(event==='will-quit')app.emit(event);else controller.dispose();
  controller.dispose();assert.equal(tray.destroyed,1);assert.equal(tray.listenerCount('click'),0);assert.equal(app.listenerCount('will-quit'),0);
  for(const e of ['show','hide','minimize','restore','closed'])assert.equal(win.listenerCount(e),0);
 }
});
test('Windows notification integration leaves other platforms alone',()=>{const {tray,controller}=fixture('linux');assert.equal(tray,undefined);controller.dispose();});
