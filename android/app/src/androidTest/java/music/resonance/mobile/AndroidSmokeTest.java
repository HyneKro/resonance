package music.resonance.mobile;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.*;
import java.util.concurrent.*;
import android.net.Uri;
import android.webkit.WebView;
import android.view.ViewGroup;
import org.json.*;

@RunWith(AndroidJUnit4.class)
public class AndroidSmokeTest {
    @Test public void localPlaybackWebBridgeAndBackgroundAudio() throws Exception {
        ResonanceApp app=(ResonanceApp)InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationContext();
        File tone=new File(app.library.music,"instrumentation-tone.wav");int rate=48000,frames=rate*8;ByteBuffer out=ByteBuffer.allocate(44+frames*4).order(ByteOrder.LITTLE_ENDIAN);out.put("RIFF".getBytes()).putInt(36+frames*4).put("WAVEfmt ".getBytes()).putInt(16).putShort((short)1).putShort((short)2).putInt(rate).putInt(rate*4).putShort((short)4).putShort((short)16).put("data".getBytes()).putInt(frames*4);for(int i=0;i<frames;i++){short sample=(short)(Math.sin(i*2*Math.PI*440/rate)*5000);out.putShort(sample).putShort(sample);}try(FileOutputStream f=new FileOutputStream(tone)){f.write(out.array());}
        JSONObject track=app.library.readAudio(Uri.fromFile(tone),tone.getName(),tone.length(),tone.lastModified(),"test",1,null);
        app.library.updatePreferences(Json.object("musicOnly",true,"sfx",false));
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            long deadline=System.currentTimeMillis()+20000;while(PlaybackService.instance==null&&System.currentTimeMillis()<deadline)Thread.sleep(100);assertNotNull("Native playback service binds",PlaybackService.instance);
            boolean ready=false;while(System.currentTimeMillis()<deadline&&!ready){CompletableFuture<String> document=new CompletableFuture<>();scenario.onActivity(a->{WebView w=(WebView)((ViewGroup)((ViewGroup)a.findViewById(android.R.id.content)).getChildAt(0)).getChildAt(0);w.evaluateJavascript("JSON.stringify({ready:!document.getElementById('opening'),title:document.title})",document::complete);});String value=document.get(3,TimeUnit.SECONDS);ready=value.contains("ready\\\":true");if(!ready)Thread.sleep(200);}assertTrue("Web app finishes startup through the native bridge",ready);
            app.onMain(()->{PlaybackService s=PlaybackService.instance;s.spectrum.enabled=true;s.load(new JSONArray().put(track.optString("id")),0,0,true);return null;});Thread.sleep(1800);
            JSONObject state=app.onMain(()->PlaybackService.instance.state());assertTrue("PCM playback progresses",state.optLong("position")>100);assertTrue(state.optBoolean("playing"));
            JSONObject spectrum=PlaybackService.instance.spectrum.snapshot();assertEquals(4096,spectrum.getJSONArray("long").length());assertEquals(1024,spectrum.getJSONArray("wave").length());JSONArray bins=spectrum.getJSONArray("long");int max=1;for(int i=2;i<bins.length();i++)if(bins.getInt(i)>bins.getInt(max))max=i;assertTrue("Native spectrum locates the 440 Hz test tone",Math.abs(max*rate/8192d-440)<8);
            scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);Thread.sleep(1200);assertTrue("Playback survives the activity going into the background",app.onMain(()->PlaybackService.instance.player.isPlaying()));assertFalse("Analysis stops when the activity is backgrounded",PlaybackService.instance.spectrum.enabled);
            app.onMain(()->{PlaybackService.instance.player.pause();return null;});
        }
    }
}
