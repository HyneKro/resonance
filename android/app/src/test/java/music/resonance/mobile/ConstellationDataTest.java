package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;
public class ConstellationDataTest {
 @Test public void spatialStateKeepsLegacyBookmarksAndRejectsInvalidDepth() throws Exception {
  JSONObject value=new JSONObject("{\"version\":1,\"positions\":{\"a\":[1,2]},\"space\":{\"a\":[-200,100,300],\"b\":[1,2,\"3\"],\"c\":[0,0,10000]},\"places\":[{\"id\":\"a\",\"name\":\"Home\",\"zoom\":2}]}");
  JSONObject clean=ConstellationData.clean(value,Set.of("a","b","c"));assertEquals(2,clean.getInt("version"));assertEquals(1,clean.getJSONObject("space").length());assertEquals(300,clean.getJSONObject("space").getJSONArray("a").getInt(2));assertEquals("Home",clean.getJSONArray("places").getJSONObject(0).getString("name"));assertEquals(1,clean.getJSONObject("positions").length());
 }
 @Test public void profileMatchesSharedSummaryAndDropsSilentRows() throws Exception {
  JSONObject s=ConstellationData.summarize(new JSONObject("{\"savedAt\":12,\"timeline\":[[0,-100,0,0,0],[1,-20,0.2,0.3,0.4],[2,-10,0.8,0.7,0.6]]}"));
  assertEquals(.5,s.getJSONArray("v").getDouble(0),1e-9);assertEquals(.9,s.getJSONArray("v").getDouble(3),1e-9);assertEquals(.2,s.getDouble("opening"),1e-9);assertEquals(.8,s.getDouble("closing"),1e-9);assertFalse(s.has("timeline"));assertNull(ConstellationData.summarize(new JSONObject()));
 }
 @Test public void savedStateRejectsUnknownSongsAndInvalidCoordinates() throws Exception {
  JSONObject p=new JSONObject("{\"positions\":{\"a\":[10,20],\"b\":[99999,20],\"unknown\":[1,2]},\"colors\":{\"a\":\"#aABB12\",\"b\":\"red\"},\"places\":[{\"id\":\"a\",\"name\":\"Home\",\"zoom\":100},{\"id\":\"x\",\"name\":\"No\"}]}"),out=ConstellationData.clean(p,Set.of("a","b"));
  assertEquals(1,out.getJSONObject("positions").length());assertEquals(1,out.getJSONObject("colors").length());assertEquals(1,out.getJSONArray("places").length());assertEquals(8,out.getJSONArray("places").getJSONObject(0).getDouble("zoom"),0);
 }
 @Test public void routeTailKeepsPlayingItemInPlaceAndQueueValidatesAvailability() throws Exception {
  JSONArray ids=new JSONArray(List.of("now","b","c"));assertEquals("[\"b\",\"c\"]",ConstellationData.tail(ids,"now","after").toString());assertEquals(ids.toString(),ConstellationData.tail(ids,"x","after").toString());assertEquals(ids.toString(),ConstellationData.tail(ids,"now","now").toString());
  JSONArray clean=ConstellationData.queueIds(new JSONArray(List.of("a","a","missing","b")),Set.of("a","b"));assertEquals("[\"a\",\"b\"]",clean.toString());
  assertEquals(Set.of("a"),ConstellationData.available(new JSONArray("[{\"id\":\"a\"},{\"id\":\"b\",\"available\":false}]")));
 }
}
