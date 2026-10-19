package music.resonance.mobile;

import org.json.*;
import java.io.*;
import java.net.URI;
import java.util.*;
import java.util.function.BooleanSupplier;
import java.util.regex.*;

/** Public catalogue metadata only; audio is chosen separately from YouTube. */
final class DeezerPlaylist {
    private static final int MAX_TRACKS=10000;
    interface Reader { JSONObject get(String url) throws Exception; }
    static String id(String value){
        URI u=URI.create(value.trim());Matcher match=Pattern.compile("/(?:[a-z]{2}(?:-[a-z]{2})?/)?playlist/([1-9][0-9]{0,19})/?",Pattern.CASE_INSENSITIVE).matcher(Objects.toString(u.getPath(),""));
        if(!"https".equals(u.getScheme())||!List.of("deezer.com","www.deezer.com").contains(Objects.toString(u.getHost(),"").toLowerCase(Locale.ROOT))||u.getPort()!=-1||u.getUserInfo()!=null||!match.matches())throw new IllegalArgumentException("Use a full deezer.com/playlist/… link from your browser. Only public playlists are supported; short sharing links are not supported.");
        return match.group(1);
    }
    static String pageUrl(String value,String id) throws IOException {
        URI u=URI.create(value);
        if(!List.of("http","https").contains(Objects.toString(u.getScheme(),""))||!"api.deezer.com".equals(u.getHost())||u.getPort()!=-1||u.getUserInfo()!=null||u.getFragment()!=null||!("/playlist/"+id+"/tracks").equals(u.getPath()))throw new IOException("Deezer returned an unexpected playlist page.");
        String index="0";for(String pair:Objects.toString(u.getRawQuery(),"").split("&"))if(pair.startsWith("index="))index=pair.substring(6);
        if(!index.matches("[0-9]{1,6}")||Integer.parseInt(index)>MAX_TRACKS)throw new IOException("Deezer returned an invalid playlist position.");
        return "https://api.deezer.com/playlist/"+id+"/tracks?limit=100&index="+Integer.parseInt(index);
    }
    private static JSONObject read(Reader reader,String url) throws Exception {
        JSONObject data=reader.get(url);if(data.has("error"))throw new IOException("Deezer could not read this playlist. Make it public and try again later.");return data;
    }
    static JSONObject load(String id,Reader reader,BooleanSupplier cancelled) throws Exception {
        if(!id.matches("[1-9][0-9]{0,19}"))throw new IOException("Invalid Deezer playlist.");
        JSONObject meta=read(reader,"https://api.deezer.com/playlist/"+id);
        if(!id.equals(meta.optString("id"))||!meta.optBoolean("public",true)||!meta.optString("type").equals("playlist"))throw new IOException("Deezer playlist unavailable. Only public playlists are supported.");
        String next="https://api.deezer.com/playlist/"+id+"/tracks?limit=100&index=0";int count=0,total=-1;Set<String> seen=new HashSet<>();JSONArray tracks=new JSONArray();
        while(!next.isEmpty()){
            if(cancelled.getAsBoolean())throw new InterruptedIOException("Playlist check cancelled");
            if(!seen.add(next))throw new IOException("Deezer repeated a playlist page. Try checking again.");
            JSONObject page=read(reader,next);JSONArray data=page.optJSONArray("data");int reported=page.optInt("total",-1);
            if(data==null||reported<0||reported>MAX_TRACKS)throw new IOException("Deezer returned an unsupported playlist (maximum 10,000 songs).");
            if(total!=-1&&total!=reported)throw new IOException("The Deezer playlist changed while reading it. Check it again.");total=reported;
            for(int i=0;i<data.length();i++){
                count++;if(count>MAX_TRACKS)throw new IOException("Deezer playlist exceeds 10,000 songs.");
                JSONObject t=data.optJSONObject(i),artist=t==null?null:t.optJSONObject("artist");
                if(t==null||!t.optString("id").matches("[1-9][0-9]{0,19}")||t.optString("title").isBlank()||artist==null||artist.optString("name").isBlank())continue;
                Set<String> names=new LinkedHashSet<>();names.add(artist.optString("name").trim());JSONArray contributors=t.optJSONArray("contributors");if(contributors!=null)for(int j=0;j<contributors.length();j++){JSONObject a=contributors.optJSONObject(j);if(a!=null&&!a.optString("name").isBlank())names.add(a.optString("name").trim());}
                tracks.put(Json.object("deezerId",t.optString("id"),"title",shorten(t.optString("title"),500),"artist",shorten(String.join(", ",names),500),"duration",Math.max(0,t.optDouble("duration",0)),"playlistIndex",count,"deezerUrl","https://www.deezer.com/track/"+t.optString("id")));
            }
            String link=page.optString("next");if(!link.isEmpty()&&data.length()==0)throw new IOException("Deezer returned an incomplete playlist. Try checking again.");next=link.isEmpty()?"":pageUrl(link,id);
        }
        if(count!=total)throw new IOException("Deezer returned an incomplete playlist. Try checking again.");
        return Json.object("title",shorten(meta.optString("title","Deezer playlist"),200),"tracks",tracks,"skipped",count-tracks.length(),"count",count);
    }
    private static String shorten(String text,int max){text=text.trim();return text.substring(0,Math.min(max,text.length()));}
}
