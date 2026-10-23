(async()=>{
 const {AERIAL_CURRENT_VERTEX}=await import('/aerial-shaders.js'),gl=gpu.gl,source=gpu.aerialCurrents;
 const vertex=AERIAL_CURRENT_VERTEX.split('void main(){')[0]+`out vec3 position;void main(){float stream=gl_VertexID<4?float(gl_VertexID):u_currentGlobal+float(gl_VertexID-4)*2.;position=current(stream,.23+float(gl_VertexID%2)*.21);gl_Position=vec4(0.,0.,0.,1.);}`;
 const program=gl.createProgram(),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),shaders=[];
 try{
  for(const [type,code]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}']]){
   const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);shaders.push(shader);
  }
  gl.transformFeedbackVaryings(program,['position'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const probe={program,uniforms:new Map()};gl.useProgram(program);
  for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){
   const info=gl.getActiveUniform(program,i),name=info.name.replace('[0]','');let value;
   if(info.size>1){value=[];for(let j=0;j<info.size;j++){const item=gl.getUniform(source.program,gpu.location(source,name+'['+j+']'));if(typeof item==='number')value.push(item);else value.push(...item);}}
   else value=gl.getUniform(source.program,gpu.location(source,name));gpu.uniform(probe,name,value);
  }
  const sample=(phase,percussion)=>{
   const notes=new Float32Array(96).fill(.4);for(let i=0;i<24;i++)notes[i*4+2]=percussion;
   gpu.uniform(probe,'u_studio',[3600,0,1,0]);gpu.uniform(probe,'u_aerialBands',notes);gpu.uniform(probe,'u_currentPhase',new Float32Array(24).fill(phase));
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,8*12,gl.STREAM_READ);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,8);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
   const data=new Float32Array(24);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);return data;
  };
  const distance=(a,b)=>{let largest=0;for(let i=0;i<a.length;i+=3)largest=Math.max(largest,Math.hypot(a[i]-b[i],a[i+1]-b[i+1],a[i+2]-b[i+2]));return largest;};
  const baseline=sample(1,.30),longSessionStep=distance(baseline,sample(1,.32)),smallAdvance=distance(baseline,sample(1.001,.30)),wrapStep=distance(sample(Math.PI*2-.0001,.30),sample(.0001,.30));
  return {longSessionStep,smallAdvance,wrapStep};
 }finally{gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteTransformFeedback(feedback);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gpu.draw(input);}
})()
