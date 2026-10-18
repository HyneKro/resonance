package music.resonance.mobile;

import org.json.*;
import java.text.Normalizer;
import java.util.*;
import java.util.regex.*;

/** Artist identities, shared in behavior with web artist-credits.js. */
public final class ArtistCredits {
    public static final int VERSION=2;
    private static final Pattern ANNOTATION=Pattern.compile("^(?:v\\.?i\\.?p\\.?|(?:official\\s+)?(?:music\\s+|lyric\\s+)?video\\b.*|(?:official\\s+)?(?:audio|visuali[sz]er|lyrics?)\\b.*|day\\s+\\d+\\b.*|(?:extended|full|original|radio|album|instrumental|acoustic|live|remastered?)(?:\\s+(?:version|mix|edit|audio|video|\\d{4}))*|(?:sped\\s+up|slowed)(?:\\s*\\+\\s*reverb)?)$",Pattern.CASE_INSENSITIVE);
    private static String key(String s){return Normalizer.normalize(s,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).replaceFirst("\\s+-\\s+topic$","").replaceAll("[^\\p{L}\\p{N}]","");}
    private static List<String> unique(Collection<String> names){LinkedHashMap<String,String> out=new LinkedHashMap<>();for(String n:names)if(n!=null&&!n.isBlank())out.put(key(n.trim()),n.trim());return new ArrayList<>(out.values());}
    private static List<String> array(JSONArray values){List<String> out=new ArrayList<>();if(values!=null)for(int i=0;i<values.length();i++){Object v=values.opt(i);if(v instanceof JSONObject)out.add(((JSONObject)v).optString("name"));else if(v instanceof String)out.add((String)v);}return unique(out);}
    public static List<String> split(String value){List<String> out=new ArrayList<>();for(String s:value.replaceFirst("(?i)\\s+-\\s+Topic$","").split("(?i)\\s*[\\[(]?\\b(?:feat\\.?|ft\\.?|featuring)\\s+|\\s+[x×]\\s+|\\s*;\\s*")){
        String part=s.trim();if(part.endsWith(")")&&!part.contains("(")||part.endsWith("]")&&!part.contains("["))part=part.substring(0,part.length()-1).trim();
        if(part.contains("&")||Pattern.compile(",\\s+the\\s+",Pattern.CASE_INSENSITIVE).matcher(part).find())out.add(part);else out.addAll(Arrays.asList(part.split(",\\s+")));
    }return unique(out);}
    private static boolean protectedArtist(JSONObject t){return List.of("manual","confirmed").contains(t.optString("metadataStatus"))||t.optJSONObject("metadataLocks")!=null&&t.optJSONObject("metadataLocks").optBoolean("artist");}
    public static List<String> names(JSONObject t){if(protectedArtist(t))return split(t.optString("artist"));List<String> saved=array(t.optJSONArray("artists"));return saved.isEmpty()?split(t.optString("artist")):saved;}
    private static String raw(JSONObject t){return t.optString("rawTitle").isEmpty()?t.optString("title"):t.optString("rawTitle");}
    private static final class Upload {final List<String> names;final String song;Upload(String credit,String song){this.names=split(credit);this.song=song;}}
    private static Upload upload(JSONObject t){String text=raw(t).replaceFirst("^\\[[^\\]]+\\]\\s*","").trim();String[] parts=text.split("\\s+[-–—]\\s+",2);
        if(parts.length<2){parts=text.split("\\s+\\|\\s+");if(parts.length!=2||!Pattern.compile("(?i)(?:\\blive\\b|\\bfestival\\b|\\bwinter\\b|\\bsummer\\b|\\b(?:19|20)\\d{2}\\b)").matcher(parts[1]).find())return null;}
        String credit=parts[0],song=parts[1];if(credit.isEmpty()||song.isEmpty()||ANNOTATION.matcher(song).matches()||credit.matches("^[\"'“‘].*[\"'”’]$"))return null;
        return key(song).equals(key(t.optString("channel")))?new Upload(song,credit):new Upload(credit,song);
    }
    public static List<String> titleNames(JSONObject t){if(protectedArtist(t))return new ArrayList<>();Upload u=upload(t);String title=u==null?(t.optString("title").isEmpty()?raw(t):t.optString("title")):u.song;List<String> names=new ArrayList<>();
        Matcher guest=Pattern.compile("(?i)\\b(?:feat\\.?|ft\\.?|featuring)\\s+([^)\\]\\[]+)").matcher(title);if(guest.find())names.addAll(split(guest.group(1).split("\\s+[-–—|]\\s+",2)[0]));
        Matcher remix=Pattern.compile("(?i)[\\[(]([^()\\[\\]]+?)\\s+(?:(?:bootleg|official)\\s+)?(?:remix|rework|bootleg)[)\\]]").matcher(raw(t));while(remix.find()){String name=remix.group(1);if(!ANNOTATION.matcher(name).matches()&&!name.matches("(?i)^(?:official|club|dance|dub|bass|trap|house|drum\\s*(?:&|and)\\s*bass)$"))names.addAll(split(name));}return unique(names);
    }
    public static String sourceTitle(JSONObject t){Upload u=upload(t);if(u!=null)for(String credit:u.names)for(String name:names(t))if(key(credit).equals(key(name)))return u.song;return t.optString("title");}
    public static JSONObject repair(JSONObject t){
        if(protectedArtist(t)){Json.put(t,"artists",new JSONArray(split(t.optString("artist"))));Json.put(t,"artistCreditVersion",VERSION);return t;}
        String original=t.optString("artist");if(t.optString("artistCreditSource").equals("Upload title")&&t.optInt("artistCreditVersion")!=VERSION&&!t.isNull("artistBeforeCreditRepair"))original=t.optString("artistBeforeCreditRepair",original);
        List<String> structured=array(t.optJSONArray("musicbrainzArtists")),recording=new ArrayList<>();for(String n:array(t.optJSONArray("recordingArtists")))recording.addAll(split(n));recording=unique(recording);
        Upload upload=upload(t);List<String> prefix=upload==null?new ArrayList<>():upload.names;String channel=key(t.optString("channel")),source="Recording credits";List<String> names=structured;
        if(names.isEmpty()){names=recording.isEmpty()?split(original):recording;boolean onlyChannel=!recording.isEmpty(),intersects=false;for(String n:recording){onlyChannel&=key(n).equals(channel);for(String p:prefix)intersects|=key(p).equals(key(n));}
            boolean originalMatches=false;for(String n:split(original))for(String p:prefix)originalMatches|=key(n).equals(key(p));boolean weak=recording.isEmpty()&&(original.isEmpty()||key(original).equals(channel)||originalMatches||t.optString("artistCreditSource").equals("Upload title"));
            String[] rawParts=raw(t).split("\\s+[-–—]\\s+");boolean reversed=upload!=null&&!channel.isEmpty()&&key(rawParts[rawParts.length-1]).equals(channel);
            if(!prefix.isEmpty()&&(weak||reversed||onlyChannel||intersects)){names=new ArrayList<>(prefix);boolean includesChannel=prefix.stream().anyMatch(n->key(n).equals(channel));for(String n:recording)if(!key(n).equals(channel)||includesChannel)names.add(n);names=unique(names);source="Upload title";}
        }
        String artist=String.join(", ",names);if(!artist.equals(t.optString("artist"))){if(t.isNull("artistBeforeCreditRepair"))Json.put(t,"artistBeforeCreditRepair",t.optString("artist"));Json.put(t,"artist",artist);}if(!names.isEmpty())Json.put(t,"artistCreditSource",source);
        names=new ArrayList<>(names);names.addAll(titleNames(t));Json.put(t,"artists",new JSONArray(unique(names)));Json.put(t,"artistCreditVersion",VERSION);return t;
    }
}
