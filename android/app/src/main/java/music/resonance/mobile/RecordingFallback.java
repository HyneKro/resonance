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
    static String clean(String value){return Normalizer.normalize(value,Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[\\(\\[]\\s*(?:official\\s+)?(?:music video|video|audio|lyrics?|visuali[sz]er|hd|hq)\\s*[\\)\\]]"," ").replaceAll("\\s+-\\s+topic$|\\s+(?:official\\s+(?:music\\s+)?(?:video|audio)|lyrics?\\s+video)$"," ").replaceAll("[^\\p{L}\\p{N}]+"," ").trim().replaceAll("\\s+"," ");}
    static String versions(String value){List<String> found=new ArrayList<>();Matcher m=Pattern.compile("\\b(remix|live|cover|acoustic|instrumental|sped|slowed|nightcore|karaoke|extended|edit|remaster\\w*)\\b").matcher(value.toLowerCase(Locale.ROOT));while(m.find())found.add(m.group());Collections.sort(found);return String.join(" ",found);}
    static String withoutArtist(String title,String artist){return (" "+title+" ").replace(" "+artist+" "," ").trim();}
    static boolean matches(JSONObject original,JSONObject candidate){
        String[] identity=identity(original);String title=clean(identity[0]),artist=clean(identity[1]),name=clean(candidate.optString("title")),credit=name+" "+clean(candidate.optString("channel",candidate.optString("uploader")));
        double duration=original.optDouble("duration",0),other=candidate.optDouble("duration",0);
        if(title.length()<3||artist.isBlank()||duration<=15||duration>=1200||other<=0||candidate.optBoolean("is_live")||!candidate.optString("id").matches("[A-Za-z0-9_-]{11}")||candidate.optString("id").equals(original.optString("youtubeId")))return false;
        return withoutArtist(title,artist).equals(withoutArtist(name,artist))&&(" "+credit+" ").contains(" "+artist+" ")&&versions(identity[0]).equals(versions(candidate.optString("title")))&&Math.abs(duration-other)<=Math.max(4,duration*.02);
    }
    static String[] identity(JSONObject item){String title=item.optString("title").trim(),artist=item.optString("artist",item.optString("channel")).replaceFirst("(?i)\\s+-\\s+Topic$","").trim();String[] parts=title.split("\\s+[-–—]\\s+");if(parts.length==2&&parts[0].length()<100){artist=parts[0].trim();title=parts[1].trim();}return new String[]{title,artist};}
    static List<String> queries(JSONObject item){String query=item.optString("query").trim();if(!query.isEmpty())return List.of("ytsearch10:"+query.substring(0,Math.min(300,query.length())));String[] identity=identity(item);if(identity[0].isBlank()||identity[0].matches("(?i)(unavailable|deleted|private) video"))return List.of();return List.of("ytsearch8:"+identity[1]+" "+identity[0]+" audio","ytsearch8:\""+identity[0].replace("\"","")+"\" \""+identity[1].replace("\"","")+"\"");}
}
