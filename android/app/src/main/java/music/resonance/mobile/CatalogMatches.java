package music.resonance.mobile;

import org.json.*;
import java.io.InterruptedIOException;
import java.text.Normalizer;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.regex.*;

/** The PC catalogue search/ranking flow, with bounded reusable metadata. Never downloads audio. */
final class CatalogMatches {
    interface Search { JSONArray find(String query) throws Exception; }
    private static final long WEEK=7L*24*60*60*1000;
    static String normalized(String value){return Normalizer.normalize(value,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT).replaceAll("\\[[\\w-]{11}\\]$","").replaceAll("[^\\p{L}\\p{N}]","");}
    static String artist(String value){return value.replaceFirst("(?i)\\s+-\\s+Topic$","").trim();}
    static String title(String value,String artist){
        String clean=Normalizer.normalize(value,Normalizer.Form.NFKC).replaceAll("(?i)\\s*[\\[(](?:(?:4k|hd)\\s+)?(?:official(?:\\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music video|lyrics?(?: video)?|audio|visuali[sz]er|monstercat release)[\\])]","").replaceFirst("(?i)\\s+official (?:music video|lyric video|audio|visuali[sz]er)$","").replaceFirst("\\s*\\[[\\w-]{11}\\]$","").trim();
        String[] parts=clean.split("\\s+[-–—]\\s+",2);return parts.length>1&&normalized(parts[0]).equals(normalized(artist(artist)))?parts[1]:clean;
    }
    private static String versions(String value){List<String> tags=new ArrayList<>();Matcher m=Pattern.compile("\\b(remix|live|cover|acoustic|instrumental|nightcore|slowed|sped|remaster)\\b").matcher(value.toLowerCase(Locale.ROOT));while(m.find())tags.add(m.group());Collections.sort(tags);return String.join(",",tags);}
    private static String cleanTitle(String value,String artist){return normalized(title(value,artist).replaceAll("(?i)\\s*\\((?:feat\\.|ft\\.).*?\\)",""));}
    static JSONArray rank(JSONObject track,JSONArray entries) throws Exception {
        String primary=track.optString("artist").split(",",2)[0].trim(),reference=cleanTitle(track.optString("title"),primary),credit=normalized(artist(primary));
        List<JSONObject> ranked=new ArrayList<>();Set<String> seen=new HashSet<>();
        for(int i=0;i<entries.length();i++){
            JSONObject entry=entries.optJSONObject(i);if(entry==null||!entry.optString("id").matches("[A-Za-z0-9_-]{11}")||entry.optString("title").isBlank()||entry.optDouble("duration")<=0||!Double.isFinite(entry.optDouble("duration"))||entry.optBoolean("is_live")||!seen.add(entry.optString("id")))continue;
            String channel=entry.optString("channel",entry.optString("uploader")),name=title(entry.optString("title"),primary);
            boolean supplied=normalized(channel).contains(normalized(primary))||normalized(entry.optString("title")).startsWith(normalized(primary));
            String otherArtist=supplied?primary:artist(channel),other=cleanTitle(name,otherArtist),otherCredit=normalized(artist(otherArtist));
            double titleScore=reference.equals(other)?1:reference.length()>5&&(reference.contains(other)||other.contains(reference))?.72:0;
            double artistScore=!credit.isEmpty()&&(credit.equals(otherCredit)||otherCredit.startsWith(credit))?1:0;
            double durationScore=track.optDouble("duration",0)>0&&Math.abs(track.optDouble("duration")-entry.optDouble("duration"))<=4?1:0;
            double score=titleScore*.5+artistScore*.3+durationScore*.2;if(!versions(track.optString("title")).equals(versions(name)))score=Math.min(.6,score);
            ranked.add(Json.object("id",entry.optString("id"),"title",entry.optString("title").substring(0,Math.min(500,entry.optString("title").length())),"channel",channel.substring(0,Math.min(300,channel.length())),"duration",entry.optDouble("duration"),"score",Math.round(score*100),"url","https://www.youtube.com/watch?v="+entry.optString("id")));
        }
        ranked.sort((a,b)->Integer.compare(b.optInt("score"),a.optInt("score")));JSONArray result=new JSONArray();for(JSONObject entry:ranked.subList(0,Math.min(3,ranked.size())))result.put(entry);return result;
    }
    private static String key(JSONObject item){return item.optString("type")+":"+item.optString(item.optString("type")+"Id");}
    private static String signature(JSONObject item){return new JSONArray().put(item.optString("title")).put(item.optString("artist")).put(Double.toString(item.optDouble("duration",0))).toString();}
    static JSONArray cached(JSONObject item,JSONObject cache,long now){JSONObject saved=cache.optJSONObject(key(item));return saved!=null&&now>=saved.optLong("at")&&now-saved.optLong("at")<WEEK&&signature(item).equals(saved.optString("signature"))?saved.optJSONArray("candidates"):null;}
    static JSONObject find(JSONObject item,JSONObject cache,long now,Search search,BooleanSupplier cancelled) throws Exception {
        if(cancelled.getAsBoolean())throw new InterruptedIOException("Recording search cancelled");JSONArray choices=cached(item,cache,now);
        if(choices==null||choices.length()==0){
            String query=item.optString("artist").split(",",2)[0]+" "+item.optString("title")+" audio";if(query.length()>450)query=query.substring(0,450);
            choices=rank(item,search.find("ytsearch3:"+query));if(cancelled.getAsBoolean())throw new InterruptedIOException("Recording search cancelled");
            cache.put(key(item),Json.object("at",now,"signature",signature(item),"candidates",choices));
            while(cache.length()>1000){String oldest=null;long at=Long.MAX_VALUE;for(Iterator<String> it=cache.keys();it.hasNext();){String k=it.next();JSONObject value=cache.optJSONObject(k);long time=value==null?0:value.optLong("at");if(time<at){at=time;oldest=k;}}if(oldest==null)break;cache.remove(oldest);}
        }
        JSONObject result=new JSONObject(item.toString());if(choices.length()>0)apply(result,choices.getJSONObject(0));return result;
    }
    static void apply(JSONObject item,JSONObject choice){Json.put(item,"youtubeId",choice.optString("id"));Json.put(item,"matchedTitle",choice.optString("title"));Json.put(item,"matchedChannel",choice.optString("channel",choice.optString("uploader")));Json.put(item,"matchedDuration",choice.optDouble("duration",0));Json.put(item,"matchScore",choice.optInt("score"));}
}
