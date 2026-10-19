package music.resonance.mobile;
import org.json.*;
import java.util.*;
public final class MetadataEdits {
    static final List<String> EDITABLE=List.of("title","artist","album","genre","date");
    static final List<String> FIELDS=List.of("title","artist","album","genre","date","metadataLocks","metadataStatus","metadataSource","metadataUrl","genreLocked","genreSource","genreBasis","genreEvidence","musicbrainzArtists","recordingArtists","artists","artistCreditVersion","artistCreditSource","artistBeforeCreditRepair","manualArtists","genreIdentityStale");
    static boolean locked(JSONObject t,String field){JSONObject locks=t.optJSONObject("metadataLocks");return locks!=null&&locks.optBoolean(field)||field.equals("genre")&&t.optBoolean("genreLocked")||locks==null&&List.of("manual","confirmed").contains(t.optString("metadataStatus"));}
    static JSONObject snapshot(JSONObject t){JSONObject out=new JSONObject();for(String key:FIELDS)Json.put(out,key,t.opt(key)==null?JSONObject.NULL:t.opt(key));return Json.parse(out.toString());}
    public static JSONObject apply(JSONObject track,JSONObject patch){
        JSONObject locks=track.optJSONObject("metadataLocks");if(locks==null){locks=new JSONObject();for(String k:EDITABLE)if(locked(track,k))Json.put(locks,k,true);}
        boolean changed=false;JSONArray confirm=patch.optJSONArray("confirmFields");
        for(String key:EDITABLE){boolean confirmed=false;if(confirm!=null)for(int i=0;i<confirm.length();i++)confirmed|=key.equals(confirm.optString(i));
            if(!(patch.opt(key) instanceof String))continue;String value=patch.optString(key);value=value.substring(0,Math.min(400,value.length()));
            if(!Objects.equals(track.opt(key),value)||confirmed){changed=true;Json.put(locks,key,true);
                if(List.of("artist","title").contains(key)&&!Objects.equals(track.opt(key),value)){Json.put(track,"metadataUrl","");Json.put(track,"musicbrainzArtists",new JSONArray());if(!locked(track,"genre")&&!track.optString("genre").isBlank())Json.put(track,"genreIdentityStale",true);}
                Json.put(track,key,value);
                if(key.equals("artist")){JSONArray credits=patch.optJSONArray("artistCredits");if(credits!=null){List<String> names=new ArrayList<>();for(int i=0;i<Math.min(30,credits.length());i++)if(credits.opt(i) instanceof String&&!credits.optString(i).isBlank())names.add(credits.optString(i).trim());if(!String.join("; ",names).equals(value))throw new IllegalArgumentException("Artist credits do not match saved text");Json.put(track,"manualArtists",new JSONArray(names));}else Json.put(track,"manualArtists",JSONObject.NULL);}
                if(key.equals("genre")){Json.put(track,"genreLocked",true);Json.put(track,"genreSource","Your choice");Json.put(track,"genreBasis","manual");Json.put(track,"genreIdentityStale",false);JSONArray evidence=new JSONArray();for(String name:value.split("[,;]"))if(!name.isBlank())evidence.put(Json.object("name",name.trim(),"scope","manual","source","Your choice","confidence","manual"));Json.put(track,"genreEvidence",evidence);}
            }
        }
        for(String key:List.of("favorite","lyrics","lyricsSource"))if(patch.has(key))Json.put(track,key,patch.opt(key));
        if(changed){Json.put(track,"metadataLocks",locks);Json.put(track,"metadataSource","Your choices");Json.put(track,"metadataStatus","confirmed");}
        return track;
    }
    public static JSONObject choose(JSONObject candidate,JSONArray fields){if(fields==null||fields.length()==0)throw new IllegalArgumentException("Select at least one detail to use.");JSONObject out=new JSONObject();for(int i=0;i<fields.length();i++){String field=fields.optString(i);if(!EDITABLE.contains(field))throw new IllegalArgumentException("Unknown metadata field");if(!candidate.optString(field).isBlank())Json.put(out,field,candidate.optString(field));}if(out.length()==0)throw new IllegalArgumentException("Selected fields have no supplied values");Json.put(out,"confirmFields",fields);return out;}
}
