import test from 'node:test';
import assert from 'node:assert/strict';

test('Android activity completes once on success, bridge error, missing bridge and timeout',async t=>{
 const completions=[],messages=[];
 globalThis.window={ResonanceNative:{postMessage(raw){messages.push(JSON.parse(raw));}}};
 const native=await import('../android/web/native.js');
 native.trackNativeActivity(action=>error=>completions.push({action,error:!!error}));
 const bridge=window.ResonanceNative;
 const reply=(message,result)=>bridge.onmessage({data:JSON.stringify({id:message.id,...result})});
 try{
  const success=native.rpc('lyricsRequest');reply(messages.at(-1),{value:{status:200}});
  assert.deepEqual(await success,{status:200});
  // A repeated callback must not complete a task twice.
  reply(messages.at(-1),{value:{status:200}});
  const failed=native.rpc('research');reply(messages.at(-1),{error:'Service unavailable'});
  await assert.rejects(failed,/Service unavailable/);
  window.ResonanceNative=null;await assert.rejects(native.rpc('researchGenres'),/Open the Android app/);
  window.ResonanceNative=bridge;
  t.mock.timers.enable({apis:['setTimeout']});
  const timedOut=native.rpc('lyricsSearch');const rejected=assert.rejects(timedOut,/taking longer/);
  t.mock.timers.tick(45000);await rejected;
  reply(messages.at(-1),{value:{}});
  assert.deepEqual(completions,[
   {action:'lyricsRequest',error:false},{action:'research',error:true},
   {action:'researchGenres',error:true},{action:'lyricsSearch',error:true}
  ]);
 }finally{t.mock.timers.reset();delete globalThis.window;}
});
