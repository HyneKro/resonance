package music.resonance.mobile;

import org.json.*;
import java.util.*;
import java.util.regex.*;

/** Genre evidence only. Does not change recording identity or overwrite edits. */
public final class GenreResearch {
    public static final int VERSION=4;
    public interface Reader { JSONObject read(String url) throws Exception; }
    private final Reader reader;
    private final JSONObject taxonomy;
    private final List<String> errors=new ArrayList<>();
    public GenreResearch(Reader reader,JSONObject taxonomy){this.reader=reader;this.taxonomy=taxonomy;}
    public static String key(String s){return Research.normalize(s);}
    public static List<String> artists(JSONObject t){
        LinkedHashMap<String,String> out=new LinkedHashMap<>();JSONArray names=t.optJSONArray("artists");
        if(names!=null&&names.length()>0&&!t.optString("metadataStatus").equals("manual")&&!(t.optJSONObject("metadataLocks")!=null&&t.optJSONObject("metadataLocks").optBoolean("artist"))){for(int i=0;i<names.length();i++){Object n=names.opt(i);String name=n instanceof JSONObject?((JSONObject)n).optString("name"):String.valueOf(n);if(!name.isBlank())out.put(key(name),name);}}
        else for(String part:t.optString("artist").replaceFirst("(?i)\\s+-\\s+Topic$","").split("(?i)\\s*[\\[(]?\\b(?:feat\\.?|ft\\.?|featuring)\\s+|\\s+[x×]\\s+|\\s*;\\s*"))for(String n:part.contains("&")?new String[]{part}:part.split(",\\s+")){String name=n.replaceFirst("[)\\]]$","").trim();if(!name.isBlank())out.put(key(name),name);}
        Matcher m=Pattern.compile("(?i)\\b(?:feat\\.?|ft\\.?|featuring)\\s+([^)\\]]+)").matcher(t.optString("title"));if(m.find())for(String n:m.group(1).split(",\\s+"))out.put(key(n),n.trim());
        return new ArrayList<>(out.values());
    }
    public static String title(JSONObject t){
        String title=t.optString("title").replaceFirst("\\s*\\[[\\w-]{11}\\]$","").replaceAll("(?i)\\s*[\\[(](?:(?:4k|hd)\\s+)?(?:official(?:\\s+(?:music|audio|video|lyrics?|visuali[sz]er))*|music video|lyrics?(?: video)?|audio|visuali[sz]er|monstercat release)[\\])]","").replaceFirst("(?i)\\s+official (?:music video|lyric video|audio|visuali[sz]er)$","").trim();
        String[] parts=title.split("\\s+[-–—]\\s+",2);List<String> names=artists(t);names.add(t.optString("artist"));if(parts.length==2&&names.stream().anyMatch(a->key(a).equals(key(parts[0]))))title=parts[1];
        return title.replaceAll("(?i)\\s*[\\[(]\\s*(?:feat\\.?|ft\\.?|featuring)\\s+[^)\\]]+[)\\]]","").replaceFirst("(?i)\\s+(?:feat\\.?|ft\\.?|featuring)\\s+.*$","").trim();
    }
    private static String versions(JSONObject t){Matcher m=Pattern.compile("\\b(remix|live|cover|acoustic|instrumental|nightcore|slowed|sped|remaster)\\b").matcher(t.optString("rawTitle",t.optString("title")).toLowerCase(Locale.ROOT));List<String> out=new ArrayList<>();while(m.find())out.add(m.group(1));Collections.sort(out);return String.join(",",out);}
    public static boolean same(JSONObject a,JSONObject b){
        if(key(title(a)).isEmpty()||!key(title(a)).equals(key(title(b)))||!versions(a).equals(versions(b)))return false;
        List<String> aa=new ArrayList<>(),bb=new ArrayList<>();for(String n:artists(a))aa.add(key(n));for(String n:artists(b))bb.add(key(n));if(aa.isEmpty()||bb.isEmpty())return false;
        boolean identical=new HashSet<>(aa).equals(new HashSet<>(bb));if(!identical&&(!aa.get(0).equals(bb.get(0))||!aa.containsAll(bb)&&!bb.containsAll(aa)))return false;
        if(a.optDouble("duration",0)>0&&b.optDouble("duration",0)>0)return Math.abs(a.optDouble("duration")-b.optDouble("duration"))<=5;
        return identical;
    }
    private JSONObject get(String url){try{return reader.read(url);}catch(Exception e){errors.add(e.getMessage()==null?"Metadata service unavailable":e.getMessage());return new JSONObject();}}
    private static boolean uuid(String id){return id.matches("(?i)[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}");}
    private JSONObject entity(String type,String id,String inc){return uuid(id)?get("https://musicbrainz.org/ws/2/"+type+"/"+id+"?fmt=json&inc="+inc):new JSONObject();}
    private static String escape(String s){return s.replaceAll("[+\\-&|!(){}\\[\\]^\"~*?:\\\\/]"," ").trim();}
    private String canonical(String name,boolean official){String k=key(name);if(k.isEmpty()||Set.of("music","entertainment","musicvideo","officialaudio","unknown","other","none","seenlive").contains(k)||name.length()>65)return "";return taxonomy.optString(k,official?name:"");}
    private void add(JSONArray out,String name,String scope,String source,String url,boolean official){
        name=canonical(name,official);if(name.isBlank())return;for(int i=0;i<out.length();i++){JSONObject e=out.optJSONObject(i);if(e!=null&&key(e.optString("name")).equals(key(name))&&e.optString("scope").equals(scope))return;}
        out.put(Json.object("name",name,"scope",scope,"source",source,"url",url,"confidence",scope.equals("artist")?"suggested":"catalogued"));
    }
    private void collect(JSONArray out,JSONObject data,String scope,String type,String id){
        for(String field:List.of("genres","tags")){JSONArray list=data.optJSONArray(field);if(list==null)continue;List<JSONObject> sorted=new ArrayList<>();for(int i=0;i<list.length();i++){JSONObject g=list.optJSONObject(i);if(g!=null&&g.optInt("count",1)>0)sorted.add(g);}sorted.sort((a,b)->Integer.compare(b.optInt("count",1),a.optInt("count",1)));int before=out.length();for(JSONObject g:sorted){add(out,g.optString("name"),scope,"MusicBrainz","https://musicbrainz.org/"+type+"/"+id,field.equals("genres"));if(out.length()-before>=5)break;}}
    }
    private static JSONObject recording(JSONObject r){JSONArray credits=r.optJSONArray("artist-credit"),names=new JSONArray();StringBuilder artist=new StringBuilder();if(credits!=null)for(int i=0;i<credits.length();i++){JSONObject c=credits.optJSONObject(i);if(c==null)continue;String name=c.optString("name");if(name.isBlank()&&c.optJSONObject("artist")!=null)name=c.optJSONObject("artist").optString("name");artist.append(name).append(c.optString("joinphrase"));names.put(name);}return Json.object("title",r.optString("title"),"artist",artist.toString(),"artists",names,"duration",r.optDouble("length",0)/1000);}
    public JSONObject discover(JSONObject track){
        if(track.optBoolean("genreLocked"))return track;
        errors.clear();JSONArray evidence=new JSONArray(),old=track.optJSONArray("genreEvidence");
        if(old!=null)for(int i=0;i<old.length();i++){JSONObject e=old.optJSONObject(i);if(e!=null&&Set.of("manual","embedded").contains(e.optString("scope")))evidence.put(e);}
        JSONArray tags=track.optJSONArray("sourceTags");if(tags!=null)for(int i=0;i<tags.length();i++)add(evidence,tags.optString(i),"source","YouTube tags","",false);
        Matcher labels=Pattern.compile("(?im)(?:^|\\n)\\s*(?:genre|style)\\s*:\\s*([^\\n]+)|#([\\p{L}\\d_-]+)").matcher(track.optString("description"));while(labels.find())for(String n:(labels.group(1)==null?labels.group(2):labels.group(1)).split("[,;|/]"))add(evidence,n.trim(),"source","YouTube description","",false);
        LinkedHashSet<String> artistIds=new LinkedHashSet<>();JSONArray known=track.optJSONArray("musicbrainzArtists");if(known!=null)for(int i=0;i<known.length();i++){JSONObject a=known.optJSONObject(i);if(a!=null&&uuid(a.optString("id")))artistIds.add(a.optString("id"));}
        List<String> names=artists(track);JSONObject found=null;
        if(!names.isEmpty()&&!title(track).isBlank()&&!track.optString("kind").equals("mix")){
            String query="recording:\""+escape(title(track))+"\" AND artist:\""+escape(names.get(0))+"\"";
            JSONArray results=get("https://musicbrainz.org/ws/2/recording?fmt=json&limit=25&query="+Research.encode(query)).optJSONArray("recordings");
            if(results!=null){String identity="";for(int i=0;i<results.length();i++){JSONObject r=results.optJSONObject(i);if(r!=null&&same(track,recording(r))&&uuid(r.optString("id"))){JSONArray credits=r.optJSONArray("artist-credit");JSONObject first=credits==null?null:credits.optJSONObject(0),artist=first==null?null:first.optJSONObject("artist");String candidate=artist==null?"":artist.optString("id");if(!identity.isBlank()&&!candidate.isBlank()&&!identity.equals(candidate)){found=null;break;}identity=candidate;if(found==null)found=r;}}}
        }
        if(found!=null){String id=found.optString("id");JSONObject r=entity("recording",id,"genres+tags+artists+releases");collect(evidence,r,"recording","recording",id);
            JSONArray credits=r.optJSONArray("artist-credit");if(credits!=null)for(int i=0;i<credits.length();i++){JSONObject c=credits.optJSONObject(i),a=c==null?null:c.optJSONObject("artist");if(a!=null&&uuid(a.optString("id")))artistIds.add(a.optString("id"));}
            JSONArray releases=r.optJSONArray("releases");if(!has(evidence,"recording")&&releases!=null)for(int i=0;i<Math.min(4,releases.length());i++){
                JSONObject rel=releases.optJSONObject(i);if(rel==null)continue;String rid=rel.optString("id");JSONObject release=entity("release",rid,"genres+tags+release-groups"),group=release.optJSONObject("release-group");if(group!=null&&group.optJSONArray("secondary-types")!=null&&group.optJSONArray("secondary-types").toString().contains("Compilation"))continue;
                collect(evidence,release,"release","release",rid);if(group!=null){String gid=group.optString("id");collect(evidence,entity("release-group",gid,"genres+tags"),"release","release-group",gid);}if(has(evidence,"release"))break;
            }
        }
        if(evidence.length()==0&&!names.isEmpty()&&track.optDouble("duration",0)>0&&!track.optString("kind").equals("mix")){
            JSONArray results=get("https://itunes.apple.com/search?media=music&entity=song&country=US&limit=25&term="+Research.encode(names.get(0)+" "+title(track))).optJSONArray("results");LinkedHashMap<String,JSONObject> matched=new LinkedHashMap<>();
            if(results!=null)for(int i=0;i<results.length();i++){JSONObject r=results.optJSONObject(i);if(r==null||!r.optString("kind").equals("song")||!r.optString("trackViewUrl").matches("https://(?:music|itunes)\\.apple\\.com/.*"))continue;JSONObject c=Json.object("title",r.optString("trackName"),"artist",r.optString("artistName"),"duration",r.optDouble("trackTimeMillis",0)/1000);if(same(track,c)&&c.optDouble("duration",0)>0&&!r.optString("primaryGenreName").isBlank())matched.put(r.optString("primaryGenreName"),r);}
            if(matched.size()==1){JSONObject r=matched.values().iterator().next();add(evidence,r.optString("primaryGenreName"),"recording","Apple Music catalogue",r.optString("trackViewUrl"),true);}
        }
        if(artistIds.isEmpty())for(String name:names.subList(0,Math.min(4,names.size()))){
            if(key(name).equals(key(track.optString("channel")))&&track.optString("artistCreditSource").isEmpty())continue;
            JSONArray results=get("https://musicbrainz.org/ws/2/artist?fmt=json&limit=8&query="+Research.encode("artist:\""+escape(name)+"\"")).optJSONArray("artists");List<String> exact=new ArrayList<>();if(results!=null)for(int i=0;i<results.length();i++){JSONObject a=results.optJSONObject(i);if(a!=null&&key(name).equals(key(a.optString("name")))&&a.optInt("score")>=95&&uuid(a.optString("id")))exact.add(a.optString("id"));}if(exact.size()==1)artistIds.add(exact.get(0));
        }
        int count=0;for(String id:artistIds){if(count++>=4)break;collect(evidence,entity("artist",id,"genres+tags"),"artist","artist",id);}
        LinkedHashSet<String> chosen=new LinkedHashSet<>();boolean specific=false;for(int i=0;i<evidence.length();i++)if(!evidence.optJSONObject(i).optString("scope").equals("artist"))specific=true;
        for(int i=0;i<evidence.length();i++){JSONObject e=evidence.optJSONObject(i);if((!specific||!e.optString("scope").equals("artist"))&&chosen.size()<6)chosen.add(e.optString("name"));}
        // If providers are offline, retain useful earlier evidence, never erase it.
        if(!chosen.isEmpty()){Json.put(track,"genre",String.join(", ",chosen));Json.put(track,"genreEvidence",evidence);Json.put(track,"genreBasis",specific?"track":"artist");Json.put(track,"genreSource",specific?"Matched recording / release evidence":"≈ Artist catalogue suggestion");}
        Json.put(track,"genreResearchVersion",VERSION);Json.put(track,"genreCheckedAt",System.currentTimeMillis());Json.put(track,"genreError",String.join(" · ",new LinkedHashSet<>(errors)));return track;
    }
    private static boolean has(JSONArray evidence,String scope){for(int i=0;i<evidence.length();i++)if(evidence.optJSONObject(i).optString("scope").equals(scope))return true;return false;}
    public static JSONObject sourceLabels(JSONObject track,JSONObject info){
        Json.put(track,"channel",info.optString("channel",info.optString("uploader")));Json.put(track,"rawTitle",info.optString("title",track.optString("title")));
        String description=info.optString("description");Json.put(track,"description",description.substring(0,Math.min(20000,description.length())));JSONArray tags=info.optJSONArray("tags"),safe=new JSONArray();if(tags!=null)for(int i=0;i<Math.min(100,tags.length());i++)safe.put(tags.optString(i));Json.put(track,"sourceTags",safe);
        if(!Set.of("manual","confirmed").contains(track.optString("metadataStatus"))){
            JSONArray artists=info.optJSONArray("artists");if(artists!=null&&artists.length()>0)Json.put(track,"artists",artists);
            if(!info.optString("artist").isBlank()){Json.put(track,"artist",info.optString("artist"));Json.put(track,"artistCreditSource","Recording credits");}
            else{String[] parts=track.optString("rawTitle").replaceFirst("^\\[[^\\]]+\\]\\s*","").split("\\s+[-–—]\\s+",2);if(parts.length==2&&!key(parts[0]).equals(key(track.optString("channel")))){Json.put(track,"artist",parts[0].trim());Json.put(track,"artistCreditSource","Upload title");if(info.optString("track").isBlank())Json.put(track,"title",parts[1].trim());}}
        }
        return track;
    }
}
