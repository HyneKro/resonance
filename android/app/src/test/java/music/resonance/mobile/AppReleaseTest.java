package music.resonance.mobile;
import org.junit.Test;
import org.json.*;
import static org.junit.Assert.*;
public class AppReleaseTest {
    private JSONObject release(String v){String tag="android-v"+v,name="Resonance-Android-"+v+".apk";return Json.object("tag_name",tag,"body","Changes","prerelease",true,"assets",new JSONArray().put(Json.object("name",name,"size",80000000,"state","uploaded","digest","sha256:"+"a".repeat(64),"browser_download_url",AppRelease.PAGE+"/download/"+tag+"/"+name)));}
    @Test public void numericVersionsAndPreviewOrdering(){assertTrue(AppRelease.compare("0.1.12-preview","0.1.9-preview")>0);assertTrue(AppRelease.compare("0.1.12","0.1.12-preview")>0);assertNull(AppRelease.version("latest"));assertNull(AppRelease.version("1.0.0/../../file"));}
    @Test public void selectsAndroidPreviewAndExcludesWindowsDraftsAndOldVersions(){JSONArray rows=new JSONArray().put(release("0.1.11-preview")).put(Json.put(release("9.0.0-preview"),"draft",true)).put(Json.put(release("8.0.0-preview"),"tag_name","pc-v8.0.0")).put(release("0.1.12-preview"));assertEquals("0.1.12-preview",AppRelease.select(rows,"0.1.11-preview").optString("version"));assertNull(AppRelease.select(rows,"0.1.12-preview"));}
    @Test public void rejectsMissingHashesAndExternalDownloads() throws Exception {for(String field:new String[]{"digest","browser_download_url","state"}){JSONObject r=release("0.1.12-preview");r.getJSONArray("assets").getJSONObject(0).put(field,"wrong");assertNull(AppRelease.select(new JSONArray().put(r),"0.1.11-preview"));}}
    @Test public void rejectsOversizeAndDuplicateAssets() throws Exception {JSONObject r=release("0.1.12-preview");JSONArray a=r.getJSONArray("assets");a.getJSONObject(0).put("size",600_000_000);assertNull(AppRelease.select(new JSONArray().put(r),"0.1.11-preview"));a.getJSONObject(0).put("size",80_000_000);a.put(a.getJSONObject(0));assertNull(AppRelease.select(new JSONArray().put(r),"0.1.11-preview"));}
    @Test public void restoresOnlyNewerTrustedReleases(){JSONObject r=AppRelease.select(new JSONArray().put(release("0.1.12-preview")),"0.1.11-preview");assertNotNull(AppRelease.restore(r,"0.1.11-preview"));assertNull(AppRelease.restore(r,"0.1.12-preview"));assertNull(AppRelease.restore(Json.put(r,"url","https://example.com/app.apk"),"0.1.11-preview"));}
}
