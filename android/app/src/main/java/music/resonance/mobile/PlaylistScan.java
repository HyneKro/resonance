package music.resonance.mobile;

import org.json.*;
import java.io.IOException;
import java.util.Locale;

/** A successful process can still return a truncated YouTube playlist. */
final class PlaylistScan {
    static JSONArray completeEntries(JSONObject result,String warnings) throws IOException {
        JSONArray entries=result.optJSONArray("entries");if(entries==null)throw new IOException("No playlist entries were returned. Check that the playlist is public.");
        int expected=result.optInt("playlist_count",-1);
        if(expected>entries.length())throw new IOException("Playlist scan incomplete: read "+entries.length()+" of "+expected+" entries. Your previous list was kept. Update the downloader and check again.");
        String log=warnings.toLowerCase(Locale.ROOT);
        if(log.contains("incomplete data")||log.contains("unable to download api page")||log.contains("giving up after")||log.contains("skipping the rest"))throw new IOException("YouTube stopped the playlist scan before it finished. Your previous list was kept. Check again to retry.");
        return entries;
    }
}
