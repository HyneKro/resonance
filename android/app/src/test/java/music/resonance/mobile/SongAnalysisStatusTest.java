package music.resonance.mobile;

import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class SongAnalysisStatusTest {
    @Test public void reopeningBeforeAnyAnalysisHasSerializableStatus() throws Exception {
        JSONObject idle=SongAnalysis.jobStatus(Json.object("running",false),false);
        JSONObject restored=new JSONObject(idle.toString());
        assertFalse(restored.getBoolean("running"));
        assertEquals(0,restored.getDouble("progress"),0);
        assertEquals("",restored.getString("id"));
    }
    @Test public void runningAndFinishedJobsKeepFiniteProgress() throws Exception {
        JSONObject active=SongAnalysis.jobStatus(Json.object("id","song","progress",.42),true);
        assertEquals(.42,active.getDouble("progress"),0);
        assertTrue(active.getBoolean("running"));
        assertEquals("song",active.getString("id"));
        for(Object missing:new Object[]{JSONObject.NULL,"NaN","bad"})
            assertEquals(0,SongAnalysis.jobStatus(Json.object("progress",missing),false).getDouble("progress"),0);
        assertEquals(0,SongAnalysis.jobStatus(Json.object("running",false,"id","song"),false).getDouble("progress"),0);
    }
}
