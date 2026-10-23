(async()=>{
 const {AERIAL_VERTEX}=await import('/aerial-shaders.js'),gl=gpu.gl,source=gpu.aerialSurface;
 const vertex=AERIAL_VERTEX.split('void main(){')[0]+`out vec4 result;out vec4 metadata;void main(){result=vec4(shape(7),sphere(24).w);float life=7.+hash(4.)*8.;metadata=vec4(beadFade(24),hash(33.)*life,life,0.);gl_Position=vec4(0.,0.,0.,1.);}`;
 const program=gl.createProgram(),buffer=gl.createBuffer(),feedback=gl.createTransformFeedback(),shaders=[];
 try{
  for(const [type,code]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,'#version 300 es\nprecision highp float;out vec4 color;void main(){color=vec4(0.);}']]){
   const s=gl.createShader(type);gl.shaderSource(s,code);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(program,s);shaders.push(s);
  }
  gl.transformFeedbackVaryings(program,['result','metadata'],gl.INTERLEAVED_ATTRIBS);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  const probe={program,uniforms:new Map()};gl.useProgram(program);
  for(let i=0;i<gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);i++){const name=gl.getActiveUniform(program,i).name.replace('[0]','');gpu.uniform(probe,name,gl.getUniform(source.program,gpu.location(source,name)));}
  gpu.uniform(probe,'u_beadCount',180);gpu.uniform(probe,'u_beadDensity',1);
  const sample=(time,level)=>{
   gpu.uniform(probe,'u_studio',[time,0,1,0]);gpu.uniform(probe,'u_spectrum',new Float32Array(48).fill(level));gpu.uniform(probe,'u_spectrumLight',new Float32Array(48).fill(level));gpu.uniform(probe,'u_roles',[level,level,level,0]);
   gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,32,gl.STREAM_READ);gl.bindBuffer(gl.ARRAY_BUFFER,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,buffer);
   gl.enable(gl.RASTERIZER_DISCARD);gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,1);gl.endTransformFeedback();gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
   const data=new Float32Array(8);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.getBufferSubData(gl.ARRAY_BUFFER,0,data);return data;
  };
  const quiet=sample(1,0),loud=sample(1,1),deformation=quiet.slice(0,3).reduce((sum,v,i)=>sum+Math.abs(v-loud[i]),0),start=quiet[6]-quiet[5],life=quiet[6];
  let previous=sample(start,0)[3],maxRadiusStep=0,peakRadius=0;
  const birthRadius=previous;
  for(let i=1;i<=Math.ceil(life*120);i++){const radius=sample(start+i/120,0)[3];maxRadiusStep=Math.max(maxRadiusStep,Math.abs(radius-previous));peakRadius=Math.max(peakRadius,radius);previous=radius;}
  const deathRadius=sample(start+life,0)[3];return {deformation,birthRadius,deathRadius,peakRadius,maxRadiusStep};
 }finally{gl.disable(gl.RASTERIZER_DISCARD);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.deleteTransformFeedback(feedback);gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s));gpu.draw(input);}
})()
