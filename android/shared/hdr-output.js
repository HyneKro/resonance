import {ScenePreparation} from './scene-preparation.js';
let preparedAdapter;
// Adapter discovery can briefly stall presentation inside the graphics driver.
// Do it during the still-logo prelude, before starting the loading choreography.
export async function preflightHDROutput(mode='auto'){
 const wanted=mode==='on'||mode==='auto'&&globalThis.matchMedia?.('(dynamic-range: high)').matches;
 if(!wanted||!globalThis.navigator?.gpu)return;
 preparedAdapter??=navigator.gpu.requestAdapter({powerPreference:'high-performance'}).catch(()=>null);
 await preparedAdapter;
}
function takeAdapter(){const adapter=preparedAdapter;preparedAdapter=undefined;return adapter||navigator.gpu.requestAdapter({powerPreference:'high-performance'});}
// WebGL owns the artwork; WebGPU only presents its final frame in extended range.
// Perceptual encoding keeps highlights above 1 through the ordinary WebGL canvas copy,
// without synchronous readPixels, CPU image buffers or a second animation loop.
const SHADER=`
@group(0) @binding(0) var image: texture_2d<f32>;
@vertex fn vertex(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
 let p=array<vec2f,3>(vec2f(-1,-1),vec2f(3,-1),vec2f(-1,3));return vec4f(p[index],0,1);
}
@fragment fn fragment(@builtin(position) p:vec4f) -> @location(0) vec4f {
 let encoded=textureLoad(image,vec2i(p.xy),0).rgb;
 // The transport reserves 80% of its codes for SDR, including deep shadows.
 // rgba16float + srgb expects perceptual components, including values above 1.
 let rgb=select(encoded/.8,1.0+(encoded-.8)*4.0,encoded>vec3f(.8));
 return vec4f(rgb,1);
}`;

export class HDROutput{
 constructor(source,onChange=()=>{}){
  this.source=source;this.onChange=onChange;this.mode='off';this.state='off';this.generation=0;this.ready=false;
  this.query=globalThis.matchMedia?.('(dynamic-range: high)');this.changed=()=>{this.release();this.onChange();};this.query?.addEventListener('change',this.changed);
 }
 update(mode='auto'){
  if(mode!==this.mode){this.release();this.mode=mode;}
  const wanted=mode==='on'||mode==='auto'&&this.query?.matches;
  if(!wanted){this.state=mode==='off'?'off':'sdr';return false;}
  if(this.state!=='starting'&&this.state!=='unavailable'&&!this.ready)this.preparing=this.prepare();return this.ready;
 }
 async prepare(){
  const generation=++this.generation,work=new ScenePreparation({cancelled:()=>generation!==this.generation});this.state='starting';let device;
  try{
   if(!globalThis.navigator?.gpu)throw Error('HDR output is unavailable');
   await work.checkpoint();
   const adapter=await takeAdapter();if(!adapter)throw Error('No HDR presentation adapter');
   await work.checkpoint();
   device=await adapter.requestDevice();if(generation!==this.generation){device.destroy();return;}
   await work.checkpoint();
   const canvas=document.createElement('canvas');canvas.className='hdr-presentation';canvas.hidden=true;canvas.setAttribute('aria-hidden','true');
   const context=canvas.getContext('webgpu');if(!context)throw Error('No HDR presentation canvas');
   device.pushErrorScope('validation');
   context.configure({device,format:'rgba16float',colorSpace:'srgb',toneMapping:{mode:'extended'},alphaMode:'opaque'});
   await work.checkpoint();
   const module=device.createShaderModule({code:SHADER});await work.checkpoint();
   const pipeline=await device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vertex'},fragment:{module,entryPoint:'fragment',targets:[{format:'rgba16float'}]},primitive:{topology:'triangle-list'}});
   const error=await device.popErrorScope();if(error)throw Error(error.message);
   if(context.getConfiguration?.().toneMapping?.mode!=='extended')throw Error('Extended output is not supported');
   if(generation!==this.generation){context.unconfigure();device.destroy();return;}
   this.canvas=canvas;this.context=context;this.device=device;this.pipeline=pipeline;this.source.after(canvas);this.ready=true;this.state='active';this.onChange();
   device.lost.then(()=>{if(this.device===device){this.release();this.state='unavailable';this.onChange();}});
   device.addEventListener('uncapturederror',()=>{if(this.device===device){this.release();this.state='unavailable';this.onChange();}});
  }catch{device?.destroy();if(generation===this.generation){this.state='unavailable';this.onChange();}}
 }
 present(){
  if(!this.ready)return false;
  try{
   const w=this.source.width,h=this.source.height,d=this.device;
   for(const key of ['width','height','left','top','transform'])this.canvas.style[key]=this.source.style[key];
   if(!this.texture||w!==this.canvas.width||h!==this.canvas.height){
    this.texture?.destroy();this.canvas.width=w;this.canvas.height=h;
    this.texture=d.createTexture({size:[w,h],format:'rgba8unorm',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.RENDER_ATTACHMENT});
    this.group=d.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:this.texture.createView()}]});
   }
   d.queue.copyExternalImageToTexture({source:this.source},{texture:this.texture,colorSpace:'srgb'},[w,h]);
   const encoder=d.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:'clear',storeOp:'store'}]});
   pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.group);pass.draw(3);pass.end();d.queue.submit([encoder.finish()]);
   this.source.style.opacity='0';this.canvas.hidden=false;return true;
  }catch{this.release();this.state='unavailable';this.onChange();return false;}
 }
 description(){return this.state==='active'?this.query?.matches?'HDR active · extended highlights':'HDR requested · enable HDR in Windows for this screen':this.state==='starting'?'Preparing HDR output…':this.state==='unavailable'?'HDR unavailable here · using standard output':this.state==='off'?'Standard output · HDR off':'Auto · standard-range screen';}
 release(){this.generation++;this.ready=false;this.source.style.opacity='';this.texture?.destroy();this.texture=null;this.context?.unconfigure();this.context=null;this.canvas?.remove();this.canvas=null;const device=this.device;this.device=null;device?.destroy();this.state='off';}
 dispose(){this.release();this.query?.removeEventListener('change',this.changed);}
}
