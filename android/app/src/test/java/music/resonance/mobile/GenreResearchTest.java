package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.util.*;
import static org.junit.Assert.*;

public class GenreResearchTest {
 @Test public void videoIntroCanMatchRegionalCatalogueButWrongVersionsCannot(){
  GenreResearch r=new GenreResearch(url->url.contains("entity=song")&&url.contains("country=GB")?Json.object("results",new JSONArray().put(Json.object("kind","song","trackName","Night","artistName","Aster","trackTimeMillis",180000,"primaryGenreName","Ambient","trackViewUrl","https://music.apple.com/gb/song/night/1"))):new JSONObject(),taxonomy());
  JSONObject t=Json.object("title","Night","artist","Aster","duration",192,"youtubeId","AAAAAAAAAAA");assertEquals("Ambient",r.discover(t).optString("genre"));assertEquals("release",t.optJSONArray("genreEvidence").optJSONObject(0).optString("scope"));
  assertEquals("",r.discover(Json.object("title","Night (Remix)","artist","Aster","duration",192,"youtubeId","AAAAAAAAAAA")).optString("genre"));
 }
 @Test public void albumConsensusIsAnArtistSuggestionAndIgnoresDifferentArtists(){
  GenreResearch r=new GenreResearch(url->{if(url.contains("entity=musicArtist"))return Json.object("results",new JSONArray().put(Json.object("wrapperType","artist","artistName","Aster","artistId",42,"artistLinkUrl","https://music.apple.com/us/artist/aster/42")));if(url.contains("entity=album"))return Json.object("results",new JSONArray().put(Json.object("wrapperType","collection","artistName","Aster","artistId",42,"collectionName","One","primaryGenreName","Ambient","collectionViewUrl","https://music.apple.com/us/album/one/1")).put(Json.object("wrapperType","collection","artistName","Aster","artistId",42,"collectionName","Two","primaryGenreName","Ambient","collectionViewUrl","https://music.apple.com/us/album/two/2")).put(Json.object("wrapperType","collection","artistName","Another","artistId",43,"collectionName","Three","primaryGenreName","Rock","collectionViewUrl","https://music.apple.com/us/album/three/3")));return new JSONObject();},taxonomy());
  JSONObject t=r.discover(Json.object("title","Rare song","artist","Aster","duration",200));assertEquals("Ambient",t.optString("genre"));assertEquals("artist",t.optString("genreBasis"));
 }
 @Test public void decoratedLabelsAndBilingualNamesStayIntact(){
  JSONObject t=Json.object("id","x","artist","KARDI(카디)","title","Eclipse (MusicVideo) (Clip Officiel)","description","🎵 Genre: Future Bounce\n• Styles：Artcore / Colour Bass");
  assertEquals(List.of("KARDI(카디)"),GenreResearch.artists(t));assertEquals("Eclipse",GenreResearch.title(t));
  GenreResearch r=new GenreResearch(url->new JSONObject(),Json.object("futurebounce","Future Bounce","artcore","Artcore","colourbass","Colour Bass"));
  r.seed(new JSONArray().put(t));assertEquals("Future Bounce, Artcore, Colour Bass",t.optString("genre"));
 }
 @Test public void wikidataGenresAreOnlyArtistSuggestionsFromVerifiedArtistRelations(){
  GenreResearch r=new GenreResearch(url->{
   if(url.contains("/artist?"))return Json.object("artists",new JSONArray().put(Json.object("id",A,"name","Aster","score",100)));
   if(url.contains("/artist/"))return Json.object("relations",new JSONArray().put(Json.object("type","wikidata","url",Json.object("resource","https://www.wikidata.org/wiki/Q1"))));
   if(url.endsWith("/Q1.json"))return Json.object("entities",Json.object("Q1",Json.object("claims",Json.object("P136",new JSONArray().put(Json.object("mainsnak",Json.object("datavalue",Json.object("value",Json.object("id","Q2")))))))));
   if(url.endsWith("/Q2.json"))return Json.object("entities",Json.object("Q2",Json.object("labels",Json.object("en",Json.object("value","ambient")))));
   return new JSONObject();
  },taxonomy());
  JSONObject result=r.discover(Json.object("title","Night","artist","Aster","genre",""));assertEquals("Ambient",result.optString("genre"));assertEquals("artist",result.optString("genreBasis"));assertEquals("Wikidata",result.optJSONArray("genreEvidence").optJSONObject(0).optString("source"));
 }
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
  JSONObject t=research.discover(song());assertEquals("Neurofunk",t.optString("genre"));assertEquals("track",t.optString("genreBasis"));assertEquals(2,t.optJSONArray("genreEvidence").length());assertEquals(GenreResearch.VERSION,t.optInt("genreResearchVersion"));
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

 @Test public void artistCatalogueFallbackIsSuggestedAndRejectsHomonyms(){
  JSONObject a=Json.object("wrapperType","artist","artistName","Aster","artistId",1,"artistLinkUrl","https://music.apple.com/us/artist/aster/1","primaryGenreName","Electronic");
  GenreResearch r=new GenreResearch(url->url.contains("entity=musicArtist")?Json.object("results",new JSONArray().put(a)):new JSONObject(),taxonomy());
  JSONObject result=r.discover(Json.object("title","Rare song","artist","Aster","duration",180));assertEquals("Electronic",result.optString("genre"));assertEquals("artist",result.optString("genreBasis"));
  GenreResearch ambiguous=new GenreResearch(url->url.contains("entity=musicArtist")?Json.object("results",new JSONArray().put(a).put(Json.object("wrapperType","artist","artistName","Aster","artistId",2,"artistLinkUrl","https://music.apple.com/us/artist/aster/2","primaryGenreName","Pop"))):new JSONObject(),taxonomy());
  assertEquals("",ambiguous.discover(Json.object("title","Rare song","artist","Aster","duration",180)).optString("genre"));
 }
 @Test public void blankArtistCanUseUploaderOnlyWithAnExactRecordingMatch(){
  GenreResearch r=new GenreResearch(url->url.contains("entity=song")?Json.object("results",new JSONArray().put(Json.object("kind","song","trackName","Guts","artistName","Ellie Dixon","trackTimeMillis",126000,"primaryGenreName","Pop","trackViewUrl","https://music.apple.com/us/song/guts/1"))):new JSONObject(),taxonomy());
  JSONObject t=Json.object("title","Guts","artist","","channel","Ellie Dixon","duration",126);assertEquals("Pop",r.discover(t).optString("genre"));assertEquals("",t.optString("artist"));
  assertEquals("",r.discover(Json.object("title","Guts","artist","","channel","Repost","duration",126)).optString("genre"));
 }
}
