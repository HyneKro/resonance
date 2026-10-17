package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;

public class GenreResearchTest {
 private static final String R="11111111-1111-1111-1111-111111111111",A="22222222-2222-2222-2222-222222222222",L="33333333-3333-3333-3333-333333333333",G="44444444-4444-4444-4444-444444444444";
 private JSONObject song(){return Json.object("id","song","title","Cafe (feat. Guest) [Official Audio]","artist","Aster - Topic","duration",180,"genre","");}
 private JSONObject taxonomy(){return Json.object("neurofunk","Neurofunk","electronic","Electronic","ambient","Ambient");}
 @Test public void featuredCreditMatchingPreservesRecordingVersionAndDuration(){
  JSONObject t=song();assertEquals("Cafe",GenreResearch.title(t));assertEquals(List.of("Aster","Guest"),GenreResearch.artists(t));
  assertTrue(GenreResearch.same(t,Json.object("title","Café","artist","Aster feat. Guest","duration",182)));
  assertFalse(GenreResearch.same(t,Json.object("title","Cafe (Remix)","artist","Aster","duration",180)));
  assertFalse(GenreResearch.same(t,Json.object("title","Cafe","artist","Aster feat. Other","duration",180)));
  assertFalse(GenreResearch.same(t,Json.object("title","Cafe","artist","Aster","duration",240)));
  assertEquals(List.of("Earth, Wind & Fire"),GenreResearch.artists(Json.object("artist","Earth, Wind & Fire")));
  assertEquals(List.of("My correction"),GenreResearch.artists(Json.object("artist","My correction","artists",new JSONArray(List.of("Old name")),"metadataLocks",Json.object("artist",true),"metadataStatus","confirmed")));
 }
 @Test public void releaseGroupEvidenceBeatsArtistSuggestionAndRejectsNonGenreTags(){
  GenreResearch research=new GenreResearch(url->{
   if(url.contains("/recording?"))return Json.object("recordings",new JSONArray().put(Json.object("id",R,"title","Cafe","length",180000,"artist-credit",new JSONArray().put(Json.object("name","Aster","artist",Json.object("id",A,"name","Aster"))))));
   if(url.contains("/recording/"))return Json.object("artist-credit",new JSONArray().put(Json.object("artist",Json.object("id",A))),"releases",new JSONArray().put(Json.object("id",L)));
   if(url.contains("/release/"))return Json.object("release-group",Json.object("id",G));
   if(url.contains("/release-group/"))return Json.object("tags",new JSONArray().put(Json.object("name","seen live","count",99)).put(Json.object("name","neurofunk","count",3)));
   if(url.contains("/artist/"))return Json.object("genres",new JSONArray().put(Json.object("name","electronic","count",2)));
   return new JSONObject();
  },taxonomy());
  JSONObject t=research.discover(song());assertEquals("Neurofunk",t.optString("genre"));assertEquals("track",t.optString("genreBasis"));assertEquals(2,t.optJSONArray("genreEvidence").length());assertEquals(5,t.optInt("genreResearchVersion"));
 }
 @Test public void homonymousArtistsAndRemixesAreNeverBorrowed(){
  GenreResearch research=new GenreResearch(url->{if(url.contains("/artist?"))return Json.object("artists",new JSONArray().put(Json.object("id",A,"name","Aster","score",100)).put(Json.object("id",L,"name","Aster","score",100)));return new JSONObject();},taxonomy());
  assertEquals("",research.discover(song()).optString("genre"));
 }
 @Test public void lockedChoicesAndPriorGenresSurviveAnOfflineLookup(){
  JSONObject t=song();Json.put(t,"genre","My personal choice");Json.put(t,"genreLocked",true);
  GenreResearch research=new GenreResearch(url->{throw new java.io.IOException("offline");},taxonomy());assertSame(t,research.discover(t));assertFalse(t.has("genreResearchVersion"));
  Json.put(t,"genreLocked",false);JSONObject result=research.discover(t);assertEquals("My personal choice",result.optString("genre"));assertTrue(result.optString("genreError").contains("offline"));
 }
 @Test public void downloaderKeepsSourceLabelsAndSeparatesReposterFromArtist(){
  JSONObject t=Json.object("title","Aster - Cafe","artist","Upload Channel");GenreResearch.sourceLabels(t,Json.object("title","Aster - Cafe","channel","Upload Channel","description","Genre: Neurofunk","tags",new JSONArray(List.of("neurofunk"))));assertEquals("Aster",t.optString("artist"));assertEquals("Cafe",t.optString("title"));assertEquals("Upload Channel",t.optString("channel"));assertEquals("neurofunk",t.optJSONArray("sourceTags").optString(0));
 }

 @Test public void localLabelsAndConsensusAreSavedWithoutBorrowingSuggestedOrDuplicateSongs(){
  GenreResearch r=new GenreResearch(url->{throw new AssertionError("Local seed must stay offline");},taxonomy());
  JSONObject a=Json.object("id","a","title","One","artist","Aster","sourceTags",new JSONArray(List.of("Electronic Music"))),b=Json.object("id","b","title","Two","artist","Aster","genre","Electronic"),c=Json.object("id","c","title","Three","artist","Aster","genre",""),locked=Json.object("id","d","title","Four","artist","Aster","genre","","genreLocked",true);
  JSONArray changed=r.seed(new JSONArray().put(a).put(b).put(c).put(locked));assertEquals(2,changed.length());assertEquals("Electronic",a.optString("genre"));assertEquals("Electronic",c.optString("genre"));assertEquals("artist",c.optString("genreBasis"));assertEquals("",locked.optString("genre"));
  JSONObject remix=Json.object("id","e","title","Five (Nova Remix)","artist","Aster","genre","");r.seed(new JSONArray().put(a).put(b).put(c).put(remix));assertEquals("",remix.optString("genre"));
  assertEquals("Song",GenreResearch.title(Json.object("title","Song [Diversity Release]","artist","Aster")));
 }
 @Test public void swappedUploadCanMatchByArtistTitleAndDurationButCannotOverwriteEdits(){
  GenreResearch r=new GenreResearch(url->{
   if(url.contains("/recording?")&&java.net.URLDecoder.decode(url,java.nio.charset.StandardCharsets.UTF_8).contains("artist:\"Daughter\""))return Json.object("recordings",new JSONArray().put(Json.object("id",R,"title","Youth","length",250000,"artist-credit",new JSONArray().put(Json.object("name","Daughter","artist",Json.object("id",A,"name","Daughter"))))));
   if(url.contains("/recording/"))return Json.object("genres",new JSONArray().put(Json.object("name","ambient","count",2)));return new JSONObject();
  },taxonomy());
  JSONObject t=Json.object("title","Daughter","artist","Youth","rawTitle","Youth - Daughter","duration",250);assertEquals("Ambient",r.discover(t).optString("genre"));assertEquals("Youth",t.optString("artist"));
 }
}
