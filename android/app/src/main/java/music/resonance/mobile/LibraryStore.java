package music.resonance.mobile;

import android.content.*;
import android.database.Cursor;
import android.database.sqlite.*;
import android.graphics.*;
import android.media.MediaMetadataRetriever;
import android.net.Uri;
import android.os.StatFs;
import androidx.documentfile.provider.DocumentFile;
import org.json.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

public final class LibraryStore extends SQLiteOpenHelper {
    final Context context;
    public final File artwork,music;
    public volatile String scanStatus="";
    public volatile boolean scanning;
    public final java.util.concurrent.atomic.AtomicLong revision=new java.util.concurrent.atomic.AtomicLong(System.currentTimeMillis());
    public volatile JSONObject scanResult=Json.object("running",false,"message","", "found",0);
    private int scanFound,scanSkipped;private final List<String> scanErrors=new ArrayList<>();
    LibraryStore(Context c){super(c,"resonance.db",null,1);context=c;artwork=new File(c.getCacheDir(),"artwork");music=new File(c.getExternalFilesDir(null),"Music");artwork.mkdirs();music.mkdirs();getWritableDatabase();migrateArtistCredits();}
    private void migrateArtistCredits(){SQLiteDatabase db=getWritableDatabase();db.beginTransaction();try{JSONArray tracks=list("tracks");for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t.optInt("artistCreditVersion")!=ArtistCredits.VERSION)put("tracks",t.optString("id"),ArtistCredits.repair(t));}db.setTransactionSuccessful();}finally{db.endTransaction();}}
    @Override public void onConfigure(SQLiteDatabase db){db.enableWriteAheadLogging();}
    @Override public void onCreate(SQLiteDatabase db){db.execSQL("CREATE TABLE tracks (id TEXT PRIMARY KEY,json TEXT NOT NULL)");db.execSQL("CREATE TABLE settings (id TEXT PRIMARY KEY,json TEXT NOT NULL)");db.execSQL("CREATE TABLE playlists (id TEXT PRIMARY KEY,json TEXT NOT NULL)");}
    @Override public void onUpgrade(SQLiteDatabase db,int a,int b){}
    public static String id(String value){try{byte[] bytes=MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(int i=0;i<12;i++)s.append(String.format(Locale.ROOT,"%02x",bytes[i]));return s.toString();}catch(Exception e){throw new IllegalStateException(e);}}
    private JSONObject get(String table,String id){try(Cursor c=getReadableDatabase().query(table,new String[]{"json"},"id=?",new String[]{id},null,null,null)){return c.moveToFirst()?Json.parse(c.getString(0)):new JSONObject();}}
    private void put(String table,String id,JSONObject value){ContentValues v=new ContentValues();v.put("id",id);v.put("json",value.toString());if(getWritableDatabase().insertWithOnConflict(table,null,v,SQLiteDatabase.CONFLICT_REPLACE)<0)throw new SQLiteException("Could not save the music library");}
    private JSONArray list(String table){JSONArray out=new JSONArray();try(Cursor c=getReadableDatabase().rawQuery("SELECT json FROM "+table+" ORDER BY rowid",null)){while(c.moveToNext())out.put(Json.parse(c.getString(0)));}return out;}
    public JSONObject track(String id){return get("tracks",id);}
    /** Called on the loader thread, so path checks never scan a whole queue on the UI thread. */
    public synchronized Uri playbackUri(String id,Uri original){
        JSONObject t=track(id);if(t.length()==0)return original;
        String path=t.optString("path");File file=LocalMusicFiles.resolve(music,path,t.optString("fileName"),t.optString("youtubeId"),t.optBoolean("downloaded"));
        if(!LocalMusicFiles.readable(file))return path.isEmpty()?original:Uri.parse(path);
        Uri resolved=Uri.fromFile(file);if(!resolved.toString().equals(path)){Json.put(t,"path",resolved.toString());Json.put(t,"fileName",file.getName());Json.put(t,"available",true);save(t);}
        return resolved;
    }
    public JSONObject audioDetails(String id){
        JSONObject t=track(id);if(t.length()==0)return Json.object("readable",false,"fileError","No song selected");
        String before=t.optString("path");Uri uri=playbackUri(id,Uri.parse(before));File file=LocalMusicFiles.file(uri.toString());
        JSONObject out=Json.object("title",t.optString("title"),"fileName",t.optString("fileName"),"location","content".equals(uri.getScheme())?"Linked folder":"App storage","path",uri.toString(),"pathRepaired",!uri.toString().equals(before),"recordedBytes",t.optLong("size"),"actualBytes",file!=null?file.length():-1,"readable",false,"format",t.optString("codec"));
        try(InputStream input=context.getContentResolver().openInputStream(uri)){
            if(input==null||input.read()==-1)throw new IOException("The saved file is empty");Json.put(out,"readable",true);
        }catch(Exception e){Json.put(out,"fileError",Json.error(e));return out;}
        android.media.MediaExtractor extractor=new android.media.MediaExtractor();
        try{extractor.setDataSource(context,uri,null);JSONArray streams=new JSONArray();for(int i=0;i<extractor.getTrackCount();i++){android.media.MediaFormat f=extractor.getTrackFormat(i);String mime=f.getString(android.media.MediaFormat.KEY_MIME);if(mime!=null&&mime.startsWith("audio/"))streams.put(mime);}Json.put(out,"audioStreams",streams);if(streams.length()==0)Json.put(out,"formatNotice","Android did not identify an audio stream");}
        catch(Exception e){Json.put(out,"formatNotice",Json.error(e));}finally{extractor.release();}
        return out;
    }
    public synchronized void link(String id,String source,int order){if(!PendingDownloads.connected(sources(),source))return;JSONObject t=track(id);if(t.length()==0)return;JSONObject orders=t.optJSONObject("sourceOrders");if(orders==null)orders=new JSONObject();Json.put(orders,source,order);Json.put(t,"sourceOrders",orders);save(t);}
    public synchronized void save(JSONObject t){if(t.optString("id").isEmpty())throw new IllegalArgumentException("Missing track ID");JSONObject before=track(t.optString("id"));ArtistCredits.repair(t);put("tracks",t.optString("id"),t);for(String key:List.of("title","artist","artists","album","genre","artwork","date","path","available","favorite","sourceOrders","plays"))if(!Objects.toString(before.opt(key),"").equals(Objects.toString(t.opt(key),""))){revision.incrementAndGet();break;}}
    public synchronized JSONObject edit(JSONObject patch){JSONObject t=track(patch.optString("id"));if(t.length()==0)throw new IllegalArgumentException("Track unavailable");JSONObject before=MetadataEdits.snapshot(t);MetadataEdits.apply(t,patch);save(t);JSONObject after=MetadataEdits.snapshot(t);if(!before.toString().equals(after.toString()))setting("metadataUndo:"+t.optString("id"),Json.object("before",before,"after",after));return t;}
    public synchronized JSONObject undoMetadata(String id){JSONObject t=track(id),undo=setting("metadataUndo:"+id),after=undo.optJSONObject("after"),before=undo.optJSONObject("before");if(before==null||after==null)throw new IllegalArgumentException("No recent metadata change to undo.");if(!after.toString().equals(MetadataEdits.snapshot(t).toString()))throw new IllegalArgumentException("Details have changed since that edit. Review them first.");for(String key:MetadataEdits.FIELDS)Json.put(t,key,before.opt(key));save(t);setting("metadataUndo:"+id,new JSONObject());return t;}
    public JSONObject setting(String id){return get("settings",id);}
    public synchronized void setting(String id,JSONObject value){put("settings",id,value);}
    public JSONArray tracks(){return list("tracks");}
    public JSONArray playlists(){return list("playlists");}
    public JSONObject savePlaylist(JSONObject p){if(p.optString("id").isEmpty())Json.put(p,"id",UUID.randomUUID().toString());if(p.optJSONArray("tracks")==null)Json.put(p,"tracks",new JSONArray());put("playlists",p.optString("id"),p);revision.incrementAndGet();return p;}
    public void deletePlaylist(String id){getWritableDatabase().delete("playlists","id=?",new String[]{id});revision.incrementAndGet();}
    public JSONArray sources(){JSONArray a=setting("sources").optJSONArray("items");return a==null?new JSONArray():a;}
    public synchronized JSONObject source(JSONObject source){
        JSONArray all=sources(),out=new JSONArray();String key=source.optString("id");
        if(key.isEmpty())for(int i=0;i<all.length();i++){JSONObject old=all.optJSONObject(i);if(old.optString("type").equals(source.optString("type"))&&(!source.optString("uri").isEmpty()&&old.optString("uri").equals(source.optString("uri"))||!source.optString("url").isEmpty()&&old.optString("url").equals(source.optString("url")))){key=old.optString("id");break;}}
        if(key.isEmpty())key=UUID.randomUUID().toString();Json.put(source,"id",key);
        if(source.optString("name").isBlank())Json.put(source,"name",source.optString("type").equals("spotify")?"Spotify playlist":source.optString("type").equals("deezer")?"Deezer playlist":"YouTube playlist");
        for(int i=0;i<all.length();i++)if(!all.optJSONObject(i).optString("id").equals(key))out.put(all.optJSONObject(i));out.put(source);setting("sources",Json.object("items",out));revision.incrementAndGet();return source;
    }
    public synchronized void disconnect(String id){JSONArray out=new JSONArray(),all=sources();for(int i=0;i<all.length();i++)if(!all.optJSONObject(i).optString("id").equals(id))out.put(all.optJSONObject(i));setting("sources",Json.object("items",out));revision.incrementAndGet();}
    public synchronized boolean updateConnectedSource(JSONObject source){if(!PendingDownloads.connected(sources(),source.optString("id")))return false;source(source);return true;}
    public JSONObject snapshot(){return Json.object("revision",revision.get(),"destination",setting("downloadDestination"),"tracks",tracks(),"sources",sources(),"playlists",playlists(),"preferences",setting("preferences"),"player",setting("player"));}
    public synchronized JSONObject updatePreferences(JSONObject patch){JSONObject prefs=setting("preferences");for(Iterator<String> i=patch.keys();i.hasNext();){String key=i.next();Json.put(prefs,key,patch.opt(key));}setting("preferences",prefs);if(patch.has("cacheMB"))trimArtwork();return prefs;}
    public void scan(){
        synchronized(this){if(scanning)return;scanning=true;scanFound=scanSkipped=0;scanErrors.clear();scanResult=Json.object("running",true,"message","Looking for audio files…","found",0);}
        try{JSONArray sources=sources();for(int i=0;i<sources.length();i++){JSONObject source=sources.optJSONObject(i);if(!"folder".equals(source.optString("type")))continue;try{
            DocumentFile tree=DocumentFile.fromTreeUri(context,Uri.parse(source.optString("uri")));
            if(tree==null||!tree.exists()||!tree.canRead())throw new IOException("Folder permission is missing. Add this folder again.");
            scanTree(tree,source,new int[]{0});importLocalPlaylists(tree,source.optString("id"));
        }catch(Exception e){if(scanErrors.size()<3)scanErrors.add(source.optString("name")+": "+Json.error(e));}}
        }finally{scanning=false;scanStatus=scanFound==0?"No audio files in your linked folders. To fill an empty folder, choose Download a playlist.":"Library updated · "+scanFound+" audio files";scanResult=Json.object("running",false,"message",scanStatus,"found",scanFound,"skipped",scanSkipped,"error",String.join(" · ",scanErrors));revision.incrementAndGet();}
    }
    private void scanTree(DocumentFile dir,JSONObject source,int[] order) throws Exception {
        DocumentFile[] children=dir.listFiles();Arrays.sort(children,Comparator.comparing(f->Objects.toString(f.getName(),""),String.CASE_INSENSITIVE_ORDER));
        Map<String,DocumentFile> neighbours=new HashMap<>();for(DocumentFile file:children)neighbours.put(Objects.toString(file.getName(),""),file);
        for(DocumentFile f:children){if(Thread.currentThread().isInterrupted())throw new InterruptedException();if(f.isDirectory())scanTree(f,source,order);else if(isAudio(f.getName())){try{scanStatus=f.getName();String base=f.getName().replaceFirst("\\.[^.]+$","");JSONObject supplied=null;DocumentFile info=neighbours.get(base+".info.json");if(info!=null&&info.length()<4_000_000)try(InputStream in=context.getContentResolver().openInputStream(info.getUri())){JSONObject data=Json.parse(new String(boundedRead(in,4_000_000),StandardCharsets.UTF_8));String video=data.optString("id");if(video.matches("[A-Za-z0-9_-]{11}"))supplied=Json.object("youtubeId",video,"title",data.optString("track",data.optString("title",base)),"artist",data.optString("artist",data.optString("uploader")),"date",data.optString("release_date",data.optString("upload_date")),"views",data.optLong("view_count"));}catch(Exception ignored){}
            JSONObject track=readAudio(f.getUri(),f.getName(),f.length(),f.lastModified(),source.optString("id"),++order[0],supplied);
            if(!new File(artwork,track.optString("artwork")).isFile())for(String ext:List.of(".jpg",".png",".webp")){DocumentFile cover=neighbours.get(base+ext);if(cover!=null&&cover.length()<8_000_000)try(InputStream in=context.getContentResolver().openInputStream(cover.getUri())){cacheCover(track.optString("id"),boundedRead(in,8_000_000));Json.put(track,"artwork",track.optString("id")+".jpg");save(track);break;}catch(Exception ignored){}}
            scanFound++;scanResult=Json.object("running",true,"message","Reading "+f.getName(),"found",scanFound,"skipped",scanSkipped);
        }catch(Exception e){scanSkipped++;if(scanErrors.size()<3)scanErrors.add(f.getName()+": "+Json.error(e));}}}
    }
    public static boolean isAudio(String name){return name!=null&&name.toLowerCase(Locale.ROOT).matches(".*\\.(mp3|m4a|aac|flac|wav|ogg|opus|webm|mp4|aiff|alac)$");}
    private static byte[] boundedRead(InputStream in,int max) throws IOException {try(ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n,total=0;while((n=in.read(buffer))!=-1){total+=n;if(total>max)throw new IOException("Sidecar is too large");out.write(buffer,0,n);}return out.toByteArray();}}
    private void importLocalPlaylists(DocumentFile folder,String sourceId) throws Exception {
        for(DocumentFile file:folder.listFiles()){
            if(file.isDirectory()){importLocalPlaylists(file,sourceId);continue;}
            String name=Objects.toString(file.getName(),"");if(!name.toLowerCase(Locale.ROOT).matches(".*\\.m3u8?")||file.length()>2_000_000)continue;
            JSONArray ids=new JSONArray(),tracks=tracks();Set<String> seen=new HashSet<>();
            try(BufferedReader reader=new BufferedReader(new InputStreamReader(context.getContentResolver().openInputStream(file.getUri()),StandardCharsets.UTF_8))){String line;while((line=reader.readLine())!=null){line=line.replace("\uFEFF","").trim().replace('\\','/');if(line.isEmpty()||line.startsWith("#")||line.matches("(?i)https?://.*"))continue;String basename=line.substring(line.lastIndexOf('/')+1),candidate=null;int count=0;for(int i=0;i<tracks.length();i++){JSONObject track=tracks.getJSONObject(i);if(sourceId.equals(track.optString("sourceId"))&&basename.equalsIgnoreCase(track.optString("fileName"))){candidate=track.optString("id");count++;}}if(count==1&&seen.add(candidate))ids.put(candidate);}}
            savePlaylist(Json.object("id",id("m3u:"+file.getUri()),"name",name.replaceFirst("(?i)\\.m3u8?$",""),"tracks",ids,"imported",true,"sourceId",sourceId));
        }
    }
    public JSONObject readAudio(Uri uri,String name,long size,long modified,String sourceId,int order,JSONObject supplied) throws Exception {
        if(supplied==null){java.util.regex.Matcher match=java.util.regex.Pattern.compile("\\[([A-Za-z0-9_-]{11})\\](?:\\.[^.]+){1,2}$").matcher(name);if(match.find())supplied=Json.object("youtubeId",match.group(1));}
        String key=supplied!=null&&supplied.has("youtubeId")?id("youtube:"+supplied.optString("youtubeId")):id(uri.toString());JSONObject old=track(key);
        if(old.length()>0&&old.optLong("modified")==modified&&old.optLong("size")==size&&supplied==null&&new File(artwork,old.optString("artwork")).isFile()){Json.put(old,"available",true);Json.put(old,"playlistIndex",order);save(old);link(key,sourceId,order);return track(key);}
        JSONObject t=old.length()>0?old:Json.object("id",key,"title",name.replaceFirst("\\.[^.]+$",""),"artist","","genre","","album","","date","","plays",0,"listenedSeconds",0,"favorite",false,"addedAt",System.currentTimeMillis());
        Json.put(t,"path",uri.toString());Json.put(t,"fileName",name);Json.put(t,"size",size);Json.put(t,"modified",modified);Json.put(t,"sourceId",sourceId);Json.put(t,"playlistIndex",order);Json.put(t,"available",true);
        try(MediaMetadataRetriever m=new MediaMetadataRetriever()){
            m.setDataSource(context,uri);
            int[] keys={MediaMetadataRetriever.METADATA_KEY_TITLE,MediaMetadataRetriever.METADATA_KEY_ARTIST,MediaMetadataRetriever.METADATA_KEY_ALBUM,MediaMetadataRetriever.METADATA_KEY_GENRE,MediaMetadataRetriever.METADATA_KEY_DATE};String[] fields={"title","artist","album","genre","date"};
            for(int i=0;i<keys.length;i++){String v=m.extractMetadata(keys[i]);if(v!=null&&!v.isBlank()&&old.length()==0){Json.put(t,fields[i],v);if(fields[i].equals("genre")){Json.put(t,"genreBasis","track");Json.put(t,"genreEvidence",new JSONArray().put(Json.object("name",v,"scope","embedded","source","Embedded tags","confidence","existing")));}}}
            String duration=m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION);if(duration!=null)Json.put(t,"duration",Long.parseLong(duration)/1000d);
            String mime=m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_MIMETYPE);Json.put(t,"codec",mime==null?name.substring(name.lastIndexOf('.')+1).toUpperCase(Locale.ROOT):mime.replace("audio/",""));
            byte[] cover=m.getEmbeddedPicture();if(cover!=null){cacheCover(key,cover);Json.put(t,"artwork",key+".jpg");}
        }catch(Exception ignored){Json.put(t,"metadataNotice","Some embedded tags could not be read");}
        if(supplied!=null)for(Iterator<String> i=supplied.keys();i.hasNext();){String k=i.next();if(!List.of("id","path","favorite","plays").contains(k))Json.put(t,k,supplied.opt(k));}
        Json.put(t,"kind",t.optDouble("duration")>=1200?"mix":"track");save(t);link(key,sourceId,order);return track(key);
    }
    public synchronized void cacheCover(String key,byte[] data) throws IOException {
        if(!key.matches("[a-f0-9]{24}"))throw new IOException("Invalid cover key");
        if(!artwork.isDirectory()&&!artwork.mkdirs())throw new IOException("Cover storage is unavailable");
        BitmapFactory.Options options=new BitmapFactory.Options();options.inJustDecodeBounds=true;BitmapFactory.decodeByteArray(data,0,data.length,options);options.inSampleSize=1;while(Math.max(options.outWidth,options.outHeight)/options.inSampleSize>1024)options.inSampleSize*=2;options.inJustDecodeBounds=false;Bitmap b=BitmapFactory.decodeByteArray(data,0,data.length,options);if(b==null)throw new IOException("Cover image could not be decoded");Bitmap scaled=b;if(Math.max(b.getWidth(),b.getHeight())>640){float f=640f/Math.max(b.getWidth(),b.getHeight());scaled=Bitmap.createScaledBitmap(b,Math.max(1,Math.round(b.getWidth()*f)),Math.max(1,Math.round(b.getHeight()*f)),true);}File destination=new File(artwork,key+".jpg"),tmp=new File(artwork,key+".tmp");try(FileOutputStream out=new FileOutputStream(tmp)){scaled.compress(Bitmap.CompressFormat.JPEG,88,out);}if(!tmp.renameTo(destination))throw new IOException("Could not save cover");if(scaled!=b)scaled.recycle();b.recycle();trimArtwork();
    }
    void recoverCover(String id) throws Exception {
        JSONObject t=track(id);if(t.length()==0)return;
        // Embedded images work offline and keep the user's original choice.
        try(MediaMetadataRetriever metadata=new MediaMetadataRetriever()){
            metadata.setDataSource(context,playbackUri(id,Uri.parse(t.optString("path"))));
            byte[] picture=metadata.getEmbeddedPicture();if(picture!=null){cacheCover(id,picture);return;}
        }catch(Exception ignored){}
        String url=coverSource(t);
        if(!url.isEmpty())cacheCover(id,Research.get(url,6_000_000));
    }
    static String coverSource(JSONObject track){
        String saved=track.optString("artworkSource");
        try{java.net.URI uri=java.net.URI.create(saved);String host=Objects.toString(uri.getHost(),"").toLowerCase(Locale.ROOT);
            if("https".equals(uri.getScheme())&&uri.getUserInfo()==null&&uri.getPort()==-1&&(host.endsWith(".ytimg.com")||host.endsWith(".mzstatic.com")))return saved;
        }catch(IllegalArgumentException ignored){}
        String video=track.optString("youtubeId");return video.matches("[A-Za-z0-9_-]{11}")?"https://i.ytimg.com/vi/"+video+"/hqdefault.jpg":"";
    }
    public void trimArtwork(){long limit=Math.max(32,Math.min(1024,setting("preferences").optInt("cacheMB",128)))*1024L*1024;File[] files=artwork.listFiles();if(files==null)return;Arrays.sort(files,Comparator.comparingLong(File::lastModified));long total=0;for(File f:files)total+=f.length();for(File f:files){if(total<=limit)break;long n=f.length();if(f.delete())total-=n;}}
    public void clearArtwork(){File[] files=artwork.listFiles();if(files!=null)for(File f:files)if(f.isFile())f.delete();}
    public static long bytes(File file){if(!file.exists())return 0;if(file.isFile())return file.length();File[] children=file.listFiles();long total=0;if(children!=null)for(File f:children)total+=bytes(f);return total;}
    public JSONObject storage(){JSONArray ts=tracks();long imported=0,externalDownloads=0;for(int i=0;i<ts.length();i++){JSONObject t=ts.optJSONObject(i);if(t.optString("path").startsWith("content:")){if(t.optBoolean("downloaded"))externalDownloads+=t.optLong("size");else imported+=t.optLong("size");}}return Json.object("downloaded",bytes(music)+externalDownloads,"linked",imported,"artwork",bytes(artwork),"database",bytes(context.getDatabasePath("resonance.db"))+bytes(context.getDatabasePath("resonance.db-wal"))+bytes(context.getDatabasePath("resonance.db-shm")),"tools",bytes(context.getFilesDir())+bytes(context.getNoBackupFilesDir()),"free",new StatFs(music.getAbsolutePath()).getAvailableBytes(),"tracks",ts.length(),"application",new File(context.getApplicationInfo().sourceDir).length());}
}
