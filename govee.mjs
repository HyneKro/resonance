import dgram from 'node:dgram';
import os from 'node:os';
import {lightingOptions} from './public/lighting-signal.js';
export const privateIPv4=ip=>typeof ip==='string'&&/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)&&ip.split('.').every(x=>Number(x)<=255)&&(/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip));
const validId=id=>typeof id==='string'&&/^(?:[A-F\d]{2}:){5,7}[A-F\d]{2}$/i.test(id);
const packet=(cmd,data={})=>Buffer.from(JSON.stringify({msg:{cmd,data}}));
export class GoveeLAN {
 constructor({load=()=>null,save=()=>{},socketFactory=()=>dgram.createSocket('udp4'),interfaces=()=>Object.values(os.networkInterfaces()).flat().filter(x=>x.family==='IPv4'&&!x.internal&&privateIPv4(x.address)).map(x=>x.address),now=Date.now}={}){
  this.save=save;this.socketFactory=socketFactory;this.interfaces=interfaces;this.now=now;this.devices=new Map();this.enabled=false;this.error='';this.options=lightingOptions(load()||{});
  this.tickAt=-Infinity;this.statusAt=0;this.latestAt=0;this.last=new Map();
 }
 snapshot(){return {enabled:this.enabled,error:this.error,scanning:!!this.scanning,options:this.options,devices:[...this.devices.values()].map(d=>({...d,online:this.now()-d.seen<20000}))};}
 async open(){
  if(this.opening)return this.opening;if(this.socket)return;
  const socket=this.socketFactory();this.socket=socket;
  socket.on('message',(b,r)=>this.receive(b,r));
  this.opening=new Promise((resolve,reject)=>{
   const fail=e=>{this.error=e.code==='EADDRINUSE'?'Govee port 4002 is busy. Close another LAN lighting controller and retry.':'Govee LAN connection failed: '+(e.code||e.message);this.enabled=false;if(this.socket===socket)this.socket=null;try{socket.close();}catch{}reject(Error(this.error));};
   socket.once('error',fail);socket.bind(4002,'0.0.0.0',()=>{socket.removeListener('error',fail);socket.on('error',e=>{this.error='Govee LAN connection failed: '+(e.code||e.message);this.enabled=false;});socket.setMulticastTTL(1);socket.unref?.();this.error='';resolve();});
  });
  try{await this.opening;}finally{this.opening=null;}
 }
 receive(bytes,remote){
  if(bytes.length>4096||!privateIPv4(remote.address))return;
  try{const m=JSON.parse(bytes).msg,d=m?.data;
   if(m?.cmd==='scan'&&validId(d?.device)&&/^H[A-Z\d]{4}$/.test(d.sku)){
    if(!this.devices.has(d.device)&&this.devices.size>=32)return;
    const old=this.devices.get(d.device);this.devices.set(d.device,{...old,id:d.device,ip:remote.address,model:d.sku,name:String(d.deviceName||old?.name||d.sku).slice(0,64),seen:this.now()});
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
 async configure(data={}){
  const next=lightingOptions(data.options||this.options);
  if(data.enabled===true){if(!next.devices.some(d=>d.selected&&this.devices.has(d.id)))throw Error('Select at least one discovered light.');await this.open();this.error='';}
  this.options=next;this.save(next);
  if(typeof data.enabled==='boolean'){this.enabled=data.enabled;this.last.clear();this.tickAt=-Infinity;this.latestAt=this.now();if(this.enabled){for(const d of next.devices.filter(d=>d.selected)){const device=this.devices.get(d.id);if(device){delete device.on;this.send(device.ip,'devStatus');}}clearInterval(this.watchdog);this.watchdog=setInterval(()=>{if(!this.enabled)return;if(this.now()-this.latestAt>2500){this.stop();this.error='Lighting sync stopped because the app stopped sending music. Start sync to reconnect.';}},1000);this.watchdog.unref();}}
  return this.snapshot();
 }
 frame(frames){
  if(!this.enabled)return {ok:true,enabled:false};this.latestAt=this.now();if(this.now()-this.tickAt<120)return {ok:true,enabled:true};this.tickAt=this.now();
  if(!Array.isArray(frames)||frames.length>32)throw Error('Invalid lighting frame.');
  const selected=new Set(this.options.devices.filter(d=>d.selected).map(d=>d.id));
  if(this.now()-this.statusAt>5000){for(const id of selected){const d=this.devices.get(id);if(d)this.send(d.ip,'devStatus');}this.statusAt=this.now();}
  for(const f of frames){const d=this.devices.get(f?.id);if(!d||!selected.has(d.id)||d.on!==true||this.now()-d.seen>=20000)continue;
   const rgb=f.color,cap=Math.round(this.options.brightness*100);
   if(!rgb||!['r','g','b'].every(k=>Number.isInteger(rgb[k])&&rgb[k]>=0&&rgb[k]<=255)||!Number.isInteger(f.brightness)||f.brightness<1||f.brightness>100)throw Error('Invalid light color or brightness.');
   const brightness=Math.min(f.brightness,cap);
   const old=this.last.get(d.id),refresh=!old||this.now()-old.at>2500;
   const changed=refresh||['r','g','b'].some(k=>Math.abs(rgb[k]-old.color[k])>=2);
   if(changed)this.send(d.ip,'colorwc',{color:rgb,colorTemInKelvin:0});
   if(refresh||brightness!==old.brightness)this.send(d.ip,'brightness',{value:brightness});
   this.last.set(d.id,{color:changed?{...rgb}:old.color,brightness,at:refresh?this.now():old.at});
  }
  return {ok:true,enabled:true};
 }
 stop(){this.enabled=false;this.last.clear();clearInterval(this.watchdog);const socket=this.socket;this.socket=null;try{socket?.close();}catch{}return this.snapshot();}
 close(){this.stop();const socket=this.socket;this.socket=null;try{socket?.close();}catch{}}
}
