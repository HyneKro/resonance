package music.resonance.mobile;

import android.net.Uri;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.*;
import java.nio.file.Files;
import static org.junit.Assert.*;

/** Synthetic recordings only. Run on a disposable test installation. */
@RunWith(AndroidJUnit4.class)
public class DownloadedAudioTest {
    @Test public void compressedDownloadsRepairPathsAndRetryAfterFileFailure() throws Exception {
        ResonanceApp app=(ResonanceApp)InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationContext();
        app.library.updatePreferences(Json.object("musicOnly",true,"sfx",false));
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            long deadline=System.currentTimeMillis()+20000;
            while(PlaybackService.instance==null&&System.currentTimeMillis()<deadline)Thread.sleep(50);
            assertNotNull(PlaybackService.instance);
            for(String ext:new String[]{"opus","m4a"}){
                File saved=new File(app.library.music,"instrumentation-download-"+System.nanoTime()+"."+ext);
                byte[] audio;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("playback-tone."+ext)){audio=in.readAllBytes();}
                Files.write(saved.toPath(),audio);
                JSONObject track=app.library.readAudio(Uri.fromFile(saved),saved.getName(),saved.length(),saved.lastModified(),"test",1,Json.object("downloaded",true));
                Json.put(track,"path",Uri.fromFile(new File(app.library.music,"stale/"+saved.getName())).toString());app.library.save(track);
                app.onMain(()->{PlaybackService.instance.load(new JSONArray().put(track.optString("id")),0,0,true);return null;});
                assertPlaying(app,ext+" with an outdated file path");
                assertEquals(Uri.fromFile(saved).toString(),app.library.track(track.optString("id")).optString("path"));
                JSONObject probe=app.library.audioDetails(track.optString("id"));assertTrue(probe.optBoolean("readable"));assertEquals(saved.length(),probe.optLong("actualBytes"));

                // An existing library entry whose file becomes available after a failed attempt.
                File late=new File(app.library.music,"instrumentation-retry-"+System.nanoTime()+"."+ext);
                JSONObject retry=Json.object("id",LibraryStore.id(late.toString()),"title","Retry test","path",Uri.fromFile(late).toString(),"fileName",late.getName(),"downloaded",true);
                app.library.save(retry);app.onMain(()->{PlaybackService.instance.load(new JSONArray().put(retry.optString("id")),0,0,true);return null;});
                deadline=System.currentTimeMillis()+15000;JSONObject status;
                do{Thread.sleep(100);status=app.onMain(()->PlaybackService.instance.state());}while(status.optString("errorCode").isEmpty()&&System.currentTimeMillis()<deadline);
                assertEquals("ERROR_CODE_IO_FILE_NOT_FOUND",status.optString("errorCode"));
                Files.write(late.toPath(),audio);app.onMain(()->{PlaybackService.instance.resume();return null;});
                assertPlaying(app,ext+" retry after a missing file");
                app.onMain(()->{PlaybackService.instance.player.stop();return null;});
            }
        }
    }
    private void assertPlaying(ResonanceApp app,String description) throws Exception {
        long deadline=System.currentTimeMillis()+12000;JSONObject status;
        do{Thread.sleep(100);status=app.onMain(()->PlaybackService.instance.state());}while((!status.optBoolean("playing")||status.optLong("position")<100)&&status.optString("errorCode").isEmpty()&&System.currentTimeMillis()<deadline);
        assertTrue(description+": "+status.optString("errorDetails"),status.optBoolean("playing")&&status.optLong("position")>=100);
    }
}
