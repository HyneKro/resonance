package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.IOException;

public class PlaylistScanTest {
    private JSONObject playlist(int loaded,int total) throws Exception {JSONArray entries=new JSONArray();for(int i=0;i<loaded;i++)entries.put(new JSONObject().put("id","track"+i));return new JSONObject().put("entries",entries).put("playlist_count",total);}
    @Test public void rejectsTheReported101Of2532Regression() throws Exception {IOException error=assertThrows(IOException.class,()->PlaylistScan.completeEntries(playlist(101,2532),""));assertTrue(error.getMessage().contains("101 of 2532"));}
    @Test public void retainsAll2532Entries() throws Exception {assertEquals(2532,PlaylistScan.completeEntries(playlist(2532,2532),"").length());}
    @Test public void paginationWarningsNeverLookLikeSuccess() throws Exception {assertThrows(IOException.class,()->PlaylistScan.completeEntries(playlist(100,100),"WARNING: Incomplete data received"));}
    @Test public void unknownCountsAndUnavailablePlaceholdersRemainValid() throws Exception {JSONObject p=playlist(2,-1);p.getJSONArray("entries").put(JSONObject.NULL);assertEquals(3,PlaylistScan.completeEntries(p,"WARNING: Unavailable videos are hidden").length());}
    @Test public void missingListIsAnError(){assertThrows(IOException.class,()->PlaylistScan.completeEntries(new JSONObject(),""));}
}
