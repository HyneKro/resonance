package music.resonance.mobile;

import android.net.Uri;
import androidx.media3.common.Player;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.*;
import java.nio.file.Files;
import java.util.*;
import static org.junit.Assert.*;

/** Real native transitions; run only on a disposable test installation. */
@RunWith(AndroidJUnit4.class)
public class ShufflePlaybackTest {
    @Test public void shuffledQueueMatchesAutomaticAndManualTransitions() throws Exception {
        ResonanceApp app=(ResonanceApp)InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationContext();
        app.library.updatePreferences(Json.object("musicOnly",true,"sfx",false));JSONArray ids=new JSONArray();
        byte[] tone;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("playback-tone.m4a")){tone=in.readAllBytes();}
        for(int i=0;i<6;i++){
            File file=new File(app.library.music,"shuffle-test-"+System.nanoTime()+".m4a");Files.write(file.toPath(),tone);
            JSONObject track=app.library.readAudio(Uri.fromFile(file),file.getName(),file.length(),file.lastModified(),"test",i,null);app.library.save(track);ids.put(track.optString("id"));
        }
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            long deadline=System.currentTimeMillis()+20000;while(PlaybackService.instance==null&&System.currentTimeMillis()<deadline)Thread.sleep(50);assertNotNull(PlaybackService.instance);
            var prepared=PlaybackService.prepareQueue(ids);
            JSONObject shuffled=app.onMain(()->{
                PlaybackService s=PlaybackService.instance;s.player.setVolume(0);s.shuffle(false);s.loadPrepared(prepared,ids.optString(2),800,false);
                s.player.setRepeatMode(Player.REPEAT_MODE_ONE);s.shuffle(true);
                assertEquals(ids.optString(2),s.state().optString("id"));assertEquals(800,s.player.getCurrentPosition());
                assertFalse(s.player.getPlayWhenReady());assertEquals(Player.REPEAT_MODE_ALL,s.player.getRepeatMode());return s.state();
            });
            JSONArray order=shuffled.getJSONArray("playbackOrder");assertEquals(ids.length(),order.length());
            assertEquals(ids.optString(2),order.optString(0));assertNotEquals(ids.optString(3),order.optString(1));
            Set<String> visited=new HashSet<>();
            app.onMain(()->{PlaybackService.instance.resume();return null;});
            for(int i=0;i<order.length();i++){
                final String expected=order.optString(i);
                deadline=System.currentTimeMillis()+12000;JSONObject status;
                do{Thread.sleep(50);status=app.onMain(()->PlaybackService.instance.state());}while((!expected.equals(status.optString("id"))||!status.optBoolean("playing"))&&System.currentTimeMillis()<deadline&&status.optString("errorCode").isEmpty());
                assertEquals(status.toString(),expected,status.optString("id"));assertTrue(status.optBoolean("playing"));assertTrue(visited.add(expected));
                // Automatic end-of-track must follow the same order, including in the background.
                if(i==0)scenario.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
                if(i<order.length()-1)app.onMain(()->{PlaybackService s=PlaybackService.instance;s.player.seekTo(Math.max(0,s.player.getDuration()-120));return null;});
            }
            app.onMain(()->{
                PlaybackService s=PlaybackService.instance;s.player.pause();s.playQueued(order.optString(1),0);s.player.pause();
                assertEquals(order.toString(),s.state().getJSONArray("playbackOrder").toString());
                s.player.seekToNextMediaItem();assertEquals(order.optString(2),s.state().optString("id"));
                s.player.seekToPreviousMediaItem();assertEquals(order.optString(1),s.state().optString("id"));
                int original=s.player.getCurrentMediaItemIndex();s.shuffle(false);assertEquals(ids.toString(),s.state().getJSONArray("playbackOrder").toString());
                s.player.seekToNextMediaItem();assertEquals(ids.optString((original+1)%ids.length()),s.state().optString("id"));s.player.stop();return null;
            });
        }
    }
}
