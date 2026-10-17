package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class DownloadFailuresTest {
    private JSONObject song(String key,String video){return Json.object("key",key,"youtubeId",video,"type","youtube","selected",true);}
    @Test public void skipIsSavedAndDeselectedAcrossDuplicateSources() throws Exception {
        JSONObject a=song("a:0","AAAAAAAAAAA"),b=song("b:0","AAAAAAAAAAA"),c=song("a:1","BBBBBBBBBBB");
        JSONArray original=new JSONArray().put(a).put(b).put(c),marked=DownloadFailures.mark(original,a,"Private",123);
        assertFalse(marked.getJSONObject(0).getBoolean("selected"));assertFalse(marked.getJSONObject(1).getBoolean("selected"));assertTrue(marked.getJSONObject(2).getBoolean("selected"));assertTrue(a.getBoolean("selected"));
        JSONArray reopened=new JSONArray(marked.toString());assertEquals("Private",reopened.getJSONObject(1).getString("skipReason"));
    }
    @Test public void refreshedOrderRetainsFailureByRecordingNotIndex() throws Exception {
        JSONObject old=song("a:0","AAAAAAAAAAA");JSONArray failed=DownloadFailures.mark(new JSONArray().put(old),old,"Unavailable",123);
        JSONArray next=DownloadFailures.preserve(failed,new JSONArray().put(song("a:0","BBBBBBBBBBB")).put(song("a:9","AAAAAAAAAAA")));
        assertFalse(next.getJSONObject(0).has("skipReason"));assertEquals("Unavailable",next.getJSONObject(1).getString("skipReason"));assertFalse(next.getJSONObject(1).getBoolean("selected"));
    }
    @Test public void spotifyFailureKeepsAttemptedRecordingForRetry() throws Exception {
        JSONObject entry=Json.object("key","s:0","type","spotify","spotifyId","spotify:track:abc","youtubeId",""),attempt=new JSONObject(entry.toString()).put("youtubeId","AAAAAAAAAAA");
        JSONObject marked=DownloadFailures.mark(new JSONArray().put(entry),attempt,"Restricted",123).getJSONObject(0);assertEquals("AAAAAAAAAAA",marked.getString("failedVideoId"));
        assertEquals("Restricted",DownloadFailures.preserve(new JSONArray().put(marked),new JSONArray().put(entry)).getJSONObject(0).getString("skipReason"));
    }
    @Test public void recordingRestrictionsAnd403CanBeSkipped(){assertFalse(DownloadFailures.pausesBatch("ERROR: Video unavailable"));assertFalse(DownloadFailures.pausesBatch("HTTP Error 403: Forbidden"));assertFalse(DownloadFailures.pausesBatch("Sign in to confirm your age"));}
    @Test public void systemicFailuresPauseInsteadOfSkippingWholeLibrary(){for(String s:new String[]{"HTTP Error 429","Sign in to confirm you’re not a bot","Connection timed out","No space left on device","Permission denied","ffmpeg not found"})assertTrue(s,DownloadFailures.pausesBatch(s));}
}
