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
