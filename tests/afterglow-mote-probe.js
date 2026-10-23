(async()=>{
 const {AFTERGLOW_DUST_VERTEX}=await import('/afterglow-shaders.js'),gl=gpu.gl,source=gpu.roadDust;
 const program=gl.createProgram(),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),shaders=[];
 try{
  for(const [type,code]of [[gl.VERTEX_SHADER,AFTERGLOW_DUST_VERTEX],[gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}']]){
   const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);shaders.push(s);
  }
  gl.transformFeedbackVaryings(program,['v_motePosition'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const probe={program,uniforms:new Map()};gl.useProgram(program);
  for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const name=gl.getActiveUniform(program,i).name.replace('[0]','');gpu.uniform(probe,name,gl.getUniform(source.program,gpu.location(source,name)));}
  const seed=gl.getAttribLocation(program,'a_seed');gl.disableVertexAttribArray(seed);gl.vertexAttrib4f(seed,.46,.68,.24,.6);
  const sample=tail=>{
   gpu.uniform(probe,'u_tail',tail);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,6*12,gl.STREAM_READ);gl.bindBuffer(gl.ARRAY_BUFFER,null);
   gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.TRIANGLES);gl.drawArrays(gl.TRIANGLES,0,6);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
   const data=new Float32Array(18);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);return data;
  };
  const head=sample(0),tail=sample(3),range=(p,k)=>Math.max(...Array.from({length:6},(_,i)=>p[i*3+k]))-Math.min(...Array.from({length:6},(_,i)=>p[i*3+k]));
  const center=(p,k)=>Array.from({length:6},(_,i)=>p[i*3+k]).reduce((a,b)=>a+b)/6;
  return {heightRange:range(head,1),width:range(head,0),depth:range(head,2),trailSideways:Math.abs(center(head,0)-center(tail,0)),trailDepth:center(tail,2)-center(head,2)};
 }finally{gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteTransformFeedback(feedback);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gpu.draw(input);}
})()
