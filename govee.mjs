import dgram from 'node:dgram';
import os from 'node:os';
import {realtimeMode,realtimePixels} from './public/lighting-protocol.js';
import {lightingOptions,estimatedSegments} from './public/lighting-signal.js';
export const privateIPv4=ip=>typeof ip==='string'&&/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)&&ip.split('.').every(x=>Number(x)<=255)&&(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
const validId=id=>typeof id==='string'&&/^(?:[A-F\d]{2}:){5,7}[A-F\d]{2}$/i.test(id);
const packet=(cmd,data={})=>Buffer.from(JSON.stringify({msg:{cmd,data}}));
export class GoveeLAN {
 constructor({load=()=>null,save=()=>{},socketFactory=()=>dgram.createSocket('udp4'),interfaces=()=>Object.values(os.networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal&&privateIPv4(x.address)).map(x=>x.address),now=Date.now}={}){
  const initial=load()||{};
  this.save=save;this.socketFactory=socketFactory;this.interfaces=interfaces;this.now=now;this.devices=new Map();this.enabled=false;this.error='';this.options=lightingOptions(initial);this.unmapped=new Set((Array.isArray(initial.devices)?initial.devices:[]).filter(d=>d.segments==null).map(d=>d.id));
  this.tickAt=-Infinity;this.latestAt=0;this.last=new Map();
 }
 snapshot(){return {enabled:this.enabled,error:this.error,scanning:!!this.scanning,options:this.options,devices:[...this.devices.values()].map(d=>({...d,online:this.now()-d.seen<20000,streaming:!!this.last.get(d.id)?.armed}))};}
 async open(){
  if(this.opening)return this.opening;if(this.socket)return;
  const socket=this.socketFactory();this.socket=socket;
  socket.on('message',(b,r)=>this.receive(b,r));
  this.opening=new Promise((resolve,reject)=>{
   const fail=e=>{this.error=e.code==='EADDRINUSE'?'Govee port 4002 is busy. Close another LAN lighting controller and retry.':'Govee LAN connection failed: '+(e.code||e.message);this.enabled=false;if(this.socket===socket)this.socket=null;try{socket.close();}catch{}reject(Error(this.error));};
   socket.once('error',fail);socket.bind(4002,'0.0.0.0',()=>{socket.removeListener('error',fail);socket.on('error',e=>{this.error='Govee LAN connection failed: '+(e.code||e.message);void this.stop();});socket.setMulticastTTL(1);socket.unref?.();this.error='';resolve();});
  });
  try{await this.opening;}finally{this.opening=null;}
 }
 receive(bytes,remote){
  if(bytes.length>4096||!privateIPv4(remote.address))return;
  try{const m=JSON.parse(bytes).msg,d=m?.data;
   if(m?.cmd==='scan'&&validId(d?.device)&&/^H[A-Z\d]{4}$/.test(d.sku)){
    if(!this.devices.has(d.device)&&this.devices.size>=32)return;
    const old=this.devices.get(d.device);if(old&&old.ip!==remote.address){this.release(d.device);delete old.on;}this.devices.set(d.device,{...old,id:d.device,ip:remote.address,model:d.sku,name:String(d.deviceName||old?.name||d.sku).slice(0,64),seen:this.now()});
    if(this.unmapped.delete(d.device)){const pref=this.options.devices.find(p=>p.id===d.device);if(pref){pref.segments=estimatedSegments(d.sku);this.save(this.options);}}
    this.send(remote.address,'devStatus');
   }else if(m?.cmd==='devStatus'&&d){for(const device of this.devices.values())if(device.ip===remote.address){device.seen=this.now();device.on=d.onOff===1;device.brightness=d.brightness;}}
  }catch{}
 }
 send(ip,cmd,data){if(!this.socket||!privateIPv4(ip))return;this.socket.send(packet(cmd,data),4003,ip,e=>{if(e)this.error='Govee send failed: '+(e.code||e.message);});}
 async scan(){
  if(this.scanning)return this.scanning;
  this.scanning=(async()=>{await this.open();const request=packet('scan',{account_topic:'reserve'}),socket=this.socket;
   const discover=()=>{if(this.socket!==socket)return;for(const address of this.interfaces()){try{socket.addMembership('239.255.255.250',address);}catch{}try{socket.setMulticastInterface(address);socket.send(request,4001,'239.255.255.250');}catch{}}for(const d of this.devices.values())socket.send(request,4001,d.ip);};
   discover();await new Promise(r=>setTimeout(r,1400));discover();await new Promise(r=>setTimeout(r,1800));
  })();
  try{await this.scanning;}finally{this.scanning=null;}return this.snapshot();
 }
 stream(ip,bytes){this.send(ip,'razer',{pt:Buffer.from(bytes).toString('base64')});}
 release(id){const old=this.last.get(id);if(old?.armed)this.stream(old.ip,realtimeMode(false));this.last.delete(id);return old;}
 async configure(data={}){
  if(this.stopping)await this.stopping;
  const next=lightingOptions(data.options||this.options);
  if(data.enabled===false){await this.stop();this.options=next;this.save(next);return this.snapshot();}
  if(data.enabled===true){if(!next.devices.some(d=>d.selected&&this.devices.has(d.id)))throw Error('Select at least one discovered light.');await this.open();this.error='';}
  for(const id of this.last.keys())if(!next.devices.some(d=>d.id===id&&d.selected))await this.restore([this.release(id)]);
  this.options=next;this.save(next);
  if(data.enabled===true&&!this.enabled){
   this.enabled=true;this.tickAt=-Infinity;this.latestAt=this.now();
   for(const pref of next.devices.filter(d=>d.selected)){const d=this.devices.get(pref.id);if(d){delete d.on;this.send(d.ip,'devStatus');}}
   clearInterval(this.watchdog);this.watchdog=setInterval(()=>{if(this.enabled&&this.now()-this.latestAt>2500){void this.stop();this.error='Lighting sync stopped because the app stopped sending music. Start sync to reconnect.';}},1000);this.watchdog.unref();
  }
  return this.snapshot();
 }
 frame(frames){
  if(!this.enabled||this.stopping)return {ok:true,enabled:false};
  if(!Array.isArray(frames)||frames.length>32)throw Error('Invalid lighting frame.');
  // Validate the complete request before changing any light. No partial frames.
  const selected=new Map(this.options.devices.filter(d=>d.selected).map(d=>[d.id,d]));
  const checked=frames.filter(f=>selected.has(f?.id)).map(f=>{
   if(!Number.isInteger(f.brightness)||f.brightness<1||f.brightness>100||f.pixels?.length!==selected.get(f.id).segments)throw Error('Invalid light pixels or brightness.');
   return {...f,bytes:realtimePixels(f.pixels),brightness:Math.min(f.brightness,Math.round(this.options.brightness*100))};
  });
  this.latestAt=this.now();if(this.now()-this.tickAt<12)return {ok:true,enabled:true};this.tickAt=this.now();
  for(const f of checked){
   const d=this.devices.get(f.id);let old=this.last.get(f.id);
   if(!d||d.on!==true){if(old)this.release(f.id);continue;}
   // Some firmware stops answering status in realtime mode. A stream needs a
   // fresh power-on reply to START, but lack of ACKs must not expire it mid-song.
   if(!old&&this.now()-d.seen>=20000)continue;
   if(!old){old={ip:d.ip,at:this.now(),global:f.brightness,original:d.brightness,phase:'arm',armed:false,readyAt:this.now()+100,statusAt:this.now()};this.last.set(f.id,old);this.send(d.ip,'brightness',{value:f.brightness});continue;}
   if(this.now()<old.readyAt||this.now()-old.at<15)continue;
   old.at=this.now();
   if(old.phase==='arm'){this.stream(d.ip,realtimeMode(true));old.armed=true;old.phase='pixels';old.readyAt=this.now()+100;continue;}
   // Stream pixels at 60 Hz; keep settling gaps around control commands only.
   if(f.brightness!==old.global){this.send(d.ip,'brightness',{value:f.brightness});old.global=f.brightness;old.readyAt=this.now()+100;continue;}
   if(this.now()-old.statusAt>5000){this.send(d.ip,'devStatus');old.statusAt=this.now();old.readyAt=this.now()+100;continue;}
   const key=Buffer.from(f.bytes).toString('base64');
   if(key!==old.key||this.now()-(old.paintAt||0)>1000){this.send(d.ip,'razer',{pt:key});old.key=key;old.paintAt=this.now();}
  }
  return {ok:true,enabled:true};
 }
 async restore(streams){
  const list=streams.filter(Boolean);if(!list.length)return;
  await new Promise(r=>setTimeout(r,110));
  for(const old of list){const d=[...this.devices.values()].find(d=>d.ip===old.ip);if(d?.on===true&&Number.isInteger(old.original)&&old.original>=1&&old.original<=100)this.send(old.ip,'brightness',{value:old.original});}
 }
 stop(){
  if(this.stopping)return this.stopping;
  this.enabled=false;clearInterval(this.watchdog);
  const streams=[...this.last.keys()].map(id=>this.release(id)),socket=this.socket;
  this.stopping=(async()=>{await this.restore(streams);if(this.socket===socket)this.socket=null;try{socket?.close();}catch{}})();
  return this.stopping.then(()=>this.snapshot()).finally(()=>{this.stopping=null;});
 }
 close(){return this.stop();}
}
