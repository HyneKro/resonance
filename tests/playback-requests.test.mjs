import test from 'node:test';
import assert from 'node:assert/strict';
import {SkipBurst,LatestStateWriter} from '../public/playback-requests.js';
import {ContinuousQueue} from '../public/queue.js';

test('rapid Next/Previous preserves each intent but opens only the final recording',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 const queue=new ContinuousQueue(()=>Array.from({length:100},(_,i)=>({id:String(i),available:true}))),skips=new SkipBurst();queue.start('0',Array.from({length:100},(_,i)=>String(i)));
 const opened=[],requests=[];
 for(const direction of [...Array(25).fill(1),-1,-1]){
  const index=queue.next(direction,skips.pending?.index??queue.cursor);
  requests.push(skips.request(index,()=>{queue.select(queue.items[index],index);opened.push(queue.items[index]);}));
  t.mock.timers.tick(30);
 }
 assert.deepEqual(opened,[]);t.mock.timers.tick(110);await Promise.all(requests);
 assert.deepEqual(opened,['23']);assert.equal(queue.cursor,23);
});
test('pause or an explicit selection cancels a pending skip without later restarting',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const skips=new SkipBurst();let opened=false;
 const pending=skips.request(5,()=>{opened=true});skips.cancel();t.mock.timers.tick(1000);
 assert.equal(await pending,false);assert.equal(opened,false);assert.equal(skips.pending,null);
});
test('player saves collapse bursts and write the latest state after an in-flight save',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let state=0,release;const written=[];
 const writer=new LatestStateWriter(async()=>{written.push(state);if(written.length===1)await new Promise(r=>release=r)});
 for(let i=0;i<20;i++){state=i;writer.schedule();t.mock.timers.tick(5);}
 assert.deepEqual(written,[]);t.mock.timers.tick(180);await Promise.resolve();assert.deepEqual(written,[19]);
 state=25;writer.schedule();const closing=writer.flush();release();await closing;
 assert.deepEqual(written,[19,25]);
});
