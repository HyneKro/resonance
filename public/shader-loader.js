import {yieldSceneWork} from './scene-preparation.js';
export async function compileSceneProgram(gl,vertex,fragment,varyings,{cancelled=()=>false,yieldWork=yieldSceneWork}={}){
 const extension=gl.getExtension('KHR_parallel_shader_compile'),shaders=[],program=gl.createProgram();
 try{
  for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){if(cancelled())throw Error('Scene preparation cancelled');const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,source);gl.compileShader(shader);gl.attachShader(program,shader);await yieldWork();}
  if(varyings)gl.transformFeedbackVaryings(program,varyings,gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(program);gl.flush();await yieldWork();
  while(extension&&!gl.getProgramParameter(program,extension.COMPLETION_STATUS_KHR)){if(cancelled())throw Error('Scene preparation cancelled');await yieldWork();}
  if(cancelled())throw Error('Scene preparation cancelled');
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
   const details=shaders.map(shader=>gl.getShaderInfoLog(shader)).filter(Boolean).join('\n');
   throw Error(details||gl.getProgramInfoLog(program)||'Shader link failed');
  }
  return {program,uniforms:new Map()};
 }catch(e){gl.deleteProgram(program);throw e;}finally{for(const s of shaders)gl.deleteShader(s);}
}
