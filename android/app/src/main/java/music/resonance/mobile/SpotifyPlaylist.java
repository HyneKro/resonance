package music.resonance.mobile;

import org.json.*;
import java.io.IOException;
import java.util.regex.*;

/** Reads anonymous playlist metadata, never preview audio or account cookies. */
final class SpotifyPlaylist {
    static final String ACCESS_HELP="Only public playlists can be read without signing in. Private playlists are not supported. In Spotify, open the playlist’s ⋯ menu → Make public, then check again. A public link may also be temporarily unavailable.";
    interface Reader { String get(String url) throws IOException; }
    static JSONObject load(String id,Reader reader) throws Exception {
        if(!id.matches("[A-Za-z0-9]{22}"))throw new IOException("Spotify playlist link is invalid.");
        String html;
        try{html=reader.get("https://open.spotify.com/embed/playlist/"+id);}
        catch(IOException error){throw new IOException("Spotify playlist could not be read. "+ACCESS_HELP+" ("+error.getMessage()+")",error);}
        return parse(html,id);
    }
    static JSONObject parse(String html,String id) throws IOException {
        JSONObject entity;
        try{
            Matcher match=Pattern.compile("<script\\b[^>]*id=\"__NEXT_DATA__\"[^>]*>([\\s\\S]*?)</script>").matcher(html);
            if(!match.find())throw new JSONException("Missing playlist data");
            entity=new JSONObject(match.group(1)).getJSONObject("props").getJSONObject("pageProps").getJSONObject("state").getJSONObject("data").getJSONObject("entity");
            if(!entity.optString("type").equals("playlist")||!entity.optString("id").equals(id)||entity.optJSONArray("trackList")==null)throw new JSONException("Unsupported playlist data");
        }catch(JSONException error){throw new IOException("Spotify did not expose this playlist. "+ACCESS_HELP,error);}
        JSONArray tracks=new JSONArray(),entries=entity.optJSONArray("trackList");
        try{for(int i=0;i<entries.length();i++){
            JSONObject track=entries.optJSONObject(i);if(track==null||!track.optString("uri").matches("spotify:track:[A-Za-z0-9]{22}")||track.optString("title").isBlank())continue;
            // Retain metadata fields expected by Downloads; discard previews and episodes.
            tracks.put(new JSONObject().put("uri",track.optString("uri")).put("title",track.optString("title")).put("subtitle",track.optString("subtitle").replace('\u00a0',' ')).put("duration",Math.max(0,track.optDouble("duration",0))).put("playlistIndex",i+1));
        }
        if(tracks.length()==0)throw new IOException("Spotify exposed no music tracks. The playlist may be empty, private or contain only unsupported entries. "+ACCESS_HELP);
        return new JSONObject().put("title",entity.optString("title",entity.optString("name","Spotify playlist"))).put("tracks",tracks);
        }catch(JSONException error){throw new IOException("Spotify returned unsupported track data. "+ACCESS_HELP,error);}
    }
}
