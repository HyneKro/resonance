package music.resonance.mobile;
import org.json.JSONObject;
import org.junit.Test;
import static org.junit.Assert.*;
public class TrackLevelTest {
    @Test public void completedAnalysisWaitsForNextPlayAndExplicitToggleStillWorks(){
        JSONObject loud=Json.object("integratedLufs",-8,"truePeakDb",0),quiet=Json.object("integratedLufs",-21,"truePeakDb",-8);
        SongProfile.TrackLevel level=new SongProfile.TrackLevel();
        assertEquals(SongProfile.gain(loud,true),level.select(loud,true),0);
        assertEquals(SongProfile.gain(loud,true),level.update(new JSONObject(),true),0);
        assertEquals(SongProfile.gain(loud,true),level.update(quiet,true),0);
        assertEquals(SongProfile.gain(quiet,true),level.select(quiet,true),0);
        assertEquals(1,level.update(quiet,false),0);
        assertEquals(SongProfile.gain(quiet,true),level.update(quiet,true),0);
        assertEquals(1,level.select(new JSONObject(),true),0);
        assertEquals(1,level.update(loud,true),0);
        assertEquals(SongProfile.gain(loud,true),level.select(loud,true),0);
    }
}
