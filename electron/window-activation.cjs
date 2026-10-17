function showMainWindow(win){
 if(!win||win.isDestroyed())return;
 if(win.isMinimized())win.restore();
 win.show();win.moveTop();win.focus();
}
function showWhenReady(win,{schedule=setTimeout}={}){
 win.once('ready-to-show',()=>{
  showMainWindow(win);
  // Older updater versions launched us with STARTF_USESHOWWINDOW / SW_HIDE.
  // Windows may consume the first ShowWindow call. Reveal again only if it
  // remained hidden; do not undo the user's deliberate minimize or alt-tab.
  schedule(()=>{if(!win.isDestroyed()&&!win.isVisible()&&!win.isMinimized())showMainWindow(win);},150);
 });
}
module.exports={showMainWindow,showWhenReady};
