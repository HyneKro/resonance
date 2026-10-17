package music.resonance.mobile;
import androidx.media3.common.C;
import androidx.media3.common.audio.BaseAudioProcessor;
import java.nio.*;

/** Fixed per-song gain with a short ramp. Unity is an exact byte copy. */
@androidx.annotation.OptIn(markerClass=androidx.media3.common.util.UnstableApi.class)
public final class LevelingProcessor extends BaseAudioProcessor {
    private record Gain(double value,long track){}
    private volatile Gain target=new Gain(1,0);private long appliedTrack;private double current=1,follow=.00006;
    public void setGain(double value){target=new Gain(value,target.track());}
    public void selectTrack(double value){target=new Gain(value,target.track()+1);}
    @Override protected AudioFormat onConfigure(AudioFormat format)throws UnhandledAudioFormatException{if(format.encoding!=C.ENCODING_PCM_16BIT)throw new UnhandledAudioFormatException(format);follow=1-Math.exp(-1d/(format.sampleRate*format.channelCount*.35));return format;}
    @Override public void queueInput(ByteBuffer input){if(!input.hasRemaining())return;ByteBuffer out=replaceOutputBuffer(input.remaining());Gain setting=target;double goal=Math.max(0,Math.min(16,setting.value()));if(appliedTrack!=setting.track()){appliedTrack=setting.track();current=goal;}if(goal==1&&Math.abs(current-1)<1e-5){current=1;out.put(input);}else{input.order(ByteOrder.LITTLE_ENDIAN);out.order(ByteOrder.LITTLE_ENDIAN);while(input.remaining()>=2){current+=(goal-current)*follow;int sample=(int)Math.round(input.getShort()*current);out.putShort((short)Math.max(-32768,Math.min(32767,sample)));}}out.flip();}
    @Override protected void onFlush(){Gain setting=target;current=Math.max(0,Math.min(16,setting.value()));appliedTrack=setting.track();}
}
