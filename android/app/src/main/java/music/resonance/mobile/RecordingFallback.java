package music.resonance.mobile;

import org.json.*;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.*;

/** Conservative alternatives, never a workaround for throttling or authentication. */
final class RecordingFallback {
    static boolean unavailable(String raw){
        if(DownloadFailures.pausesBatch(raw))return false;
        return Pattern.compile("video (?:is )?unavailable|video (?:has been|was) removed|private video|no longer available|not available in your country|blocked.{0,30}copyright",Pattern.CASE_INSENSITIVE).matcher(raw).find();
    }
    static String clean(String value){return Normalizer.normalize(value,Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("\\b(official|music|video|audio|lyrics?|visuali[sz]er|hd|hq|topic)\\b"," ").replaceAll("[^\\p{L}\\p{N}]+"," ").trim();}
    static String versions(String value){List<String> found=new ArrayList<>();Matcher m=Pattern.compile("\\b(remix|live|cover|acoustic|instrumental|sped|slowed|nightcore|karaoke|extended|edit|remaster\\w*)\\b").matcher(value.toLowerCase(Locale.ROOT));while(m.find())found.add(m.group());Collections.sort(found);return String.join(" ",found);}
    static String withoutArtist(String title,String artist){return (" "+title+" ").replace(" "+artist+" "," ").trim();}
    static boolean matches(JSONObject original,JSONObject candidate){
        String title=clean(original.optString("title")),artist=clean(original.optString("artist")),name=clean(candidate.optString("title")),credit=name+" "+clean(candidate.optString("channel",candidate.optString("uploader")));
        double duration=original.optDouble("duration",0),other=candidate.optDouble("duration",0);
        if(title.length()<3||artist.isBlank()||duration<=15||duration>=1200||other<=0||candidate.optBoolean("is_live")||!candidate.optString("id").matches("[A-Za-z0-9_-]{11}")||candidate.optString("id").equals(original.optString("youtubeId")))return false;
        return withoutArtist(title,artist).equals(withoutArtist(name,artist))&&(" "+credit+" ").contains(" "+artist+" ")&&versions(original.optString("title")).equals(versions(candidate.optString("title")))&&Math.abs(duration-other)<=Math.max(4,duration*.02);
    }
}
