import {SongDirector,directedAppearance} from './song-analysis.js';
import {KaleidoscopeBlend} from './kaleidoscope.js';
import {SceneCamera} from './scene-camera.js';
import {SceneReveal} from './scene-reveal.js';
import {VisualSyncBuffer,resolveVisualSync,visualSyncPreferences} from './visual-sync.js';
import {resolvedFrameRate} from './display-settings.js';
import {AtmosphereTransition,AtmosphereDrift} from './atmosphere-transition.js';
import {CharacterMixer} from './track-character.js';
import {TempoTracker} from './tempo.js';
import {SoundRoles} from './sound-roles.js';
import {visualDefaults} from './visual-settings.js';
import { SCENES } from './scene-catalog.js';
import { AudioFeatures, BANDS } from './analysis.js';
import { GPUScene } from './gpu-scene.js';
import { VisualDynamics } from './visual-dynamics.js';
import { VisualConductor } from './visual-conductor.js';
import { Inertia } from './inertia.js';
import { PaletteMixer } from './artwork-palette.js?v=2';
import { drawClassic } from './classic-scenes.js';
export class Reactor {
  constructor(audio){this.camera=new SceneCamera();this.character=new CharacterMixer();this.tempo=new TempoTracker();this.roles=new SoundRoles();this.appearance=visualDefaults();this.backgroundClock=0;this.speedMotion=new Inertia(1,1.5);this.audio=audio;this.context=null;this.mode='eclipse';this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;this.quality='auto';this.intensity=.85;this.meters=true;this.frozen=false;this.running=false;this.last=0;this.clock=0;this.rawFeatures=new AudioFeatures();this.features=this.rawFeatures;this.visualSync=new VisualSyncBuffer();this.syncPreferences=visualSyncPreferences();this.dynamics=new VisualDynamics();this.dynamicVisuals=true;this.scale=1;this.slowFrames=0;this.fastFrames=0;this.frameAverage=16;this.fps=0;this.meterAt=0;}
  get audioActive(){return this.desktopSource?true:!this.audio.paused&&!this.audio.ended;}
  get reactiveActive(){return this.visualSync?.active??this.audioActive;}
  setVisualSync(prefs){this.syncPreferences=visualSyncPreferences(prefs);this.refreshVisualSync(true);}
  refreshVisualSync(force=false,time=performance.now()){
    if(!force&&time<(this.syncCheckedAt??-Infinity)+500)return;this.syncCheckedAt=time;
    const status=resolveVisualSync(this.context,this.syncPreferences,!!this.desktopSource,this.outputDevice);
    // Ignore tiny fluctuations in the reported device estimate. Explicit user
    // adjustments still apply at one millisecond precision.
    if((force||Math.abs(status.delayMs-this.visualSync.delayMs)>=5)&&status.delayMs!==this.visualSync.delayMs)this.visualSync.setDelay(status.delayMs);
    status.delayMs=this.visualSync.delayMs;this.visualSyncStatus=status;this.onVisualSyncChange?.();
  }
  syncAnalysis(time){
    this.refreshVisualSync(false,time);
    this.features=this.visualSync.process(this.rawFeatures,this.audioActive,time,this.wave);
    this.visualWave=this.visualSync.delayMs?this.features.wave:this.wave;
  }
  setDesktopStream(stream){
    if(!stream&&!this.desktopSource)return;
    this.desktopSource?.disconnect();this.desktopSource=stream?this.context.createMediaStreamSource(stream):null;
    this.eq(this.eqValues||[0,0,0]);this.resetAnalysis();this.refreshVisualSync(true);this.needsFrame=true;
  }
  async connect(){
    if(!this.context){const C=window.AudioContext||window.webkitAudioContext;this.context=new C({latencyHint:'playback'});this.source=this.context.createMediaElementSource(this.audio);this.analyser=this.context.createAnalyser();this.analyser.fftSize=8192;this.analyser.smoothingTimeConstant=0;this.analyser.minDecibels=-100;this.analyser.maxDecibels=-10;
      this.filters=[['lowshelf',150],['peaking',1000],['highshelf',5000]].map(([type,frequency])=>{const f=this.context.createBiquadFilter();f.type=type;f.frequency.value=frequency;f.gain.value=0;return f;});this.midAnalyser=this.context.createAnalyser();this.midAnalyser.fftSize=2048;this.midAnalyser.smoothingTimeConstant=0;this.fastAnalyser=this.context.createAnalyser();this.fastAnalyser.fftSize=1024;this.fastAnalyser.smoothingTimeConstant=0;this.midFreq=new Float32Array(1024);this.fastFreq=new Float32Array(512);this.freq=new Float32Array(this.analyser.frequencyBinCount);this.wave=new Float32Array(this.fastAnalyser.fftSize);this.freq.fill(-100);this.eq(this.eqValues||[0,0,0]);
    }if(this.context.state==='suspended')await this.context.resume();this.refreshVisualSync(true);
  }
  setPlaybackGain(db,{immediate=false}={}){
    const changed=db!==this.playbackDb;this.playbackDb=db;if(!this.context?.createGain)return;
    const fresh=!this.levelGain;this.levelGain??=this.context.createGain();if(!fresh&&!changed&&!immediate)return;
    const gain=this.levelGain.gain,now=this.context.currentTime,target=10**(db/20);
    if(fresh||immediate){gain.cancelScheduledValues(now);gain.setValueAtTime(target,now);}
    else{if(gain.cancelAndHoldAtTime)gain.cancelAndHoldAtTime(now);else{const value=gain.value;gain.cancelScheduledValues(now);gain.setValueAtTime(value,now);}gain.setTargetAtTime(target,now,.35);}
  }
  setTransitionGain(value,seconds=0){this.transitionValue=value;if(!this.context?.createGain)return;this.fadeGain??=this.context.createGain();const now=this.context.currentTime;this.fadeGain.gain.cancelScheduledValues(now);this.fadeGain.gain.setValueAtTime(this.fadeGain.gain.value,now);if(seconds)this.fadeGain.gain.linearRampToValueAtTime(value,now+seconds);else this.fadeGain.gain.setValueAtTime(value,now);}
  selectVisualTrack({id,profile,character,session}){
    this.songId=id;this.songProfile=profile;this.character.select(character,session);
    this.songDirector??=new SongDirector();this.songDirector.select(profile,this.audio.currentTime||0);
    this.visualPending=false;this.needsFrame=true;
  }
  updateSongProfile(id,profile){if(id===this.songId&&!this.visualPending)this.songProfile=profile;}
  visualState(dt){
    const d=this.dynamics.output;
    if(!this.paletteMixer)this.paletteMixer=new PaletteMixer(d.colors);
    if(!this.formMotion)this.formMotion=[d.shape,d.spread,d.flow,d.bloom,this.intensity].map(x=>new Inertia(x,1.1));
    const values=[d.shape,d.spread,d.flow,d.bloom,this.intensity];this.formMotion.forEach(s=>s.seconds=1.1/(this.responsiveness||1));
    const form=this.formMotion.map((spring,i)=>this.frozen?spring.value:spring.update(i<4&&(!this.dynamicVisuals||this.reduced)?spring.value:values[i],dt));
    this.songDirector??=new SongDirector();const direction=this.songDirector.update(this.songProfile,Math.max(0,(this.audio.currentTime||0)-(this.visualSync.delayMs||0)/1000),dt,{enabled:this.autoDirection!==false&&!this.desktopSource,active:this.reactiveActive,frozen:this.visualPending||this.frozen||this.dynamicVisuals===false,reduced:this.reduced});
    const identity=this.character?.update(dt,{direction,amount:this.appearance?.variation,theme:this.visualTheme,enabled:this.autoDirection!==false&&!this.desktopSource,frozen:this.frozen||this.dynamicVisuals===false,reduced:this.reduced});
    if(!this.frozen&&!this.reduced)this.backgroundClock=(this.backgroundClock||0)+dt*this.speedMotion.update((this.appearance?.bgSpeed||1)*(.35+(identity?.character[0]||.5)),dt);
    const colors=this.paletteMixer.update(!this.desktopSource&&this.coverPalette!==false&&this.coverColors?this.coverColors:d.colors,dt,this.frozen);this.atmosphereTransition??=new AtmosphereTransition();const background=this.atmosphereTransition.update(identity,colors,dt,{frozen:this.frozen||this.dynamicVisuals===false,reduced:this.reduced});
    this.backgroundDrift??=new AtmosphereDrift();const backgroundDriftClock=this.backgroundDrift.update(this.backgroundClock,background.identity.recipe[4]);
    this.kaleidoscopeBlend??=new KaleidoscopeBlend();const wasBlending=this.kaleidoscopeBlend.active;
    const kaleidoscopeWeights=this.kaleidoscopeBlend.update(dt,{enabled:this.kaleidoscope===true,mode:this.kaleidoscopeMode,reduced:this.reduced});
    if(wasBlending||this.kaleidoscopeBlend.active)this.needsFrame=true;
    this.visualColors=colors;
    const appearance=directedAppearance(this.appearance,direction);
    return {...d,direction,kaleidoscopeWeights,camera:this.camera.update(dt,{rail:this.rollercoaster,speed:this.cameraSpeed,zoom:this.cameraZoom,features:this.features,reduced:this.reduced,frozen:this.frozen}),cameraFocalLength:this.camera.focalLength,portraitScene:this.portraitScene===true,kaleidoscope:this.kaleidoscope===true,kaleidoscopeMode:this.kaleidoscopeMode,rotationClock:this.clock,background,appearance,identity,backgroundClock:this.backgroundClock,backgroundDriftClock,rhythm:this.tempo?.output,roles:this.roles?.output,shape:form[0],spread:form[1],flow:form[2],bloom:form[3],intensity:form[4],
      colors};
  }
  eq(values){
    this.eqValues=[...values];if(!this.context)return;
    this.source.disconnect();this.desktopSource?.disconnect();this.analysisSink?.disconnect();this.levelGain?.disconnect();this.fadeGain?.disconnect();
    const analysers=[this.analyser,this.midAnalyser,this.fastAnalyser].filter(Boolean);
    analysers.forEach(a=>a.disconnect());this.filters.forEach(f=>f.disconnect());let previous=this.source;
    if(values.some(x=>x!==0))this.filters.forEach((f,i)=>{f.gain.setTargetAtTime(values[i],this.context.currentTime,.05);previous.connect(f);previous=f;});
    this.setPlaybackGain(this.playbackDb||0);this.fadeGain??=this.context.createGain();
    if(this.desktopSource){
      previous.connect(this.levelGain);this.levelGain.connect(this.fadeGain);this.fadeGain.connect(this.context.destination);previous=this.desktopSource;
      for(const analyser of analysers){previous.connect(analyser);previous=analyser;}
      this.analysisSink??=this.context.createGain();this.analysisSink.gain.value=0;
      previous.connect(this.analysisSink);this.analysisSink.connect(this.context.destination);
    }else{
      if(!this.musicOnly)for(const analyser of analysers){previous.connect(analyser);previous=analyser;}
      // Analyse the same signal regardless of leveling or crossfade gain.
      previous.connect(this.levelGain);this.levelGain.connect(this.fadeGain);this.fadeGain.connect(this.context.destination);
    }
  }
  setMusicOnly(enabled){
    enabled=!!enabled;if(this.musicOnly===enabled)return;const returning=this.musicOnly===true&&!enabled;this.musicOnly=enabled;this.paintReturnCue=returning;
    if(enabled)this.sceneReveal?.cancel();else if(returning){this.sceneReveal??=new SceneReveal();this.sceneReveal.begin();}
    if(enabled){
      this.visualSync.clear();this.visualWave=null;this.onVisualSyncChange?.();
      this.running=false;cancelAnimationFrame(this.frameRequest);this.frameRequest=null;
      this.gpu?.dispose();this.gpu=null;
      for(const canvas of document.querySelectorAll('#room-gl,#room-canvas,[data-reactor]')){const empty=canvas.cloneNode(false);empty.width=1;empty.height=1;canvas.replaceWith(empty);}
      this.hadFrame=false;this.previousFrame=0;
    }
    this.eq(this.eqValues||[0,0,0]);
    if(!enabled){this.resetAnalysis();this.last=0;this.frameAverage=1000/(resolvedFrameRate(this.targetFPS,this.displayRefreshRate));this.needsFrame=true;this.start();}
  }
  prepareGraphics(canvas=document.querySelector('#room-gl')){
    if(!this.musicOnly&&!this.gpu&&canvas&&SCENES.some(s=>s.id===this.mode))this.gpu=new GPUScene(canvas);
  }
  setSceneSuspended(enabled){
    this.sceneSuspended=!!enabled;
    if(enabled){this.running=false;cancelAnimationFrame(this.frameRequest);this.frameRequest=null;}
    else{this.last=0;this.previousFrame=0;this.needsFrame=true;this.start();}
    document.dispatchEvent(new Event('resonance-scene-visibility'));
  }
  start(){
    if(this.running||this.musicOnly||this.deferStart||this.sceneSuspended)return;this.running=true;
    const draw=time=>{if(!this.running||this.musicOnly||this.sceneSuspended)return;this.frameRequest=requestAnimationFrame(draw);
      // Present the return cue before creating a graphics context or compiling shaders.
      if(this.paintReturnCue){this.paintReturnCue=false;return;}
      this.observeDisplayFrame?.(time);if(document.hidden){this.last=time;this.previousFrame=0;return;}
      const room=document.querySelector('#listening-room'),inRoom=room&&!room.hidden;
      const target=resolvedFrameRate(this.targetFPS,this.displayRefreshRate),interval=this.kaleidoscopeBlend?.active?(this.reduced?33:1000/target):this.reduced||this.frozen?100:inRoom?(this.targetFPS==='auto'?0:1000/target):33;
      if(time-this.last<interval-.8)return;const dt=Math.min(.1,(time-this.last)/1000||.016);this.last=time;
      if(inRoom&&!this.reduced&&!this.frozen){this.frameAverage=this.frameAverage*.96+Math.min(1000,time-(this.previousFrame||time-16))*.04;this.previousFrame=time;this.fps=Math.round(1000/Math.max(1,this.frameAverage));if(this.quality==='auto'&&this.frameAverage>Math.max(1000/(resolvedFrameRate(this.targetFPS,this.displayRefreshRate))*1.55,10)){if(++this.slowFrames>60){this.scale=Math.max(.55,this.scale-.1);this.slowFrames=0;}}else{this.slowFrames=0;if(this.quality==='auto'&&this.frameAverage<1000/(resolvedFrameRate(this.targetFPS,this.displayRefreshRate))*1.15&&this.scale<1){if(++this.fastFrames>240){this.scale=Math.min(1,this.scale+.05);this.fastFrames=0;}}else this.fastFrames=0;}}else this.previousFrame=0;
      if(!this.reduced&&!this.frozen)this.clock+=dt;
      if(this.analyser){this.analyser.getFloatFrequencyData(this.freq);this.midAnalyser?.getFloatFrequencyData(this.midFreq);this.fastAnalyser?.getFloatFrequencyData(this.fastFreq);(this.fastAnalyser||this.analyser).getFloatTimeDomainData(this.wave);this.rawFeatures.update(this.freq,this.wave,this.context.sampleRate,this.analyser.fftSize,dt,time/1000,this.audioActive,{mid:this.midAnalyser?{frequency:this.midFreq,fftSize:2048}:null,fast:this.fastAnalyser?{frequency:this.fastFreq,fftSize:1024}:null});}
      this.syncAnalysis(time);
      this.dynamics.update(this.features,dt,{active:this.reactiveActive,dynamic:this.dynamicVisuals,reduced:this.reduced,frozen:this.frozen});
      this.tempo?.update(dt,this.features.hits,{active:this.reactiveActive,frozen:this.frozen,reduced:this.reduced});
      this.roles?.update(this.features,dt,{active:this.reactiveActive,frozen:this.frozen,response:this.responsiveness??2.5});
      const visual=this.visualState(dt);
      if(inRoom){
        if(!this.conductor)this.conductor=new VisualConductor();
        const response=this.conductor.update(this.features,dt,{active:this.reactiveActive,evolve:this.dynamicVisuals,frozen:this.frozen,reduced:this.reduced,responsiveness:this.responsiveness??2.5,movement:this.appearance?.motionAmount??1});
        visual.particleColor=this.particleColor||'palette';visual.fluidity=this.fluidity??.8;visual.iridescence=this.iridescence??.65;visual.depth=this.depth??.7;visual.spectralDetail=this.spectralDetail??.8;
        const canvas=document.querySelector('#room-canvas'),gpu=document.querySelector('#room-gl'),rect=canvas.getBoundingClientRect();
        const advanced=SCENES.some(s=>s.id===this.mode);let rendered=false;
        if(advanced){this.prepareGraphics(gpu);if(!this.frozen||this.needsFrame||!this.hadFrame||this.gpu.needsFrame)rendered=this.gpu.draw({width:rect.width||room.clientWidth,height:rect.height||room.clientHeight,time:this.reduced?0:response.motion,features:response,dynamics:visual,quality:this.quality,intensity:visual.intensity,scale:this.scale,reduced:this.reduced,hdrMode:this.hdrMode||'auto'});else rendered=this.gpu.ready&&!this.gpu.failed&&!this.gpu.lost;}
        const preparing=advanced&&!rendered&&!this.gpu.failed;
        gpu.hidden=!advanced||!rendered;canvas.hidden=advanced&&(rendered||preparing);
        if(!canvas.hidden&&(!this.frozen||this.needsFrame||!this.hadFrame))this.draw2D(canvas,{width:room.clientWidth,height:room.clientHeight},advanced?'orbit':this.mode);
        if(time-this.meterAt>120){this.meterAt=time;this.updateMeters(advanced&&!rendered);}
        if(rendered||!advanced||this.gpu?.failed)this.sceneReveal?.ready(this.reduced);
        this.hadFrame=rendered||!advanced||!!this.gpu?.failed;this.needsFrame=false;
      }else{this.hadFrame=false;const hero=document.querySelector('[data-reactor="hero"]');if(hero){const rect=hero.getBoundingClientRect();if(rect.bottom>0&&rect.top<innerHeight)this.draw2D(hero,rect,'orbit',true);}}
    };this.frameRequest=requestAnimationFrame(draw);
  }
  updateMeters(fallback){
    const hdrStatus=document.querySelector('#hdr-status');if(hdrStatus)hdrStatus.textContent=this.gpu?.output?.description()||'Standard output · graphics fallback';
    const frame=document.querySelector('#audio-meters');if(!frame)return;frame.hidden=!this.meters;document.querySelector('#listening-room').classList.toggle('has-meters',this.meters);
    frame.querySelectorAll('[data-band]').forEach((e,i)=>{e.style.setProperty('--level',this.features.bands[i]);e.setAttribute('aria-valuenow',Math.round(this.features.bands[i]*100));});
    const format=db=>db<=-90?'−∞':db.toFixed(1);
    document.querySelector('#rms-value').textContent=format(this.features.db);
    document.querySelector('#peak-value').textContent=format(this.features.peakDb);
    document.querySelector('#visual-status').textContent=fallback?'Orbital fallback · graphics unavailable':this.frozen?'Visual paused':this.reduced?'Reduced motion':`${this.quality==='eco'?'Low power':this.quality==='high'?'High detail':'Adaptive detail'} · ${Math.min(resolvedFrameRate(this.targetFPS,this.displayRefreshRate),this.fps||60)} fps${!this.audioActive?' · ambient drift':''}`;
    const mood=document.querySelector('#visual-mood');if(mood)mood.textContent=this.reduced?'Reduced motion · steady geometry':this.dynamics.output.label;const note=document.querySelector('#visual-note');if(note)note.textContent=SCENES.find(s=>s.id===this.mode)?.note||'';
    const tempo=document.querySelector('#tempo-status');if(tempo){const t=this.tempo.output;tempo.textContent=t.confidence>.4?'≈ '+Math.round(t.bpm)+' BPM · '+(t.confidence>.75?'steady estimate':'forming estimate'):'Listening for a steady beat';}
    for(const [key,value]of Object.entries(this.roles.output)){const el=document.querySelector('[data-role-meter="'+key+'"]');if(el)el.value=value;}
    const palette=document.querySelector('#palette-status');if(palette){palette.textContent=this.coverPalette===false?'Music colors':this.coverStatus||'No cover · music colors';palette.style.setProperty('--cover-color',`rgb(${this.visualState(0).colors[0].map(x=>Math.round(x*255)).join(' ')})`);}
  }
  draw2D(canvas,rect,mode,hero=false){drawClassic(canvas,rect,mode,hero,this);}
  resetAnalysis(){
    this.rawFeatures=new AudioFeatures();this.features=this.rawFeatures;this.visualSync?.clear();this.visualWave=null;
    // Forget the old audio evidence, not the rendered pose. Abruptly zeroing these
    // envelopes made the sculpture shrink on every seek before growing again.
    if(this.tempo){const pose={phase:this.tempo.phase,pulse:this.tempo.pulse};this.tempo.reset();Object.assign(this.tempo,pose);Object.assign(this.tempo.output,pose);}
    if(this.roles)this.roles.previous={};
  }
}
