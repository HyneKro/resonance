(async()=>{
 const {FLUX_SURFACE}=await import('/flux-shaders.js'),gl=gpu.gl,count=48*5*2;
 const vertex='#version 300 es\nprecision highp float;uniform vec4 u_roles;uniform float u_fluxClock,u_movement,u_amplitude;out vec3 position;'+FLUX_SURFACE+`\nvoid main(){
  int pair=gl_VertexID/2;float lane=float(pair%48)/47.,age=float(pair/48)/4.,side=float(gl_VertexID%2);
  position=fluxSurface(lane,age,u_amplitude,side);gl_Position=vec4(0.,0.,0.,1.);
 }`;
 const program=gl.createProgram(),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),shaders=[];
 for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}']]){
  const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);shaders.push(shader);
 }
 gl.transformFeedbackVaryings(program,['position'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
 gl.useProgram(program);gl.uniform4f(gl.getUniformLocation(program,'u_roles'),.8,.6,.7,.5);gl.uniform1f(gl.getUniformLocation(program,'u_fluxClock'),17.3);gl.uniform1f(gl.getUniformLocation(program,'u_movement'),2);
 const sample=amplitude=>{
  gl.uniform1f(gl.getUniformLocation(program,'u_amplitude'),amplitude);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,count*12,gl.STREAM_READ);
  gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
  const data=new Float32Array(count*3);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);return data;
 };
 let baselineMin=Infinity,baselineMax=-Infinity,depthError=0,mirrorError=0;
 try{
  const flat=sample(0),active=sample(.8);for(let i=0;i<flat.length;i+=6){baselineMin=Math.min(baselineMin,flat[i+1],flat[i+4]);baselineMax=Math.max(baselineMax,flat[i+1],flat[i+4]);depthError=Math.max(depthError,Math.abs(active[i]-active[i+3]),Math.abs(active[i+2]-active[i+5]));mirrorError=Math.max(mirrorError,Math.abs((active[i+1]+.48)*.42+active[i+4]+.48));}
 }finally{gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteTransformFeedback(feedback);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gpu.draw(input);}
 return {baselineHeight:baselineMin,baselineRange:baselineMax-baselineMin,pairedDepthError:depthError,mirrorError};
})()
