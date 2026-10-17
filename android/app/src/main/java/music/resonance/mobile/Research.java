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
        String title=t.optString("title").replaceAll("(?i)\\s*[\\[(](official.*|lyrics.*|audio.*)[\\])].*","").replace('"',' '),artist=t.optString("artist").replace('"',' ');
        JSONObject data=cachedGenreRead("https://musicbrainz.org/ws/2/recording/?fmt=json&limit=8&query="+encode("recording:\""+title+"\""+(artist.isBlank()?"":" AND artist:\""+artist+"\"")));
        JSONArray records=data.optJSONArray("recordings"),out=new JSONArray();if(records==null)return out;
        for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);JSONArray credits=r.optJSONArray("artist-credit"),tags=r.optJSONArray("tags"),releases=r.optJSONArray("releases");StringBuilder artists=new StringBuilder(),genres=new StringBuilder();if(credits!=null)for(int j=0;j<credits.length();j++){JSONObject c=credits.optJSONObject(j);if(c!=null)artists.append(c.optString("name")).append(c.optString("joinphrase"));}if(tags!=null)for(int j=0;j<tags.length();j++){if(j>0)genres.append(", ");genres.append(tags.getJSONObject(j).optString("name"));}JSONObject release=releases==null||releases.length()==0?new JSONObject():releases.getJSONObject(0);
            out.put(Json.object("title",r.optString("title"),"artist",artists.toString(),"album",release.optString("title"),"date",release.optString("date"),"genre",genres.toString(),"duration",r.optDouble("length",0)/1000,"score",r.optInt("score"),"mbid",r.optString("id"),"url","https://musicbrainz.org/recording/"+r.optString("id")));
        }return out;
    }
    public JSONObject discover(String id,boolean force) throws Exception {
        LibraryStore lib=app.library;JSONObject t=lib.track(id);if(t.length()==0)throw new IOException("Track unavailable");if(!force&&System.currentTimeMillis()-t.optLong("researchedAt")<30L*24*3600*1000)return t.optInt("genreResearchVersion")==GenreResearch.VERSION?t:genres(id);
        // Catalogue genre and cover are suggestions until recording identity is verified.
        JSONObject original=Json.parse(t.toString());JSONObject catalogue;try{catalogue=cachedGenreRead("https://itunes.apple.com/search?entity=song&limit=8&term="+encode(t.optString("artist")+" "+t.optString("title")));}catch(Exception e){catalogue=new JSONObject();}JSONArray results=catalogue.optJSONArray("results");
        if(results!=null)for(int i=0;i<results.length();i++){JSONObject match=results.getJSONObject(i);boolean title=normalize(match.optString("trackName")).equals(normalize(t.optString("title")));boolean artist=normalize(match.optString("artistName")).equals(normalize(t.optString("artist")));boolean duration=Math.abs(match.optDouble("trackTimeMillis")/1000-t.optDouble("duration"))<6;if(!title||!artist||!duration)continue;
            if(!t.optBoolean("genreLocked")&&t.optString("genre").isBlank()){Json.put(t,"genre",match.optString("primaryGenreName"));Json.put(t,"genreSource","Apple catalogue · title, artist and duration match");}
            if(t.optString("album").isBlank())Json.put(t,"album",match.optString("collectionName"));if(t.optString("date").isBlank())Json.put(t,"date",match.optString("releaseDate"));
            if(!new File(lib.artwork,t.optString("artwork")).isFile()){String art=match.optString("artworkUrl100").replace("100x100bb","600x600bb");URI uri=URI.create(art);if(uri.getHost()!=null&&uri.getHost().endsWith(".mzstatic.com")){Json.put(t,"artworkSource",art);lib.cacheCover(id,get(art,6_000_000));Json.put(t,"artwork",id+".jpg");}}break;
        }
        try{JSONObject discovered=genres(id);for(String k:List.of("genre","genreBasis","genreEvidence","genreSource","genreResearchVersion","genreCheckedAt","genreError"))if(discovered.has(k))Json.put(t,k,discovered.opt(k));}catch(Exception ignored){}
        if(t.optString("lyrics").isBlank())try{JSONArray matches=lyricsSearch(t);JSONObject chosen=null;for(int i=0;i<matches.length();i++){JSONObject c=matches.getJSONObject(i);if(normalize(c.optString("trackName")).equals(normalize(t.optString("title")))&&normalize(c.optString("artistName")).equals(normalize(t.optString("artist")))&&Math.abs(c.optDouble("duration")-t.optDouble("duration"))<3){chosen=c;break;}}if(chosen!=null){Json.put(t,"lyrics",chosen.optString("syncedLyrics").isBlank()?chosen.optString("plainLyrics"):chosen.optString("syncedLyrics"));Json.put(t,"lyricsSource","LRCLIB · matched title, artist and duration");}}catch(Exception ignored){}
        synchronized(lib){JSONObject latest=lib.track(id);for(String key:List.of("genre","genreSource","genreBasis","genreEvidence","genreResearchVersion","genreCheckedAt","genreError","album","date","artwork","artworkSource","lyrics","lyricsSource")){if(key.startsWith("genre")&&latest.optBoolean("genreLocked"))continue;if(latest.optJSONObject("metadataLocks")!=null&&latest.optJSONObject("metadataLocks").optBoolean(key))continue;if(Objects.equals(original.opt(key),latest.opt(key))&&t.has(key))Json.put(latest,key,t.opt(key));}Json.put(latest,"researchedAt",System.currentTimeMillis());lib.save(latest);return latest;}
    }
    private long lastCatalogue,mbBlockedUntil,catalogueBlockedUntil;
    private final Object requestLock=new Object();
    private JSONObject cachedGenreRead(String url) throws Exception {
        String key="genre-v5:"+LibraryStore.id(url);LibraryStore lib=app.library;
        synchronized(requestLock){
            JSONObject cache=lib.setting(key);if(cache.optJSONObject("data")!=null&&System.currentTimeMillis()-cache.optLong("at")<30L*86400000)return cache.optJSONObject("data");
            boolean mb=url.startsWith("https://musicbrainz.org/");if(System.currentTimeMillis()<(mb?mbBlockedUntil:catalogueBlockedUntil))throw new IOException("Metadata service is resting after a connection error. Try again shortly.");long delay=(mb?1100:3200)-(System.currentTimeMillis()-(mb?lastMusicBrainz:lastCatalogue));if(delay>0)Thread.sleep(delay);
            if(mb)lastMusicBrainz=System.currentTimeMillis();else lastCatalogue=System.currentTimeMillis();
            JSONObject value;try{value=json(url);}catch(Exception e){long retry=System.currentTimeMillis()+60000;if(mb)mbBlockedUntil=retry;else catalogueBlockedUntil=retry;throw e;}
            // Bound reusable provider responses; the compact per-song evidence is
            // retained independently, including when an old cache entry expires.
            JSONArray previous=lib.setting("genre-cache-index").optJSONArray("items");List<JSONObject> entries=new ArrayList<>();long bytes=0;
            if(previous!=null)for(int i=0;i<previous.length();i++){JSONObject entry=previous.optJSONObject(i);if(entry!=null&&!entry.optString("key").equals(key)){entries.add(entry);bytes+=entry.optLong("bytes");}}
            long size=value.toString().getBytes(StandardCharsets.UTF_8).length;entries.add(Json.object("key",key,"bytes",size));bytes+=size;
            while(entries.size()>1024||bytes>8*1024*1024){JSONObject oldest=entries.remove(0);bytes-=oldest.optLong("bytes");lib.setting(oldest.optString("key"),new JSONObject());}
            lib.setting(key,Json.object("at",System.currentTimeMillis(),"data",value));lib.setting("genre-cache-index",Json.object("items",new JSONArray(entries)));return value;
        }
    }
    private long genreSeedRevision=-1;
    private JSONObject taxonomy() throws Exception {try(InputStream in=app.getAssets().open("web/genre-taxonomy.json");ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[4096];int n;while((n=in.read(buffer))!=-1)out.write(buffer,0,n);return new JSONObject(out.toString("UTF-8"));}}
    public synchronized void seedLocal() throws Exception {LibraryStore lib=app.library;if(genreSeedRevision==lib.revision.get())return;synchronized(lib){JSONArray changed=new GenreResearch(this::cachedGenreRead,taxonomy()).seed(lib.tracks());for(int i=0;i<changed.length();i++)lib.save(changed.getJSONObject(i));genreSeedRevision=lib.revision.get();}}
    public JSONObject genres(String id) throws Exception {
        LibraryStore lib=app.library;JSONObject before=lib.track(id);if(before.length()==0)throw new IOException("Track unavailable");if(before.optBoolean("genreLocked"))return before;
        JSONObject taxonomy=taxonomy();
        JSONObject result=new GenreResearch(this::cachedGenreRead,taxonomy).discover(Json.parse(before.toString()));
        synchronized(lib){JSONObject latest=lib.track(id);if(latest.length()==0||latest.optBoolean("genreLocked"))return latest;
            for(String key:List.of("title","artist","duration","genre"))if(!Objects.equals(before.opt(key),latest.opt(key)))return latest;
            for(String key:List.of("genre","genreBasis","genreEvidence","genreSource","genreResearchVersion","genreCheckedAt","genreError"))if(result.has(key))Json.put(latest,key,result.opt(key));lib.save(latest);return latest;
        }
    }
    public JSONArray lyricsSearch(JSONObject t) throws Exception{return new JSONArray(new String(get("https://lrclib.net/api/search?track_name="+encode(t.optString("title"))+"&artist_name="+encode(t.optString("artist")),4_000_000),StandardCharsets.UTF_8));}
    public static String normalize(String s){return java.text.Normalizer.normalize(s,java.text.Normalizer.Form.NFKD).replaceAll("\\p{M}","").toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}]","");}
}
