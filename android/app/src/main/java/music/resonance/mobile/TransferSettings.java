package music.resonance.mobile;

import org.json.*;
import java.util.*;

/** Only invoked by the trusted local UI. Files are normalized and previewed before applying. */
final class TransferSettings {
    // Match the WebView's Array.join fingerprint, including integral JSON doubles.
    static String lyricStamp(JSONObject track) throws JSONException {
        List<String> parts=new ArrayList<>();
        for(String key:List.of("path","size","modified","duration")){
            Object value=track.opt(key);
            if(key.equals("modified")&&(value==null||value==JSONObject.NULL))value=track.opt("mtime");
            parts.add(value==null||value==JSONObject.NULL?"":value instanceof Number?JSONObject.numberToString((Number)value):value.toString());
        }
        return String.join("|",parts);
    }
    static JSONObject snapshot(LibraryStore lib){
        JSONObject pending=lib.setting("portableSettings");
        JSONArray tracks=lib.tracks();
        for(int i=0;i<tracks.length();i++){
            JSONObject t=tracks.optJSONObject(i);String id=t.optString("id");
            Json.put(t,"playbackEdit",lib.setting("playbackEdit:"+id));
            JSONObject offset=lib.setting("lyricOffset:"+id);
            if(offset.has("value"))Json.put(t,"lyricOffset",offset.optDouble("value"));
        }
        return Json.object("tracks",tracks,"preferences",lib.setting("preferences"),"sources",lib.sources(),
            "pending",pending.optJSONArray("songs")==null?new JSONArray():pending.optJSONArray("songs"),
            "links",pending.optJSONArray("sources")==null?new JSONArray():pending.optJSONArray("sources"));
    }
    static JSONObject store(LibraryStore lib,JSONObject data){
        JSONArray songs=data.optJSONArray("songs"),sources=data.optJSONArray("sources");
        if(songs==null||songs.length()>20000||sources==null||sources.length()>200||data.toString().length()>8_000_000)throw new IllegalArgumentException("Settings file is too large or incomplete.");
        lib.setting("portableSettings",Json.object("songs",songs,"sources",sources));return Json.object("ok",true);
    }
    static JSONObject apply(LibraryStore lib,JSONObject data) throws JSONException {
        JSONArray items=data.optJSONArray("items");
        if(items==null||items.length()>20000)throw new IllegalArgumentException("Invalid song edits.");
        synchronized(lib){
            // Preflight before opening the transaction. Never partially apply malformed cuts.
            for(int i=0;i<items.length();i++){
                JSONObject item=items.optJSONObject(i),t=lib.track(item.optString("id")),e=item.getJSONObject("record").getJSONObject("edits");
                if(t.length()==0)throw new IllegalArgumentException("A song was removed. Review the import again.");
                if(e.has("playbackEdit"))SongProfile.range(e.getJSONObject("playbackEdit"),t.optDouble("duration"));
                if(e.has("lyricOffset")&&(!Double.isFinite(e.optDouble("lyricOffset"))||Math.abs(e.optDouble("lyricOffset"))>60))throw new IllegalArgumentException("Invalid lyric offset.");
            }
            android.database.sqlite.SQLiteDatabase db=lib.getWritableDatabase();db.beginTransaction();
            try{
                for(int i=0;i<items.length();i++){
                    JSONObject item=items.getJSONObject(i),t=lib.track(item.getString("id")),e=item.getJSONObject("record").getJSONObject("edits"),patch=Json.object("id",t.optString("id"));
                    JSONArray fields=new JSONArray();
                    for(String key:List.of("title","artist","album","genre","date"))if(e.opt(key) instanceof String){Json.put(patch,key,e.optString(key));fields.put(key);}
                    Json.put(patch,"confirmFields",fields);
                    if(e.opt("favorite") instanceof Boolean)Json.put(patch,"favorite",e.optBoolean("favorite"));
                    if(e.optJSONArray("artistCredits")!=null)Json.put(patch,"artistCredits",e.optJSONArray("artistCredits"));
                    lib.edit(patch);
                    String id=t.optString("id");
                    if(e.has("playbackEdit"))lib.setting("playbackEdit:"+id,SongProfile.range(e.getJSONObject("playbackEdit"),t.optDouble("duration")));
                    if(e.has("lyricOffset")){
                        lib.setting("lyricOffset:"+id,Json.object("fileStamp",lyricStamp(t),"value",e.optDouble("lyricOffset")));
                    }
                }
                db.setTransactionSuccessful();
            }catch(JSONException error){throw new IllegalArgumentException("Invalid settings entry.",error);}
            finally{db.endTransaction();}
        }
        return Json.object("applied",items.length());
    }
}
