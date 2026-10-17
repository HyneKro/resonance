package music.resonance.mobile;

import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;

public final class Research {
    private final ResonanceApp app;
    private long lastMusicBrainz;
    Research(ResonanceApp app){this.app=app;}
    public static String encode(String s){try{return URLEncoder.encode(s,"UTF-8");}catch(UnsupportedEncodingException e){throw new IllegalStateException(e);}}
    public static byte[] get(String url,int max) throws IOException {
        URL u=new URL(url);if(!u.getProtocol().equals("https"))throw new IOException("HTTPS is required");
        HttpURLConnection connection=(HttpURLConnection)u.openConnection();connection.setConnectTimeout(12000);connection.setReadTimeout(20000);connection.setRequestProperty("User-Agent","ResonanceAndroid/0.1 (personal local music player)");connection.setInstanceFollowRedirects(false);
        try{int code=connection.getResponseCode();if(code<200||code>=300)throw new IOException("Service unavailable ("+code+")");try(InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[16384];int n,total=0;while((n=in.read(buffer))!=-1){total+=n;if(total>max)throw new IOException("Response is too large");out.write(buffer,0,n);}return out.toByteArray();}}finally{connection.disconnect();}
    }
    public static JSONObject json(String url) throws Exception{return new JSONObject(new String(get(url,4_000_000),StandardCharsets.UTF_8));}
    public JSONArray search(JSONObject t) throws Exception {
        synchronized(this){long delay=1100-(System.currentTimeMillis()-lastMusicBrainz);if(delay>0)Thread.sleep(delay);lastMusicBrainz=System.currentTimeMillis();}
        String title=t.optString("title").replaceAll("(?i)\\s*[\\[(](official.*|lyrics.*|audio.*)[\\])].*","").replace('"',' '),artist=t.optString("artist").replace('"',' ');
        JSONObject data=json("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query="+encode("recording:\""+title+"\""+(artist.isBlank()?"":" AND artist:\""+artist+"\"")));
        JSONArray records=data.optJSONArray("recordings"),out=new JSONArray();if(records==null)return out;
        for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);JSONArray credits=r.optJSONArray("artist-credit"),tags=r.optJSONArray("tags"),releases=r.optJSONArray("releases");StringBuilder artists=new StringBuilder(),genres=new StringBuilder();if(credits!=null)for(int j=0;j<credits.length();j++){JSONObject c=credits.optJSONObject(j);if(c!=null)artists.append(c.optString("name")).append(c.optString("joinphrase"));}if(tags!=null)for(int j=0;j<tags.length();j++){if(j>0)genres.append(", ");genres.append(tags.getJSONObject(j).optString("name"));}JSONObject release=releases==null||releases.length()==0?new JSONObject():releases.getJSONObject(0);
            out.put(Json.object("title",r.optString("title"),"artist",artists.toString(),"album",release.optString("title"),"date",release.optString("date"),"genre",genres.toString(),"duration",r.optDouble("length",0)/1000,"score",r.optInt("score"),"mbid",r.optString("id"),"url","https://musicbrainz.org/recording/"+r.optString("id")));
        }return out;
    }
    public JSONObject discover(String id,boolean force) throws Exception {
        LibraryStore lib=app.library;JSONObject t=lib.track(id);if(t.length()==0)throw new IOException("Track unavailable");if(!force&&System.currentTimeMillis()-t.optLong("researchedAt")<30L*24*3600*1000)return t;
        // Catalogue genre and cover are suggestions until recording identity is verified.
        JSONObject original=Json.parse(t.toString());JSONObject catalogue;try{catalogue=json("https://itunes.apple.com/search?entity=song&limit=8&term="+encode(t.optString("artist")+" "+t.optString("title")));}catch(Exception e){catalogue=new JSONObject();}JSONArray results=catalogue.optJSONArray("results");
        if(results!=null)for(int i=0;i<results.length();i++){JSONObject match=results.getJSONObject(i);boolean title=normalize(match.optString("trackName")).equals(normalize(t.optString("title")));boolean artist=normalize(match.optString("artistName")).equals(normalize(t.optString("artist")));boolean duration=Math.abs(match.optDouble("trackTimeMillis")/1000-t.optDouble("duration"))<6;if(!title||!artist||!duration)continue;
            if(!t.optBoolean("genreLocked")&&t.optString("genre").isBlank()){Json.put(t,"genre",match.optString("primaryGenreName"));Json.put(t,"genreSource","Apple catalogue · title, artist and duration match");}
            if(t.optString("album").isBlank())Json.put(t,"album",match.optString("collectionName"));if(t.optString("date").isBlank())Json.put(t,"date",match.optString("releaseDate"));
            if(!new File(lib.artwork,t.optString("artwork")).isFile()){String art=match.optString("artworkUrl100").replace("100x100bb","600x600bb");URI uri=URI.create(art);if(uri.getHost()!=null&&uri.getHost().endsWith(".mzstatic.com")){Json.put(t,"artworkSource",art);lib.cacheCover(id,get(art,6_000_000));Json.put(t,"artwork",id+".jpg");}}break;
        }
        if(t.optString("genre").isBlank()&&!t.optBoolean("genreLocked"))try{JSONArray candidates=search(t);for(int i=0;i<candidates.length();i++){JSONObject c=candidates.getJSONObject(i);if(c.optInt("score")<95||!normalize(c.optString("title")).equals(normalize(t.optString("title")))||!normalize(c.optString("artist")).equals(normalize(t.optString("artist")))||Math.abs(c.optDouble("duration")-t.optDouble("duration"))>4)continue;Thread.sleep(1100);JSONObject recording=json("https://musicbrainz.org/ws/2/recording/"+c.getString("mbid")+"?fmt=json&inc=genres+artist-credits");JSONArray genres=recording.optJSONArray("genres");String basis="MusicBrainz recording";if(genres==null||genres.length()==0){JSONArray credits=recording.optJSONArray("artist-credit");if(credits!=null&&credits.length()>0){String artist=credits.getJSONObject(0).getJSONObject("artist").getString("id");Thread.sleep(1100);genres=json("https://musicbrainz.org/ws/2/artist/"+artist+"?fmt=json&inc=genres").optJSONArray("genres");basis="≈ MusicBrainz artist suggestion";}}if(genres!=null&&genres.length()>0){List<String> names=new ArrayList<>();for(int j=0;j<Math.min(4,genres.length());j++)names.add(genres.getJSONObject(j).optString("name"));Json.put(t,"genre",String.join(", ",names));Json.put(t,"genreSource",basis);}break;}}catch(Exception ignored){}
        if(t.optString("lyrics").isBlank())try{JSONArray matches=lyricsSearch(t);JSONObject chosen=null;for(int i=0;i<matches.length();i++){JSONObject c=matches.getJSONObject(i);if(normalize(c.optString("trackName")).equals(normalize(t.optString("title")))&&normalize(c.optString("artistName")).equals(normalize(t.optString("artist")))&&Math.abs(c.optDouble("duration")-t.optDouble("duration"))<3){chosen=c;break;}}if(chosen!=null){Json.put(t,"lyrics",chosen.optString("syncedLyrics").isBlank()?chosen.optString("plainLyrics"):chosen.optString("syncedLyrics"));Json.put(t,"lyricsSource","LRCLIB · matched title, artist and duration");}}catch(Exception ignored){}
        synchronized(lib){JSONObject latest=lib.track(id);for(String key:List.of("genre","genreSource","album","date","artwork","artworkSource","lyrics","lyricsSource")){if(key.startsWith("genre")&&latest.optBoolean("genreLocked"))continue;if(latest.optJSONObject("metadataLocks")!=null&&latest.optJSONObject("metadataLocks").optBoolean(key))continue;if(Objects.equals(original.opt(key),latest.opt(key))&&t.has(key))Json.put(latest,key,t.opt(key));}Json.put(latest,"researchedAt",System.currentTimeMillis());lib.save(latest);return latest;}
    }
    public JSONArray lyricsSearch(JSONObject t) throws Exception{return new JSONArray(new String(get("https://lrclib.net/api/search?track_name="+encode(t.optString("title"))+"&artist_name="+encode(t.optString("artist")),4_000_000),StandardCharsets.UTF_8));}
    public static String normalize(String s){return java.text.Normalizer.normalize(s,java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]","");}
}
