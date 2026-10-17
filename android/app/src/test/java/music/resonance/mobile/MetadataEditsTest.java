package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
public class MetadataEditsTest {
    @Test public void onlyChosenFieldsChangeAndUndoSnapshotDoesNotMutate(){JSONObject track=Json.object("title","Song","artist","Channel","genre","Personal","metadataLocks",Json.object("genre",true),"plays",12);JSONObject before=MetadataEdits.snapshot(track);JSONObject candidate=Json.object("title","Different","artist","Actual artist","genre","Rock");MetadataEdits.apply(track,MetadataEdits.choose(candidate,new JSONArray().put("artist")));assertEquals("Song",track.optString("title"));assertEquals("Personal",track.optString("genre"));assertEquals("Actual artist",track.optString("artist"));assertEquals(12,track.optInt("plays"));assertFalse(before.optJSONObject("metadataLocks").optBoolean("artist"));assertTrue(track.optJSONObject("metadataLocks").optBoolean("artist"));}
    @Test public void clearingAFieldIsAlsoAProtectedChoice(){JSONObject t=Json.object("album","Wrong album");MetadataEdits.apply(t,Json.object("album",""));assertEquals("",t.optString("album"));assertTrue(t.optJSONObject("metadataLocks").optBoolean("album"));}
    @Test public void emptyAndUnknownSelectionsAreRejected(){for(JSONArray fields:new JSONArray[]{new JSONArray(),new JSONArray().put("path")})try{MetadataEdits.choose(Json.object("path","bad"),fields);fail("Invalid fields accepted");}catch(IllegalArgumentException expected){}}
}
