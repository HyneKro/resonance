package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.IOException;

public class SpotifyPlaylistTest {
    private final String id="4rArRoeiRH1x8yQWrmU4Bz";
    private String html(JSONObject entity) throws Exception {return "<script id=\"__NEXT_DATA__\">"+new JSONObject().put("props",new JSONObject().put("pageProps",new JSONObject().put("state",new JSONObject().put("data",new JSONObject().put("entity",entity)))))+"</script>";}
    private JSONObject song() throws Exception {return new JSONObject().put("uri","spotify:track:5o3DSHw1ORhM3lWxqGRvEf").put("title","All Blues").put("subtitle","Miles Davis").put("duration",692000).put("audioPreview",new JSONObject().put("url","https://never-download.test/preview"));}
    private JSONObject entity(JSONArray songs) throws Exception {return new JSONObject().put("type","playlist").put("id",id).put("title","Jazz").put("trackList",songs);}
    @Test public void publicMusicKeepsOrderAndDiscardsPreviewAudioAndEpisodes() throws Exception {
        JSONObject result=SpotifyPlaylist.parse(html(entity(new JSONArray().put(song()).put(JSONObject.NULL).put(new JSONObject().put("uri","spotify:episode:"+id).put("title","Talk")).put(song()))),id);
        JSONArray tracks=result.getJSONArray("tracks");assertEquals(2,tracks.length());assertEquals(4,tracks.getJSONObject(1).getInt("playlistIndex"));assertEquals(692000,tracks.getJSONObject(0).getInt("duration"));assertFalse(tracks.getJSONObject(0).has("audioPreview"));
    }
    @Test public void missingPrivateMalformedAndWrongPlaylistHaveActionableMessages() throws Exception {
        for(String page:new String[]{"<html>Sign in</html>","<script id=\"__NEXT_DATA__\">invalid</script>",html(entity(new JSONArray().put(song())).put("id","different")),html(entity(new JSONArray()))}){
            IOException error=assertThrows(IOException.class,()->SpotifyPlaylist.parse(page,id));assertTrue(error.getMessage().contains("Make public"));assertTrue(error.getMessage().contains("temporarily unavailable"));assertEquals(error.getMessage(),DownloadMessages.explain(error.getMessage()));
        }
    }
    @Test public void spotifyNetworkErrorsAreNeverRelabeledAsYoutube() {
        IOException error=assertThrows(IOException.class,()->SpotifyPlaylist.load(id,url->{assertEquals("https://open.spotify.com/embed/playlist/"+id,url);throw new IOException("Service unavailable (429)");}));
        assertTrue(error.getMessage().contains("429"));assertFalse(DownloadMessages.explain(error.getMessage()).contains("YouTube"));
    }
}
