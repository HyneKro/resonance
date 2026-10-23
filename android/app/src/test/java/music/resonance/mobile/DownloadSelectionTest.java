package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.IOException;

public class DownloadSelectionTest {
    @Test public void restoresLargeCollectionsFromCompactChoices() throws Exception {
        JSONArray preview=new JSONArray(),choices=new JSONArray();
        for(int i=0;i<2532;i++){String key="source:"+i;preview.put(new JSONObject().put("key",key).put("youtubeId","AbCdEf123_-").put("type","youtube").put("title","a".repeat(500)).put("playlistIndex",i+1));choices.put(new JSONObject().put("key",key).put("youtubeId","AbCdEf123_-"));}
        assertTrue(preview.toString().length()>1_000_000);assertTrue(choices.toString().length()<200_000);
        JSONArray result=DownloadSelection.resolve(choices,preview);assertEquals(2532,result.length());assertEquals(2532,result.getJSONObject(2531).getInt("playlistIndex"));assertEquals(500,result.getJSONObject(0).getString("title").length());
    }
    @Test public void rejectsStaleSelections() {assertThrows(IOException.class,()->DownloadSelection.resolve(new JSONArray().put(new JSONObject().put("key","old")),new JSONArray()));}
    @Test public void preservesSpotifyChoiceWithoutMutatingPreview() throws Exception {JSONObject original=new JSONObject().put("key","s:1").put("type","spotify").put("youtubeId","AbCdEf123_-").put("title","Song");JSONArray chosen=DownloadSelection.resolve(new JSONArray().put(new JSONObject().put("key","s:1").put("youtubeId","AbCdEf123_-")),new JSONArray().put(original));assertEquals("AbCdEf123_-",chosen.getJSONObject(0).getString("youtubeId"));assertNotSame(original,chosen.getJSONObject(0));}
    @Test public void staleRemovedChoiceCannotBlockAnotherPlaylist() throws Exception {JSONObject kept=new JSONObject().put("key","kept:0").put("type","spotify").put("youtubeId","AbCdEf123_-");JSONArray chosen=DownloadSelection.resolve(new JSONArray().put(new JSONObject().put("key","gone:0")).put(new JSONObject().put("key","kept:0")),new JSONArray().put(kept));assertEquals(1,chosen.length());assertEquals("kept:0",chosen.getJSONObject(0).getString("key"));}
    @Test public void youtubeChoiceMustMatchSavedPreview() throws Exception {JSONObject item=new JSONObject().put("key","s:1").put("type","youtube").put("youtubeId","AbCdEf123_-");assertThrows(IOException.class,()->DownloadSelection.resolve(new JSONArray().put(new JSONObject().put("key","s:1").put("youtubeId","aaaaaaaaaaa")),new JSONArray().put(item)));}
}
