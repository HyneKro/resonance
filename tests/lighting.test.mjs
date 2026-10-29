import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {GoveeLAN,privateIPv4} from '../govee.mjs';
import {realtimeMode,realtimePixels} from '../public/lighting-protocol.js';
import {LightingSignal,lightingOptions} from '../public/lighting-signal.js';
import fs from 'node:fs/promises';
import path from 'node:path';
const id='00:11:22:33:44:55:66:77',ip='192.168.20.2';
class Socket extends EventEmitter {
 constructor(){super();this.sent=[];}
 bind(port,address,fn){this.port=port;fn();}
 setMulticastTTL(){} unref(){} close(){this.closed=true;}
 send(bytes,port,address,callback){this.sent.push({msg:JSON.parse(bytes).msg,port,address});callback?.();}
}
function fixture(){const socket=new Socket();let time=10000,saved;const bridge=new GoveeLAN({socketFactory:()=>socket,interfaces:()=>[],now:()=>time,save:p=>saved=p});return {bridge,socket,advance:ms=>time+=ms,get saved(){return saved;}};}
const incoming=(bridge,cmd,data,address=ip)=>bridge.receive(Buffer.from(JSON.stringify({msg:{cmd,data}})),{address});
const discover=bridge=>{incoming(bridge,'scan',{device:id,sku:'H61D5',ip:'8.8.8.8',deviceName:'Desk'});incoming(bridge,'devStatus',{onOff:1,brightness:100});};
const options={brightness:.6,response:1,idle:.2,devices:[{id,selected:true,segments:48,reverse:false}]};
test('LAN bridge is off and opens no network socket until requested; discovery trusts the sender address',async()=>{
 const f=fixture();try{assert.equal(f.bridge.socket,undefined);assert.equal(f.bridge.snapshot().enabled,false);await f.bridge.open();assert.equal(f.socket.port,4002);discover(f.bridge);assert.equal(f.bridge.snapshot().devices[0].ip,ip);assert.equal(f.bridge.snapshot().devices[0].model,'H61D5');assert.equal(f.socket.sent[0].msg.cmd,'devStatus');
 incoming(f.bridge,'scan',{device:'different',sku:'H61D3'},'8.8.8.8');assert.equal(f.bridge.devices.size,1);assert.ok(['192.168.1.2','10.0.0.2','172.16.2.1'].every(privateIPv4));assert.ok(['127.0.0.1','8.8.8.8','192.168.1.999','localhost','172.32.1.2'].every(x=>!privateIPv4(x)));
 }finally{await f.bridge.close();}
});
test('realtime packets have native golden bytes, 16-bit lengths and XOR; no wrap-around interpolation',()=>{
 assert.equal(Buffer.from(realtimeMode(true)).toString('hex'),'bb0001b1010a');assert.equal(Buffer.from(realtimeMode(false)).toString('hex'),'bb0001b1000b');
 assert.equal(Buffer.from(realtimePixels([[255,0,0],[0,0,255]])).toString('hex'),'bb0008b00002ff00000000ff01');
 const bytes=realtimePixels(Array.from({length:140},()=>[12,30,255]));assert.equal(bytes.length,427);assert.equal((bytes[1]<<8)|bytes[2],422);assert.equal(bytes.reduce((a,b)=>a^b),0);assert.equal(bytes[4],0);
 for(const invalid of [[],Array(256).fill([0,0,0]),[[256,0,0]],[[1.5,0,0]],[[0,0]],[[0,'2',0]]])assert.throws(()=>realtimePixels(invalid),/Invalid/);
});
const frame=()=>[{id,pixels:Array.from({length:48},()=>[180,20,90]),brightness:40}];
const controls=f=>f.socket.sent.filter(x=>x.msg.cmd!=='devStatus').map(x=>x.msg);
const step=(f,frames=frame())=>{f.advance(125);f.bridge.frame(frames);};
test('selected powered-on lights get spaced arm/pixel commands, brightness caps, and release on Stop',async()=>{
 const f=fixture();try{await f.bridge.open();discover(f.bridge);await f.bridge.configure({enabled:true,options});f.socket.sent=[];f.bridge.frame(frame());assert.equal(controls(f).length,0,'fresh power status required');incoming(f.bridge,'devStatus',{onOff:1,brightness:80});
 step(f);assert.deepEqual(controls(f),[{cmd:'brightness',data:{value:40}}]);step(f);assert.equal(controls(f).at(-1).data.pt,'uwABsQEK');step(f);const bytes=Buffer.from(controls(f).at(-1).data.pt,'base64');assert.equal(bytes[3],0xb0);assert.equal(bytes[5],48);assert.deepEqual([...bytes.slice(6,9)],[180,20,90]);
 const count=f.socket.sent.length;f.bridge.frame(frame());step(f);assert.equal(f.socket.sent.length,count,'rate limiting and dedup');
 step(f,[{...frame()[0],brightness:90}]);assert.equal(controls(f).at(-1).data.value,60,'server cap applies to in-flight frames');assert.throws(()=>step(f,[{...frame()[0],brightness:101}]),/Invalid/);assert.throws(()=>step(f,[{...frame()[0],pixels:[[1,2,3]]}]),/Invalid/);
 await f.bridge.stop();const tail=controls(f).slice(-2);assert.equal(tail[0].data.pt,'uwABsQAL');assert.deepEqual(tail[1],{cmd:'brightness',data:{value:80}});assert.equal(f.socket.closed,true);assert.equal(f.bridge.frame(frame()).enabled,false);assert.ok(f.socket.sent.every(x=>!['turn','colorwc'].includes(x.msg.cmd)));
 }finally{await f.bridge.close();}
});
test('streaming can survive firmware that suppresses status; reported manual power-off still wins',async()=>{
 const f=fixture();try{await f.bridge.open();discover(f.bridge);await f.bridge.configure({enabled:true,options});incoming(f.bridge,'devStatus',{onOff:1,brightness:80});step(f);step(f);step(f);f.advance(21000);f.socket.sent=[];f.bridge.frame(frame());step(f,[{...frame()[0],pixels:Array(48).fill([1,2,3])}]);assert.ok(controls(f).some(x=>x.cmd==='razer'),'no false twenty-second cutoff while armed');
 incoming(f.bridge,'devStatus',{onOff:0});f.socket.sent=[];step(f);assert.equal(controls(f).length,1);assert.equal(controls(f)[0].data.pt,'uwABsQAL');f.socket.sent=[];step(f);assert.equal(controls(f).length,0,'power off is respected');assert.equal(f.saved.enabled,undefined);
 }finally{await f.bridge.close();}
});
test('all strips receive the same full frequency/palette map, reversible and smooth across pause or song changes',()=>{
 const signal=new LightingSignal(),p={...options,devices:[{id,selected:true,segments:48},{id:id.slice(0,-2)+'88',selected:true,segments:48},{id:id.slice(0,-2)+'99',selected:true,segments:48,reverse:true}]};
 const colors=[[1,0,0],[1,.5,0],[0,1,0],[0,1,1],[0,0,1],[1,0,1]],spectrum=Array.from({length:48},(_,i)=>i<8?1:0),features={loudness:.8,spectrum};let frames;
 for(let i=0;i<80;i++)frames=signal.update({colors,features,active:true},.05,p);
 assert.deepEqual(frames[0].pixels,frames[1].pixels);assert.deepEqual(frames[0].pixels,[...frames[2].pixels].reverse());assert.ok(frames[0].pixels[0][0]>frames[0].pixels[47][0]*2,'bass peak lights the start only');assert.ok(frames[0].pixels[47][2]>0,'quiet gradient still reaches treble end');
 const before=frames[0].pixels[0][0],paused=signal.update({colors,features,active:false},.05,p)[0];assert.ok(paused.pixels[0][0]>before*.8,'pause releases gradually');
 const changed=signal.update({colors:colors.map(()=>[0,0,1]),features,active:true},.05,p)[0];assert.ok(changed.pixels[0][0]>changed.pixels[0][2],'palette never snaps');
 for(let i=0;i<120;i++)frames=signal.update({colors,features,active:false},.05,p);assert.ok(frames[0].pixels.every(c=>Math.max(...c)<=Math.round(p.idle*255)+1));
 const high=new LightingSignal();for(let i=0;i<80;i++)frames=high.update({colors,features:{loudness:.8,spectrum:spectrum.map((_,i)=>i>39?1:0)},active:true},.05,p);assert.ok(Math.max(...frames[0].pixels[47])>Math.max(...frames[0].pixels[0])*2,'high frequencies light the far end');
 const small=signal.update({colors,features,active:false},.05,{...p,devices:[{id,selected:true,segments:6}]})[0];assert.deepEqual(small.pixels[0],signal.update({colors,features,active:false},0,p)[0].pixels[0]);assert.equal(small.pixels.length,6);
 assert.deepEqual(lightingOptions({brightness:9,response:Infinity,idle:-5,devices:[{id:'invalid',selected:true}]}),{brightness:1,response:0,idle:0,devices:[]});
});
test('whole-strip selections migrate to model zone estimates once, preserving later calibration',async()=>{
 const socket=new Socket(),g=new GoveeLAN({socketFactory:()=>socket,load:()=>({devices:[{id,selected:true,role:'bass',color:4}]})});
 try{await g.open();discover(g);assert.equal(g.options.devices[0].segments,70);assert.equal(g.options.devices[0].selected,true);assert.equal(g.enabled,false);await g.configure({options:{devices:[{id,selected:true,segments:64,reverse:true}]}});discover(g);assert.equal(g.options.devices[0].segments,64);assert.equal(g.options.devices[0].reverse,true);}finally{await g.close();}
});
test('a stalled renderer stops sync and releases the LAN controller port',async()=>{
 const f=fixture();try{await f.bridge.open();discover(f.bridge);await f.bridge.configure({enabled:true,options});f.advance(3000);await new Promise(r=>setTimeout(r,1100));assert.equal(f.bridge.snapshot().enabled,false);assert.equal(f.socket.closed,true);assert.match(f.bridge.snapshot().error,/stopped sending music/);}finally{await f.bridge.close();}
});
test('lighting controls require the existing local session token and remain network-idle on startup',async()=>{
 const {startServer}=await import('../server.mjs');await fs.mkdir('test-output',{recursive:true});const dataDir=await fs.mkdtemp(path.resolve('test-output/lighting-api-'));const service=await startServer({port:0,dataDir,autoScan:false});
 try{const blocked=await fetch(service.url+'/api/lighting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'scan'})});assert.equal(blocked.status,403);assert.equal(service.lighting.socket,undefined);
 const response=await fetch(service.url+'/api/lighting',{method:'POST',headers:{'Content-Type':'application/json','x-resonance-token':service.token},body:JSON.stringify({action:'status'})});assert.equal(response.status,200);assert.equal((await response.json()).enabled,false);assert.equal(service.lighting.socket,undefined);
 const stopped=await fetch(service.url+'/api/lighting',{method:'POST',headers:{'Content-Type':'application/json','x-resonance-token':service.token},body:JSON.stringify({action:'stop'})});const state=await stopped.json();assert.equal(state.enabled,false);assert.ok(Array.isArray(state.devices));assert.ok(state.options,'Stop waits for release and returns a complete snapshot');
 }finally{await new Promise(r=>service.server.close(r));service.lib.close();}
});
