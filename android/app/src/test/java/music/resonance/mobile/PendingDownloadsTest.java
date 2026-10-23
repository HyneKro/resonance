package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class PendingDownloadsTest {
    private JSONObject song(String source,String key){return Json.object("key",key,"sourceId",source,"youtubeId","AAAAAAAAAAA","selected",true);}
    private JSONArray sources(String... ids){JSONArray out=new JSONArray();for(String id:ids)out.put(Json.object("id",id));return out;}
    @Test public void removalClearsReadyAndSkippedRowsWithoutTouchingOtherSources() throws Exception {
        JSONArray original=new JSONArray().put(song("gone","gone:0")).put(song("kept","kept:0")).put(song("gone","gone:1").put("skipReason","Unavailable"));JSONArray clean=PendingDownloads.retain(original,sources("kept"));assertEquals(1,clean.length());assertEquals("kept:0",clean.getJSONObject(0).getString("key"));assertEquals(3,original.length());
    }
    @Test public void oldOrphansAreRemovedWhenRestoredAndLateScansCannotReinsertThem() throws Exception {
        JSONArray old=new JSONArray(new JSONArray().put(song("gone","gone:0")).toString());assertEquals(0,PendingDownloads.retain(old,sources("kept")).length());assertFalse(PendingDownloads.connected(sources("kept"),"gone"));
        JSONArray late=new JSONArray().put(song("kept","kept:1")).put(song("gone","gone:2"));assertEquals(1,PendingDownloads.retain(late,sources("kept")).length());
    }
    @Test public void storedJobKeepsOperationAndOtherDownloadsAfterRemoval() throws Exception {
        JSONArray selections=new JSONArray().put(Json.object("key","gone:0")).put(Json.object("key","kept:0"));JSONObject job=Json.object("kind","download","operation",123,"data",Json.object("selected",selections));
        JSONObject clean=PendingDownloads.job(job,new JSONArray().put(song("kept","kept:0")));assertEquals(123,clean.getInt("operation"));assertEquals("kept:0",clean.getJSONObject("data").getJSONArray("selected").getJSONObject(0).getString("key"));assertEquals(2,job.getJSONObject("data").getJSONArray("selected").length());
    }
}
