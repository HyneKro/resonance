package music.resonance.mobile;

import org.json.*;
import java.net.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** Lyrics network and persistence are called only on the I/O executor. */
final class LyricsAccess {
    private final LibraryStore library;
    private long nextAt;
    LyricsAccess(LibraryStore library){this.library=library;}
    static String stamp(JSONObject t){return t.optString("title")+"|"+t.optString("artist")+"|"+t.optString("album")+"|"+Math.round(t.optDouble("duration",0));}
    JSONObject cached(String id){JSONObject t=library.track(id);return Json.object("track",t,"record",library.setting("trackLyrics:"+id));}
    JSONObject save(String id,JSONObject record){
        synchronized(library){
            JSONObject t=library.track(id);if(t.length()==0||!stamp(t).equals(record.optString("stamp")))throw new IllegalArgumentException("Song details changed. Find lyrics again.");
            JSONObject previous=library.setting("trackLyrics:"+id);
            if(previous.optBoolean("confirmed")&&!record.optBoolean("confirmed")&&stamp(t).equals(previous.optString("stamp")))return previous;
            if(record.toString().length()>400000)throw new IllegalArgumentException("Lyrics are too large");
            library.setting("trackLyrics:"+id,record);
            Json.put(t,"lyrics",record.optString("text"));Json.put(t,"lyricsSource",record.optString("source"));library.save(t);
            return record;
        }
    }
    synchronized JSONObject request(String address) throws Exception {
        URI uri=URI.create(address);
        if(!"https".equals(uri.getScheme())||!"lrclib.net".equals(uri.getHost())||uri.getPort()!=-1||uri.getUserInfo()!=null||uri.getFragment()!=null||address.length()>3000||!List.of("/api/get","/api/search").contains(uri.getPath()))throw new IOException("Unsupported lyrics request");
        long delay=nextAt-System.currentTimeMillis();if(delay>30000)throw new IOException("Lyrics service is resting. Try again later.");if(delay>0)Thread.sleep(delay);
        HttpURLConnection c=(HttpURLConnection)uri.toURL().openConnection();c.setConnectTimeout(12000);c.setReadTimeout(15000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","ResonanceAndroid/0.22.0 (https://github.com/HyneKro/resonance)");
        try{
            int status=c.getResponseCode();nextAt=System.currentTimeMillis()+(status>=400&&status!=404?1500:400);
            String retry=c.getHeaderField("Retry-After");if(retry!=null)try{nextAt=Math.max(nextAt,System.currentTimeMillis()+Math.max(0,Long.parseLong(retry))*1000);}catch(NumberFormatException ignored){try{nextAt=Math.max(nextAt,java.time.ZonedDateTime.parse(retry,java.time.format.DateTimeFormatter.RFC_1123_DATE_TIME).toInstant().toEpochMilli());}catch(Exception ignoredDate){}}
            if(status<200||status>=300)return Json.object("status",status);
            try(InputStream input=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){
                byte[] bytes=new byte[8192];int n,total=0;while((n=input.read(bytes))!=-1){if((total+=n)>6_000_000)throw new IOException("Lyrics response too large");out.write(bytes,0,n);}
                Object data=new JSONTokener(out.toString(StandardCharsets.UTF_8.name())).nextValue();return Json.object("status",status,"data",data);
            }
        }finally{c.disconnect();}
    }
}
