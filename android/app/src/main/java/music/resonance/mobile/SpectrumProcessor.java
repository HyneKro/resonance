package music.resonance.mobile;

import androidx.media3.common.C;
import androidx.media3.common.audio.BaseAudioProcessor;
import androidx.media3.common.audio.AudioProcessor;
import java.nio.*;
import org.json.*;

/** Copies only analysis samples; the PCM sent to the speaker is unchanged. */
@androidx.annotation.OptIn(markerClass=androidx.media3.common.util.UnstableApi.class)
public final class SpectrumProcessor extends BaseAudioProcessor {
    private final float[] ring=new float[8192];private int cursor,count;private int channels=2,rate=48000;
    public volatile boolean enabled;
    private long lastFrame;private JSONObject cached=Json.object();
    private final float[] samples=new float[8192];
    private SpectrumTransform longWindow,midWindow,fastWindow;
    @Override protected AudioFormat onConfigure(AudioFormat format) throws UnhandledAudioFormatException {
        if(format.encoding!=C.ENCODING_PCM_16BIT)throw new UnhandledAudioFormatException(format);
        channels=format.channelCount;rate=format.sampleRate;return format;
    }
    @Override public void queueInput(ByteBuffer input){
        // Media3 pumps its shared EMPTY_BUFFER while waiting for audio or draining.
        // Before the first allocation, replaceOutputBuffer(0) returns that same
        // buffer, so put(input) would copy it into itself and abort playback.
        // Empty input must also leave any pending output untouched.
        if(!input.hasRemaining())return;
        ByteBuffer output=replaceOutputBuffer(input.remaining());
        if(enabled){ByteBuffer read=input.duplicate().order(ByteOrder.LITTLE_ENDIAN);synchronized(ring){while(read.remaining()>=channels*2){float sample=0;for(int c=0;c<channels;c++)sample+=read.getShort()/32768f;ring[cursor]=sample/channels;cursor=(cursor+1)%ring.length;count=Math.min(ring.length,count+1);}}}
        output.put(input);output.flip();
    }
    @Override protected void onFlush(){synchronized(ring){java.util.Arrays.fill(ring,0);cursor=count=0;}lastFrame=0;}
    public void capture(short[] pcm,int length){rate=48000;if(!enabled)return;synchronized(ring){for(int i=0;i+1<length;i+=2){ring[cursor]=(pcm[i]+pcm[i+1])/65536f;cursor=(cursor+1)%ring.length;count=Math.min(ring.length,count+1);}}}
    public synchronized JSONObject snapshot(){
        long now=android.os.SystemClock.elapsedRealtime();if(!enabled)return Json.object();if(now-lastFrame<28)return cached;lastFrame=now;
        // Prepare plans lazily on the bridge worker, never on playback/startup's main thread.
        if(longWindow==null){longWindow=new SpectrumTransform(8192);midWindow=new SpectrumTransform(2048);fastWindow=new SpectrumTransform(1024);}
        synchronized(ring){int tail=ring.length-cursor;System.arraycopy(ring,cursor,samples,0,tail);System.arraycopy(ring,0,samples,tail,cursor);}
        JSONArray wave=new JSONArray();for(int i=samples.length-1024;i<samples.length;i++)wave.put(Math.round(samples[i]*32767));
        cached=Json.object("rate",rate,"long",longWindow.measure(samples),"mid",midWindow.measure(samples),"fast",fastWindow.measure(samples),"wave",wave,"at",now);return cached;
    }
    static JSONArray fft(float[] samples,int n){
        return new SpectrumTransform(n).measure(samples);
    }
}
