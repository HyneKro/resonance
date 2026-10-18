package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.nio.file.*;
import java.util.*;
import static org.junit.Assert.*;
public class ArtistCreditsTest {
    @Test public void sourceRefreshDoesNotPromoteSongTitlesOrLoseSelfUploadedFeatures(){
        JSONObject info=Json.object("title","Move - VIP","channel","Aster","artist","Aster","artists",new JSONArray(List.of("Aster","Nova")));
        JSONObject t=Json.object("title","Move - VIP","artist","Aster");GenreResearch.sourceLabels(t,info);assertEquals("Move - VIP",t.optString("title"));assertEquals(List.of("Aster","Nova"),ArtistCredits.names(t));assertEquals("Aster",t.optString("channel"));
        JSONObject locked=Json.object("title","My title","artist","My artist","metadataLocks",Json.object("artist",true,"title",true));GenreResearch.sourceLabels(locked,info);assertEquals("My title",locked.optString("title"));assertEquals("My artist",locked.optString("artist"));
    }
    @Test public void sharedCasesMatchDesktopAndRemainStableAcrossSaves() throws Exception {
        Path file=Path.of("../../tests/fixtures/artist-credits.json");if(!Files.isRegularFile(file))file=Path.of("tests/fixtures/artist-credits.json");
        JSONArray fixtures=new JSONArray(new String(Files.readAllBytes(file),java.nio.charset.StandardCharsets.UTF_8));
        for(int i=0;i<fixtures.length();i++){JSONObject f=fixtures.getJSONObject(i),t=Json.parse(f.getJSONObject("track").toString());ArtistCredits.repair(t);
            assertEquals(f.getString("case"),f.getString("artist"),t.optString("artist"));assertEquals(f.getString("case"),f.getJSONArray("names").toString(),new JSONArray(ArtistCredits.names(t)).toString());assertEquals(f.getString("case"),f.getJSONArray("names").toString(),new JSONArray(GenreResearch.artists(t)).toString());
            assertEquals(ArtistCredits.VERSION,t.optInt("artistCreditVersion"));String once=t.toString();ArtistCredits.repair(t);assertEquals(f.getString("case"),once,t.toString());
        }
    }
    @Test public void repairPreservesPlaybackAndSourceEvidence(){JSONObject t=Json.object("artist","Song","artistBeforeCreditRepair","Aster","artistCreditSource","Upload title","artistCreditVersion",1,"rawTitle","Song - VIP","channel","Aster","recordingArtists",new JSONArray(List.of("Aster")),"plays",13,"favorite",true,"position",75,"genre","Rock");JSONObject before=Json.parse(t.toString());ArtistCredits.repair(t);for(String field:List.of("rawTitle","channel","recordingArtists","plays","favorite","position","genre"))assertEquals(field,before.opt(field).toString(),t.opt(field).toString());assertEquals("Aster",t.optString("artist"));}
}
