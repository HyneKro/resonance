package music.resonance.mobile;
import androidx.media3.common.C;
import androidx.media3.common.audio.BaseAudioProcessor;
import java.nio.*;

/** Fixed per-song gain with a short ramp. Unity is an exact byte copy. */
@androidx.annotation.OptIn(markerClass=androidx.media3.common.util.UnstableApi.class)
public final class LevelingProcessor extends BaseAudioProcessor {
    public volatile double target=1;private double current=1,follow=.00006;
    @Override protected AudioFormat onConfigure(AudioFormat format)throws UnhandledAudioFormatException{if(format.encoding!=C.ENCODING_PCM_16BIT)throw new UnhandledAudioFormatException(format);follow=1-Math.exp(-1d/(format.sampleRate*format.channelCount*.35));return format;}
    @Override public void queueInput(ByteBuffer input){if(!input.hasRemaining())return;ByteBuffer out=replaceOutputBuffer(input.remaining());double goal=Math.max(0,Math.min(2,target));if(goal==1&&Math.abs(current-1)<1e-5){current=1;out.put(input);}else{input.order(ByteOrder.LITTLE_ENDIAN);out.order(ByteOrder.LITTLE_ENDIAN);while(input.remaining()>=2){current+=(goal-current)*follow;int sample=(int)Math.round(input.getShort()*current);out.putShort((short)Math.max(-32768,Math.min(32767,sample)));}}out.flip();}
    @Override protected void onFlush(){current=Math.max(0,Math.min(2,target));}
}
