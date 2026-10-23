package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.io.*;
import java.util.concurrent.atomic.*;
import static org.junit.Assert.*;

public class CatalogMatchesTest {
    private JSONObject song(){return Json.object("key","s:0","sourceId","s","type","spotify","spotifyId","spotify:track:one","title","All Blues","artist","Miles Davis","duration",692,"selected",false,"youtubeId","");}
    private JSONObject recording(String id,String title,String artist,int duration){return Json.object("id",id,"title",title,"channel",artist,"duration",duration);}
    private JSONArray results(){return new JSONArray().put(recording("BBBBBBBBBBB","All Blues (Live)","Miles Davis",692)).put(recording("AAAAAAAAAAA","Miles Davis - All Blues (Official Audio)","Miles Davis - Topic",693)).put(recording("CCCCCCCCCCC","All Blues","Another artist",692));}
    @Test public void searchesAutomaticallyAndOffersBestRecordingWithoutSelectingIt() throws Exception {
        AtomicInteger calls=new AtomicInteger();JSONObject cache=new JSONObject(),item=song();JSONObject result=CatalogMatches.find(item,cache,1000,query->{calls.incrementAndGet();assertEquals("ytsearch3:Miles Davis All Blues audio",query);return results();},()->false);
        assertEquals(1,calls.get());assertEquals("AAAAAAAAAAA",result.getString("youtubeId"));assertEquals(100,result.getInt("matchScore"));assertFalse(result.getBoolean("selected"));assertEquals("",item.getString("youtubeId"));assertTrue(result.getString("matchedTitle").contains("Official Audio"));
        assertEquals(3,CatalogMatches.cached(item,cache,1001).length());
    }
    @Test public void cachesSearchesAcrossPlaylistsButNotAcrossProvidersOrChangedMetadata() throws Exception {
        AtomicInteger calls=new AtomicInteger();CatalogMatches.Search search=query->{calls.incrementAndGet();return results();};JSONObject cache=new JSONObject(),item=song();
        CatalogMatches.find(item,cache,1000,search,()->false);item.put("sourceId","other").put("key","other:3");CatalogMatches.find(item,cache,1001,search,()->false);assertEquals(1,calls.get());
        item.put("title","Another song");CatalogMatches.find(item,cache,1002,search,()->false);assertEquals(2,calls.get());
        item.put("type","deezer").put("deezerId","one");CatalogMatches.find(item,cache,1003,search,()->false);assertEquals(3,calls.get());
        CatalogMatches.find(item,cache,1003+8L*86400000,search,()->false);assertEquals(4,calls.get());
    }
    @Test public void versionsAndCreditAreRankedLikePcAndInvalidResultsAreRejected() throws Exception {
        JSONArray ranked=CatalogMatches.rank(song(),results());assertEquals("AAAAAAAAAAA",ranked.getJSONObject(0).getString("id"));assertEquals(100,ranked.getJSONObject(0).getInt("score"));assertTrue(ranked.getJSONObject(1).getInt("score")<100);
        JSONArray bad=new JSONArray().put(JSONObject.NULL).put(recording("bad","All Blues","Miles Davis",692)).put(recording("DDDDDDDDDDD","All Blues","Miles Davis",0)).put(recording("EEEEEEEEEEE","All Blues","Miles Davis",692).put("is_live",true));assertEquals(0,CatalogMatches.rank(song(),bad).length());
    }
    @Test public void primaryArtistAndUnicodeTitlesFollowPcSearchNormalization() throws Exception {
        JSONObject item=song().put("artist","Mø, Second Artist").put("title","Écho").put("duration",210);JSONArray ranked=CatalogMatches.rank(item,new JSONArray().put(recording("AAAAAAAAAAA","Mø - Écho (Official Video)","Mø",210)));assertEquals(100,ranked.getJSONObject(0).getInt("score"));
    }
    @Test public void cancellationOrSourceRemovalCannotCacheOrExposeLateResults() throws Exception {
        JSONObject cache=new JSONObject();AtomicBoolean removed=new AtomicBoolean();AtomicInteger calls=new AtomicInteger();
        assertThrows(InterruptedIOException.class,()->CatalogMatches.find(song(),cache,1000,q->{calls.incrementAndGet();return results();},()->true));assertEquals(0,calls.get());
        assertThrows(InterruptedIOException.class,()->CatalogMatches.find(song(),cache,1000,q->{removed.set(true);return results();},removed::get));assertEquals(0,cache.length());
    }
    @Test public void failedOrEmptySearchLeavesSongAvailableForManualSearch() throws Exception {
        JSONObject cache=new JSONObject();assertThrows(IOException.class,()->CatalogMatches.find(song(),cache,1000,q->{throw new IOException("HTTP Error 429");},()->false));assertEquals(0,cache.length());
        JSONObject unmatched=CatalogMatches.find(song(),cache,1000,q->new JSONArray(),()->false);assertEquals("",unmatched.getString("youtubeId"));assertFalse(unmatched.getBoolean("selected"));
    }
}
