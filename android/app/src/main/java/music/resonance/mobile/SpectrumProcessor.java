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
        float[] samples=new float[8192];synchronized(ring){for(int i=0;i<samples.length;i++)samples[i]=ring[(cursor+i)%ring.length];}
        JSONArray wave=new JSONArray();for(int i=samples.length-1024;i<samples.length;i++)wave.put(Math.round(samples[i]*32767));
        cached=Json.object("rate",rate,"long",fft(samples,8192),"mid",fft(samples,2048),"fast",fft(samples,1024),"wave",wave,"at",now);return cached;
    }
    static JSONArray fft(float[] samples,int n){
        double[] re=new double[n],im=new double[n];for(int i=0;i<n;i++)re[i]=samples[samples.length-n+i]*(.5-.5*Math.cos(2*Math.PI*i/(n-1)));
        for(int i=1,j=0;i<n;i++){int bit=n>>1;for(; (j&bit)!=0;bit>>=1)j^=bit;j^=bit;if(i<j){double tmp=re[i];re[i]=re[j];re[j]=tmp;}}
        for(int size=2;size<=n;size<<=1){double a=-2*Math.PI/size;for(int start=0;start<n;start+=size)for(int k=0;k<size/2;k++){double co=Math.cos(a*k),si=Math.sin(a*k);int p=start+k,q=p+size/2;double tr=co*re[q]-si*im[q],ti=co*im[q]+si*re[q];re[q]=re[p]-tr;im[q]=im[p]-ti;re[p]+=tr;im[p]+=ti;}}
        JSONArray result=new JSONArray();for(int i=0;i<n/2;i++){double power=Math.hypot(re[i],im[i])*4/n;result.put((int)Math.round(Math.max(-100,Math.min(0,20*Math.log10(Math.max(1e-7,power))))));}return result;
    }
}
