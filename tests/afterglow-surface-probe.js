(async()=>{
 const {AFTERGLOW_TERRAIN_VERTEX}=await import('/afterglow-shaders.js'),gl=gpu.gl,count=48*4*2;
 const vertex=AFTERGLOW_TERRAIN_VERTEX.split('out vec3 v_position;')[0]+`out vec3 position;void main(){
  float across=float((gl_VertexID/2)%48)/47.,side=gl_VertexID%2==0?-1.:1.;int row=gl_VertexID/96;
  float z=row==0?1.:row==1?8.:row==2?24.:64.,x=side*(2.45+across*23.);
  position=vec3(x,terrain(x,z),z);gl_Position=vec4(0.,0.,0.,1.);
 }`;
 const program=gl.createProgram(),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),texture=gl.createTexture(),shaders=[];
 try{
  for(const [type,source]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}']]){
   const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(shader));gl.attachShader(program,shader);shaders.push(shader);
  }
  gl.transformFeedbackVaryings(program,['position'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
  gl.uniform1fv(gl.getUniformLocation(program,'u_spectrum[0]'),new Float32Array(48).fill(1));gl.uniform4f(gl.getUniformLocation(program,'u_roles'),1,1,1,1);gl.uniform1f(gl.getUniformLocation(program,'u_movement'),3.5);
  gl.activeTexture(gl.TEXTURE7);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.R8,48,128,0,gl.RED,gl.UNSIGNED_BYTE,new Uint8Array(48*128).fill(255));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.uniform1i(gl.getUniformLocation(program,'u_history'),7);
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,count*12,gl.STREAM_READ);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
  gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,count);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
  const data=new Float32Array(count*3);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);let near=0,distant=0,mirror=0;
  for(let i=0;i<data.length;i+=6){if(!Number.isFinite(data[i+1]))throw Error('Nonfinite landscape');mirror=Math.max(mirror,Math.abs(data[i+1]-data[i+4]));if(data[i+2]===1)near=Math.max(near,data[i+1]);if(data[i+2]===24)distant=Math.max(distant,data[i+1]);}
  return {near,distant,ratio:near/distant,mirror};
 }finally{gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteTransformFeedback(feedback);gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gpu.draw(input);}
})()
