package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.net.URI;
import java.util.concurrent.atomic.AtomicInteger;

public class DeezerPlaylistTest {
    private JSONObject metadata(){return Json.object("id",123,"type","playlist","public",true,"title","Discovery");}
    private JSONObject song(int n){return Json.object("id",n+1,"title","Song "+n,"duration",180,"artist",Json.object("name","Artist"),"readable",false,"preview","https://never-download.test/preview");}
    @Test public void validatesAndCanonicalizesPlaylistLinks() throws Exception {
        for(String url:new String[]{"https://www.deezer.com/playlist/123?utm_source=share","https://deezer.com/fr/playlist/123","https://www.deezer.com/en-US/playlist/123/"})assertEquals("123",DeezerPlaylist.id(url));
        for(String url:new String[]{"http://deezer.com/playlist/123","https://deezer.com.evil/playlist/123","https://user@deezer.com/playlist/123","https://deezer.com/track/123","https://link.deezer.com/s/abc"})assertThrows(IllegalArgumentException.class,()->DeezerPlaylist.id(url));
        assertEquals("https://api.deezer.com/playlist/123/tracks?limit=100&index=100",DeezerPlaylist.pageUrl("http://api.deezer.com/playlist/123/tracks?index=100&limit=100","123"));
        assertThrows(IOException.class,()->DeezerPlaylist.pageUrl("https://evil.test/tracks","123"));
        assertThrows(IOException.class,()->DeezerPlaylist.pageUrl("https://api.deezer.com/playlist/456/tracks","123"));
    }
    @Test public void importsEveryPageAndOriginalPositionWithoutPreviewAudio() throws Exception {
        AtomicInteger calls=new AtomicInteger();JSONObject result=DeezerPlaylist.load("123",url->{calls.incrementAndGet();if(!url.contains("/tracks"))return metadata();int start=Integer.parseInt(URI.create(url).getQuery().replaceAll(".*index=","")),end=Math.min(start+100,2501);JSONArray data=new JSONArray();for(int n=start;n<end;n++)data.put(song(n));JSONObject page=Json.object("data",data,"total",2501);if(end<2501)page.put("next","https://api.deezer.com/playlist/123/tracks?index="+end);return page;},()->false);
        JSONArray tracks=result.getJSONArray("tracks");assertEquals(27,calls.get());assertEquals(2501,tracks.length());assertEquals(2501,tracks.getJSONObject(2500).getInt("playlistIndex"));assertEquals("2501",tracks.getJSONObject(2500).getString("deezerId"));assertFalse(tracks.getJSONObject(0).has("preview"));
    }
    @Test public void neverAcceptsPrivateOrPartialLists() throws Exception {
        assertThrows(IOException.class,()->DeezerPlaylist.load("123",url->Json.object("error",Json.object("code",800)),()->false));
        assertThrows(IOException.class,()->DeezerPlaylist.load("123",url->metadata().put("public",false),()->false));
        assertThrows(IOException.class,()->DeezerPlaylist.load("123",url->url.contains("/tracks")?Json.object("data",new JSONArray().put(song(0)),"total",2):metadata(),()->false));
        assertThrows(IOException.class,()->DeezerPlaylist.load("123",url->url.contains("/tracks")?Json.object("data",new JSONArray().put(song(0)),"total",2,"next","https://api.deezer.com/playlist/123/tracks?index=0"):metadata(),()->false));
        assertThrows(InterruptedIOException.class,()->DeezerPlaylist.load("123",url->metadata(),()->true));
    }
    @Test public void skipsMalformedEntriesWithoutShiftingOrder() throws Exception {
        JSONObject result=DeezerPlaylist.load("123",url->url.contains("/tracks")?Json.object("data",new JSONArray().put(JSONObject.NULL).put(song(1).put("contributors",new JSONArray().put(Json.object("name","Guest")))),"total",2):metadata(),()->false);
        assertEquals(1,result.getInt("skipped"));JSONObject song=result.getJSONArray("tracks").getJSONObject(0);assertEquals(2,song.getInt("playlistIndex"));assertEquals("Artist, Guest",song.getString("artist"));
    }
    @Test public void reviewSelectionAndFailuresUseDeezerIdentity() throws Exception {
        JSONObject item=Json.object("key","s:0","type","deezer","deezerId","123","youtubeId","aaaaaaaaaaa","selected",true);
        JSONArray chosen=DownloadSelection.resolve(new JSONArray().put(Json.object("key","s:0","youtubeId","aaaaaaaaaaa")),new JSONArray().put(item));assertEquals("123",chosen.getJSONObject(0).getString("deezerId"));
        assertThrows(IOException.class,()->DownloadSelection.resolve(new JSONArray().put(Json.object("key","s:0","youtubeId","bbbbbbbbbbb")),new JSONArray().put(item)));
        JSONArray marked=DownloadFailures.mark(new JSONArray().put(item),item,"Unavailable",123);
        JSONObject next=new JSONObject(item.toString()).put("key","s:9").put("youtubeId","");
        JSONArray refreshed=DownloadFailures.preserve(marked,new JSONArray().put(new JSONObject(next.toString()).put("deezerId","456")).put(next));assertFalse(refreshed.getJSONObject(0).has("skipReason"));assertEquals("Unavailable",refreshed.getJSONObject(1).getString("skipReason"));
    }
}
