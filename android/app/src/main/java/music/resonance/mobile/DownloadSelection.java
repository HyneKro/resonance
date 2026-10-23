package music.resonance.mobile;

import org.json.*;
import java.io.IOException;
import java.util.*;

final class DownloadSelection {
    static JSONArray resolve(JSONArray choices,JSONArray preview) throws Exception {
        if(choices==null||choices.length()==0)throw new IOException("Select songs to download first.");
        Map<String,JSONObject> indexed=new HashMap<>();for(int i=0;i<preview.length();i++){JSONObject item=preview.getJSONObject(i);indexed.put(item.optString("key"),item);}
        JSONArray result=new JSONArray();Set<String> seen=new HashSet<>();
        for(int i=0;i<choices.length();i++){
            JSONObject choice=choices.getJSONObject(i);String key=choice.optString("key");JSONObject original=indexed.get(key);
            if(original==null)continue;
            if(!seen.add(key))continue;
            JSONObject item=new JSONObject(original.toString());String video=choice.optString("youtubeId",item.optString("youtubeId"));
            if(!video.matches("[A-Za-z0-9_-]{11}"))throw new IOException("Choose a recording for each selected song first.");
            if(!video.equals(item.optString("youtubeId")))throw new IOException("The selected recording no longer matches the playlist.");
            item.put("youtubeId",video);result.put(item);
        }if(result.length()==0)throw new IOException("The selected songs are no longer waiting. Reopen Downloads to refresh the list.");return result;
    }
}
