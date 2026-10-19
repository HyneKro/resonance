package music.resonance.mobile;

import org.json.*;
import java.util.*;

/** Failure annotations live with the pending entries and survive restart and playlist refresh. */
final class DownloadFailures {
    static boolean pausesBatch(String raw){
        String text=raw.toLowerCase(Locale.ROOT);
        for(String cause:List.of("try again later","rate limit","rate-limit","temporarily unavailable","http error 429","http error 500","http error 502","http error 503","http error 504","too many requests","confirm you're not a bot","confirm you’re not a bot","network is unreachable","network is down","connection timed out","connection refused","connection reset","timed out","temporary failure in name resolution","name or service not known","failed to resolve","unable to resolve","no address associated","no space left","disk full","permission denied","read-only file system","ffmpeg not found","ffprobe not found","no module named","certificate_verify_failed"))if(text.contains(cause))return true;
        return false;
    }
    static JSONArray mark(JSONArray entries,JSONObject item,String reason,long at) throws JSONException {
        JSONArray result=new JSONArray();String video=item.optString("youtubeId");
        for(int i=0;i<entries.length();i++){
            JSONObject original=entries.getJSONObject(i),entry=new JSONObject(original.toString());
            if(entry.optString("key").equals(item.optString("key"))||!video.isEmpty()&&video.equals(entry.optString("youtubeId"))){
                entry.put("skipReason",reason.length()>240?reason.substring(0,240)+"…":reason).put("skippedAt",at).put("selected",false).put("failedVideoId",video);
            }
            result.put(entry);
        }return result;
    }
    static JSONArray preserve(JSONArray previous,JSONArray next) throws JSONException {
        Map<String,JSONObject> failed=new HashMap<>();
        for(int i=0;i<previous.length();i++){JSONObject item=previous.getJSONObject(i);if(!item.optString("skipReason").isEmpty())failed.put(identity(item),item);}
        JSONArray result=new JSONArray();
        for(int i=0;i<next.length();i++){
            JSONObject entry=new JSONObject(next.getJSONObject(i).toString()),old=failed.get(identity(entry));
            if(old!=null){for(String field:List.of("skipReason","skippedAt","failedVideoId"))entry.put(field,old.opt(field));entry.put("selected",false);}
            result.put(entry);
        }return result;
    }
    private static String identity(JSONObject entry){return entry.optString("type").equals("deezer")?"deezer:"+entry.optString("deezerId"):entry.optString("type").equals("spotify")?"spotify:"+entry.optString("spotifyId"):"youtube:"+entry.optString("youtubeId");}
}
