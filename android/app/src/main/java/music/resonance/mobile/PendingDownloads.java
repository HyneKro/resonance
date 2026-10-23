package music.resonance.mobile;

import org.json.*;
import java.util.*;

/** Pending work belongs to connected sources; removing a source never removes saved audio. */
final class PendingDownloads {
    static boolean connected(JSONArray sources,String id){for(int i=0;i<sources.length();i++){JSONObject source=sources.optJSONObject(i);if(source!=null&&source.optString("id").equals(id))return true;}return false;}
    static JSONArray retain(JSONArray entries,JSONArray sources){
        Set<String> ids=new HashSet<>();for(int i=0;i<sources.length();i++){JSONObject source=sources.optJSONObject(i);if(source!=null)ids.add(source.optString("id"));}
        JSONArray result=new JSONArray();for(int i=0;i<entries.length();i++){JSONObject item=entries.optJSONObject(i);if(item!=null&&ids.contains(item.optString("sourceId")))result.put(item);}return result;
    }
    static JSONArray choices(JSONArray choices,JSONArray preview){
        Set<String> keys=new HashSet<>();for(int i=0;i<preview.length();i++){JSONObject item=preview.optJSONObject(i);if(item!=null)keys.add(item.optString("key"));}
        JSONArray result=new JSONArray();if(choices!=null)for(int i=0;i<choices.length();i++){JSONObject item=choices.optJSONObject(i);if(item!=null&&keys.contains(item.optString("key")))result.put(item);}return result;
    }
    static JSONObject job(JSONObject job,JSONArray preview){JSONObject result=Json.parse(job.toString()),data=result.optJSONObject("data");if(result.optString("kind").equals("download")&&data!=null)Json.put(data,"selected",choices(data.optJSONArray("selected"),preview));return result;}
}
