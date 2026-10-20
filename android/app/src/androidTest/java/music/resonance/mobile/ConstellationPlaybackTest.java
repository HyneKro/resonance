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

/** Requires a disposable device installation, as it adds test tones to the library. */
@RunWith(AndroidJUnit4.class)
public class ConstellationPlaybackTest {
 @Test public void insertingJourneyPreservesCurrentItemPositionAndPause() throws Exception {
  ResonanceApp app=(ResonanceApp)InstrumentationRegistry.getInstrumentation().getTargetContext().getApplicationContext();
  app.library.updatePreferences(Json.object("musicOnly",true,"sfx",false,"leveling",false));JSONArray ids=new JSONArray();
  byte[] tone;try(InputStream in=InstrumentationRegistry.getInstrumentation().getContext().getAssets().open("playback-tone.m4a")){tone=in.readAllBytes();}
  for(int i=0;i<5;i++){File file=new File(app.library.music,"journey-test-"+System.nanoTime()+".m4a");Files.write(file.toPath(),tone);JSONObject t=app.library.readAudio(Uri.fromFile(file),file.getName(),file.length(),file.lastModified(),"test",i,null);app.library.save(t);ids.put(t.optString("id"));}
  try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
   long deadline=System.currentTimeMillis()+20000;while(PlaybackService.instance==null&&System.currentTimeMillis()<deadline)Thread.sleep(50);assertNotNull(PlaybackService.instance);
   var prepared=PlaybackService.prepareQueue(ids);
   var journey=PlaybackService.prepareQueue(new JSONArray(List.of(ids.optString(1),ids.optString(4),ids.optString(2))));
   var next=PlaybackService.prepareQueue(new JSONArray(List.of(ids.optString(2))));
   app.onMain(()->{
    PlaybackService s=PlaybackService.instance;s.player.setVolume(0);s.loadPrepared(prepared,ids.optString(1),800,false);s.shuffle(true);s.player.setRepeatMode(Player.REPEAT_MODE_ONE);
    String current=s.player.getCurrentMediaItem().mediaId;long position=s.player.getCurrentPosition();
    s.constellationQueue(journey,"after");
    assertEquals(current,s.player.getCurrentMediaItem().mediaId);assertEquals(position,s.player.getCurrentPosition());assertFalse(s.player.getPlayWhenReady());assertFalse(s.player.getShuffleModeEnabled());assertEquals(Player.REPEAT_MODE_ALL,s.player.getRepeatMode());
    assertEquals(new JSONArray(List.of(ids.optString(0),current,ids.optString(4),ids.optString(2))).toString(),s.state().getJSONArray("queue").toString());
    s.constellationQueue(next,"next");assertEquals(ids.optString(2),s.player.getMediaItemAt(s.player.getNextMediaItemIndex()).mediaId);assertEquals(position,s.player.getCurrentPosition());assertEquals(4,s.player.getMediaItemCount());
    s.player.stop();return null;
   });
  }
 }
}
