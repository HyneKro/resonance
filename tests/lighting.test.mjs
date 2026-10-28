import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {GoveeLAN,privateIPv4} from '../govee.mjs';
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
const options={brightness:.6,response:1,idle:.2,devices:[{id,selected:true,color:0,role:'mix'}]};
test('LAN bridge is off and opens no network socket until requested; discovery trusts the sender address',async()=>{
 const f=fixture();try{assert.equal(f.bridge.socket,undefined);assert.equal(f.bridge.snapshot().enabled,false);await f.bridge.open();assert.equal(f.socket.port,4002);discover(f.bridge);assert.equal(f.bridge.snapshot().devices[0].ip,ip);assert.equal(f.bridge.snapshot().devices[0].model,'H61D5');assert.equal(f.socket.sent[0].msg.cmd,'devStatus');
 incoming(f.bridge,'scan',{device:'different',sku:'H61D3'},'8.8.8.8');assert.equal(f.bridge.devices.size,1);assert.ok(['192.168.1.2','10.0.0.2','172.16.2.1'].every(privateIPv4));assert.ok(['127.0.0.1','8.8.8.8','192.168.1.999','localhost','172.32.1.2'].every(x=>!privateIPv4(x)));
 }finally{f.bridge.close();}
});
test('only selected, recently responding, powered-on lights get bounded RGB and brightness commands',async()=>{
 const f=fixture();try{await f.bridge.open();discover(f.bridge);await f.bridge.configure({enabled:true,options});const frame=[{id,color:{r:180,g:20,b:90},brightness:40}];f.socket.sent=[];f.bridge.frame(frame);assert.ok(f.socket.sent.every(x=>x.msg.cmd==='devStatus'),'fresh power state required after starting');incoming(f.bridge,'devStatus',{onOff:1});f.advance(125);f.socket.sent=[];f.bridge.frame(frame);assert.deepEqual(f.socket.sent.filter(x=>x.msg.cmd!=='devStatus').map(x=>x.msg),[{cmd:'colorwc',data:{color:frame[0].color,colorTemInKelvin:0}},{cmd:'brightness',data:{value:40}}]);
 const sent=f.socket.sent.length;f.bridge.frame([{...frame[0],brightness:45}]);assert.equal(f.socket.sent.length,sent,'rate limited');f.advance(125);f.bridge.frame(frame);assert.equal(f.socket.sent.length,sent,'unchanged commands suppressed');
 f.advance(125);f.bridge.frame([{...frame[0],brightness:61}]);assert.equal(f.socket.sent.at(-1).msg.data.value,60,'in-flight frames respect a newly lowered brightness limit');f.advance(125);assert.throws(()=>f.bridge.frame([{...frame[0],brightness:101}]),/Invalid/);f.advance(125);assert.throws(()=>f.bridge.frame([{...frame[0],color:{r:300,g:2,b:0}}]),/Invalid/);
 incoming(f.bridge,'devStatus',{onOff:0});f.advance(125);f.socket.sent=[];f.bridge.frame(frame);assert.equal(f.socket.sent.length,0,'manual power off respected');
 incoming(f.bridge,'devStatus',{onOff:1});f.advance(21000);f.bridge.frame(frame);assert.ok(f.socket.sent.every(x=>x.msg.cmd==='devStatus'),'stale address never receives colors');
 assert.equal(f.saved.enabled,undefined,'sync does not auto-start next session');assert.ok(f.socket.sent.every(x=>x.msg.cmd!=='turn'));f.bridge.stop();assert.equal(f.bridge.frame(frame).enabled,false);assert.equal(f.socket.closed,true,'stop releases the controller port');
 }finally{f.bridge.close();}
});
test('lighting envelopes follow actual palette and frequency roles; pause and new songs fade continuously',()=>{
 const signal=new LightingSignal(),p={...options,devices:['bass','mids','highs'].map((role,i)=>({id:id.slice(0,-2)+'0'+i,selected:true,color:0,role}))};
 const colors=Array.from({length:6},()=>[1,0,0]),features={loudness:.6,bands:[1,1,0,0,0,0,0,0],accents:[.8,0,0]};let frames;
 for(let i=0;i<80;i++)frames=signal.update({colors,features,active:true},.05,p);
 assert.ok(frames[0].brightness>frames[2].brightness+20,'bass has a distinct response');assert.ok(frames[0].color.r>frames[0].color.b*10);
 const before=frames[0];const paused=signal.update({colors,features,active:false},.05,p)[0];assert.ok(paused.brightness>before.brightness*.8,'pause releases gradually');
 const changed=signal.update({colors:colors.map(()=>[0,0,1]),features,active:true},.05,p)[0];assert.ok(changed.color.r>changed.color.b,'new palette does not snap');
 for(let i=0;i<120;i++)frames=signal.update({colors,features,active:false},.05,p);assert.ok(frames[0].brightness<=Math.round(p.brightness*100*p.idle)+1);
 assert.deepEqual(lightingOptions({brightness:9,response:Infinity,idle:-5,devices:[{id:'invalid',selected:true}]}),{brightness:1,response:0,idle:0,devices:[]});
});
test('a stalled renderer stops sync and releases the LAN controller port',async()=>{
 const f=fixture();try{await f.bridge.open();discover(f.bridge);await f.bridge.configure({enabled:true,options});f.advance(3000);await new Promise(r=>setTimeout(r,1100));assert.equal(f.bridge.snapshot().enabled,false);assert.equal(f.socket.closed,true);assert.match(f.bridge.snapshot().error,/stopped sending music/);}finally{f.bridge.close();}
});
test('lighting controls require the existing local session token and remain network-idle on startup',async()=>{
 const {startServer}=await import('../server.mjs');await fs.mkdir('test-output',{recursive:true});const dataDir=await fs.mkdtemp(path.resolve('test-output/lighting-api-'));const service=await startServer({port:0,dataDir,autoScan:false});
 try{const blocked=await fetch(service.url+'/api/lighting',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'scan'})});assert.equal(blocked.status,403);assert.equal(service.lighting.socket,undefined);
 const response=await fetch(service.url+'/api/lighting',{method:'POST',headers:{'Content-Type':'application/json','x-resonance-token':service.token},body:JSON.stringify({action:'status'})});assert.equal(response.status,200);assert.equal((await response.json()).enabled,false);assert.equal(service.lighting.socket,undefined);
 }finally{await new Promise(r=>service.server.close(r));service.lib.close();}
});
