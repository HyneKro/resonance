// A bounded in-memory spectrogram of the existing 48 logarithmic bands.
// No audio recording, resampling, disk writes or work while another style is active.
export class SpectrumHistory {
  constructor(height=128){this.width=48;this.height=height;this.data=new Uint8Array(this.width*this.height);this.row=new Uint8Array(this.width);this.reset();}
  reset(){this.data.fill(0);this.head=0;this.clock=null;this.accumulator=0;this.version=(this.version||0)+1;}
  suspend(){this.clock=null;this.accumulator=0;}
  update(clock,spectrum){
    if(!Number.isFinite(clock))return false;
    for(let i=0;i<this.width;i++){const value=Number(spectrum?.[i]);this.row[i]=Math.round(Math.max(0,Math.min(1,Number.isFinite(value)?value:0))*255);}
    if(this.clock===null){this.clock=clock;this.data.set(this.row,this.head*this.width);this.version++;return true;}
    const elapsed=clock-this.clock;this.clock=clock;
    // Hidden windows and seeks do not synthesize seconds of missing sound.
    if(elapsed<0||elapsed>.25){this.accumulator=0;return false;}
    this.accumulator+=elapsed;let changed=false;
    while(this.accumulator>=1/30){this.accumulator-=1/30;this.head=(this.head+1)%this.height;this.data.set(this.row,this.head*this.width);changed=true;}
    if(changed)this.version++;return changed;
  }
}

// Playback changes targets, not the lifetime of the existing Flux field.
export class FluxMotion {
  constructor(){this.clock=null;this.time=0;this.phase=0;this.historyClock=0;this.activity=0;this.roles=new Float32Array(4);this.spectrum=new Float32Array(48);this.lights=new Float32Array(48);this.palette=new Float32Array(18);this.initialized=false;this.transition=2;}
  suspend(){this.clock=null;}
  beginTrack(){this.transition=0;}
  update(clock,{active=true,hold=false,reduced=false,movement=1,spectrum,lights,roles={},palette}={}){
    this.dt=0;
    if(!Number.isFinite(clock))return this;
    const dt=this.clock===null?0:clock-this.clock;this.clock=clock;
    if(!this.initialized){if(palette?.length===18)this.palette.set(palette);this.initialized=true;}
    if(hold||reduced||dt<=0||dt>.25)return this;
    this.dt=dt;this.time+=dt;this.transition+=dt;
    const ease=(a,b,t)=>a+(b-a)*(1-Math.exp(-dt/t)),level=x=>Math.max(0,Math.min(1,Number(x)||0));
    this.activity=ease(this.activity,active?1:0,active?.65:1.1);
    const smoothing=active?(this.transition<1.4?.65:.075):.75;
    for(let i=0;i<48;i++){this.spectrum[i]=ease(this.spectrum[i],active?level(spectrum?.[i]):0,smoothing);this.lights[i]=ease(this.lights[i],active?level(lights?.[i]):0,smoothing);}
    for(const [i,key]of ['bass','drums','lead','texture'].entries())this.roles[i]=ease(this.roles[i],active?level(roles[key]):0,active?.16:.9);
    if(palette?.length===18)for(let i=0;i<18;i++)this.palette[i]=ease(this.palette[i],Math.max(0,Math.min(2,Number(palette[i])||0)),1.5);
    this.historyClock+=dt*this.activity;
    this.phase+=dt*(.045+this.activity*.55+this.roles[0]*.25+this.roles[1]*.20)*Math.max(0,Math.min(4,movement));
    return this;
  }
}

// Afterglow retains its road, skyline phase and old echoes between songs.
// Audio changes eased targets; a quiet scene keeps a very slow ambient drift.
export class AfterglowMotion extends FluxMotion {
 constructor(){super();this.world=new Float64Array(4);this.movement=1;}
 update(clock,options={}){
  super.update(clock,options);if(!this.dt)return this;
  const dt=this.dt,speed=Number.isFinite(options.movement)?Math.max(0,Math.min(4,options.movement)):1;
  this.movement+=(speed-this.movement)*(1-Math.exp(-dt/.6));
  const energy=this.roles[0]*.45+this.roles[1]*.30+this.roles[2]*.25,coast=.025+this.activity*.975;
  const rates=[.45+energy*.55,1.4+energy*3.2,.15+energy*.35,.16+energy*.2];
  for(let i=0;i<4;i++)this.world[i]+=dt*rates[i]*this.movement*coast;
  this.historyClock+=dt*.02*(1-this.activity);return this;
 }
}
