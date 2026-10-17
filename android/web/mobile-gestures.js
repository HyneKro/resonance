export function installSceneGestures({room,reactor,onTransport}){
 let gesture=null;
 const allowed=target=>!room.hidden&&!document.querySelector('dialog[open]')&&!target.closest('button,input,select,textarea,a,summary,.room-dock,.room-top,.dance-companion,#welcome');
 room.addEventListener('touchstart',e=>{
  if(!Array.from(e.touches).every(t=>allowed(t.target))){gesture=null;return;}
  if(e.touches.length===2){
   gesture={mode:'transport',x:(e.touches[0].clientX+e.touches[1].clientX)/2,y:(e.touches[0].clientY+e.touches[1].clientY)/2,dx:0,dy:0};
  }else if(e.touches.length===1&&!reactor.musicOnly){
   const touch=e.touches[0],box=room.getBoundingClientRect();
   gesture={mode:'orbit',id:touch.identifier,x:touch.clientX,y:touch.clientY,moved:false,portrait:reactor.portraitScene&&box.height>box.width};
  }else gesture=null;
 },{passive:true});
 room.addEventListener('touchmove',e=>{
  if(!gesture)return;
  if(!allowed(e.target)){gesture=null;return;}
  if(gesture.mode==='transport'){
   if(e.touches.length!==2){gesture=null;return;}
   if(e.cancelable)e.preventDefault();
   gesture.dx=(e.touches[0].clientX+e.touches[1].clientX)/2-gesture.x;gesture.dy=(e.touches[0].clientY+e.touches[1].clientY)/2-gesture.y;return;
  }
  if(reactor.musicOnly||e.touches.length!==1||e.touches[0].identifier!==gesture.id){gesture=null;return;}
  const touch=e.touches[0],dx=touch.clientX-gesture.x,dy=touch.clientY-gesture.y;
  if(!gesture.moved&&Math.hypot(dx,dy)<6)return;
  if(e.cancelable)e.preventDefault();gesture.moved=true;
  // The entire landscape scene is turned clockwise on portrait phones.
  // Convert screen-space swipes back to its camera axes before applying inertia.
  reactor.camera.drag(gesture.portrait?dy:dx,gesture.portrait?-dx:dy);reactor.needsFrame=true;
  gesture.x=touch.clientX;gesture.y=touch.clientY;
 },{passive:false});
 room.addEventListener('touchend',()=>{
  const ended=gesture;gesture=null;
  if(ended?.mode==='transport'&&Math.max(Math.abs(ended.dx),Math.abs(ended.dy))>=48)onTransport(ended);
 });
 const cancel=()=>gesture=null;
 room.addEventListener('touchcancel',cancel);window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);
 document.addEventListener('visibilitychange',cancel);
}
