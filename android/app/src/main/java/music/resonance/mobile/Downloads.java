package music.resonance.mobile;

import android.net.*;
import android.content.*;
import org.json.*;
import com.yausername.youtubedl_android.*;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.regex.*;

public final class Downloads {
    private final ResonanceApp app;private final DownloaderTools tools;private volatile boolean cancelled;private boolean searching;private DownloadBatch batch;
    private final Object sourceGuard=new Object();private String activeSourceId="";
    public volatile JSONObject progress=Json.object("running",false,"message","Ready to check playlists");
    public volatile JSONArray preview=new JSONArray();
    public volatile long previewRevision=System.currentTimeMillis();private long operation=System.currentTimeMillis();
    Downloads(ResonanceApp app){this.app=app;this.tools=new DownloaderTools(app);JSONArray saved=app.library.setting("syncPreview").optJSONArray("entries");if(saved!=null)savePreview(saved);JSONObject previous=app.library.setting("syncState");if(previous.length()>0){progress=previous;if(previous.optString("phase").equals("error")){String raw=previous.optString("details",previous.optString("message"));Json.put(progress,"details",raw);Json.put(progress,"message",DownloadMessages.explain(raw));}if(previous.optBoolean("running"))publish(false,"cancelled","Previous update was interrupted. Check again or retry the remaining downloads.",0,0,-1);}}
    public synchronized void begin(String kind) throws IOException {if(searching||progress.optBoolean("running")||DownloadService.active)throw new IOException("An update is already running. Wait or cancel it first.");cancelled=false;reviewedKey="";reviewedChoices=new JSONArray();batch=null;operation++;publish(true,"queued",kind.equals("check")?"Reading your playlist…":kind.equals("update")?"Updating the downloader…":"Preparing your downloads…",0,0,-1);}
    private void publish(boolean running,String phase,String message,int done,int total,float percent){progress=Json.object("operation",operation,"running",running,"phase",phase,"message",message,"done",done,"total",total,"percent",Float.isFinite(percent)?percent:-1);if(batch!=null){Json.put(progress,"skipped",batch.skipped);Json.put(progress,"processed",batch.processed);Json.put(progress,"removed",batch.removed);}if(!running||phase.equals("queued"))app.library.setting("syncState",progress);}
    public void fail(Exception e){String raw=Json.error(e);publish(false,cancelled?"cancelled":"error",cancelled?"Paused. Finished songs are saved; retry to continue.":DownloadMessages.explain(raw),progress.optInt("done"),progress.optInt("total"),-1);if(!cancelled){JSONObject detailed=Json.parse(progress.toString());Json.put(detailed,"details",raw.length()>16000?raw.substring(0,16000):raw);progress=detailed;app.library.setting("syncState",detailed);}}
    private synchronized void savePreview(JSONArray entries){preview=PendingDownloads.retain(entries,app.library.sources());previewRevision++;app.library.setting("syncPreview",Json.object("entries",preview));}
    public synchronized JSONArray pending(){JSONArray clean=PendingDownloads.retain(preview,app.library.sources());if(clean.length()!=preview.length())savePreview(clean);return preview;}
    private boolean connected(String id){return PendingDownloads.connected(app.library.sources(),id);}
    private void requireSource(String id) throws DownloadBatch.SourceRemoved {if(!connected(id))throw new DownloadBatch.SourceRemoved();}
    private void beginSourceWork(String id) throws DownloadBatch.SourceRemoved {synchronized(sourceGuard){requireSource(id);activeSourceId=id;}}
    private void endSourceWork(String id){synchronized(sourceGuard){if(activeSourceId.equals(id))activeSourceId="";}}
    private static String sourceProcessId(String id){return "resonance-source-"+id;}
    private void stopSourceWork(String id){if(!id.isEmpty())YoutubeDL.INSTANCE.destroyProcessById(sourceProcessId(id));}
    public void disconnectSource(String id){
        app.library.disconnect(id);stopSourceWork(id);
        synchronized(this){savePreview(preview);reviewedKey="";reviewedChoices=new JSONArray();JSONObject job=app.library.setting("downloadJob");if(job.optLong("operation")==progress.optLong("operation"))app.library.setting("downloadJob",PendingDownloads.job(job,preview));}
    }
    private void init() throws Exception {tools.initialize();}
    private void prepareTools() throws Exception {network();publish(true,"tools","Checking playlist tools…",0,0,-1);init();tools.refresh(false,()->cancelled);if(cancelled)throw new InterruptedIOException("Update cancelled");}
    private void network() throws IOException {
        
        ConnectivityManager manager=(ConnectivityManager)app.getSystemService(Context.CONNECTIVITY_SERVICE);NetworkCapabilities caps=manager.getNetworkCapabilities(manager.getActiveNetwork());if(caps==null||!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET))throw new IOException("No internet connection. Reconnect, then resume your remaining songs.");if(app.library.setting("preferences").optBoolean("wifiOnly",true)&&!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED))throw new IOException("Waiting for Wi-Fi or an unmetered connection. Change Wi-Fi only in settings to allow mobile data.");
    }
    public static String playlist(String value,String type){
        if(type.equals("deezer"))return "https://www.deezer.com/playlist/"+DeezerPlaylist.id(value);
        URIParts u=new URIParts(value);
        if(type.equals("youtube")){if(!List.of("www.youtube.com","youtube.com","music.youtube.com").contains(u.host))throw new IllegalArgumentException("Use a YouTube playlist link");String id=Uri.parse(value).getQueryParameter("list");if(id==null||!id.matches("[A-Za-z0-9_-]{10,100}"))throw new IllegalArgumentException("Playlist link is missing its list ID");return "https://www.youtube.com/playlist?list="+id;}
        if(type.equals("spotify")&&u.host.equals("open.spotify.com")&&u.path.matches("/(?:intl-[a-z-]+/)?playlist/[A-Za-z0-9]{22}/?"))return value;
        throw new IllegalArgumentException("Use a public Spotify playlist link");
    }
    private static final class URIParts{final String host,path;URIParts(String s){java.net.URI u=java.net.URI.create(s);if(!"https".equals(u.getScheme())||u.getUserInfo()!=null||u.getPort()!=-1)throw new IllegalArgumentException("Use an HTTPS playlist link");host=Objects.toString(u.getHost(),"");path=Objects.toString(u.getPath(),"");}}
    private YoutubeDLResponse executeForSource(String sourceId,YoutubeDLRequest request) throws Exception {init();request.addOption("--ignore-config");beginSourceWork(sourceId);try{requireSource(sourceId);return YoutubeDL.INSTANCE.execute(request,sourceProcessId(sourceId),null);}finally{endSourceWork(sourceId);}}
    public void check(String onlySource) throws Exception {
        JSONArray previous=pending(),found=new JSONArray();JSONObject cache=app.library.setting("catalogRecordingMatches");boolean matchingPaused=false;
        try{prepareTools();
            Set<String> saved=new HashSet<>();Map<String,String> spotifySaved=new HashMap<>(),alternatives=new HashMap<>(),deezerSaved=new HashMap<>();JSONArray tracks=app.library.tracks();
            for(int i=0;i<tracks.length();i++){
                JSONObject track=tracks.optJSONObject(i);if(track==null||!readable(track))continue;
                String id=track.optString("youtubeId");if(!id.isEmpty())saved.add(id);
                String original=track.optString("originalYoutubeId");if(!original.isEmpty())alternatives.put(original,track.optString("id"));
                String spotify=track.optString("spotifyId");if(!spotify.isEmpty())spotifySaved.put(spotify,track.optString("id"));
                String deezer=track.optString("deezerId");if(!deezer.isEmpty())deezerSaved.put(deezer,track.optString("id"));
            }
            JSONArray sources=app.library.sources();Set<String> checked=new HashSet<>();List<String> errors=new ArrayList<>();int considered=0;
            for(int i=0;i<sources.length()&&!cancelled;i++){
                JSONObject source=sources.getJSONObject(i);String type=source.optString("type"),sourceId=source.optString("id");
                if(!List.of("youtube","spotify","deezer").contains(type)||!onlySource.isEmpty()&&!onlySource.equals(sourceId)||!connected(sourceId))continue;considered++;
                publish(true,"checking","Reading "+source.optString("name")+"…",0,0,-1);
                try{
                    JSONArray entries;String playlistName=source.optString("name");
                    if(type.equals("deezer")){
                        JSONObject result=DeezerPlaylist.load(DeezerPlaylist.id(source.optString("url")),Research::json,()->cancelled||!connected(sourceId));entries=result.getJSONArray("tracks");playlistName=result.optString("title",playlistName);
                    }else if(type.equals("spotify")){
                        String key=playlist(source.optString("url"),type).replaceAll(".*/playlist/([A-Za-z0-9]{22}).*","$1");
                        JSONObject result=SpotifyPlaylist.load(key,url->new String(Research.get(url,5_000_000),StandardCharsets.UTF_8));entries=result.getJSONArray("tracks");playlistName=result.optString("title",playlistName);
                    }else{
                        YoutubeDLRequest req=new YoutubeDLRequest(playlist(source.optString("url"),type));req.addOption("--flat-playlist");req.addOption("--dump-single-json");req.addOption("--skip-download");req.addOption("--yes-playlist");req.addOption("--extractor-retries","3");req.addOption("--socket-timeout","20");req.addOption("--retries","2");YoutubeDLResponse response=executeForSource(sourceId,req);entries=PlaylistScan.completeEntries(new JSONObject(response.getOut()),response.getErr());playlistName=new JSONObject(response.getOut()).optString("title",playlistName);
                    }
                    if(entries==null)throw new IOException("No playlist entries were returned. Check that the playlist is public.");
                    Json.put(source,"lastError","");Json.put(source,"lastChecked",System.currentTimeMillis());Json.put(source,"trackCount",entries.length());if(!source.optBoolean("customName")&&!playlistName.isBlank())Json.put(source,"name",playlistName);
                    if(!app.library.updateConnectedSource(source))continue;checked.add(sourceId);
                    for(int j=0;j<entries.length()&&!cancelled&&connected(sourceId);j++){
                        JSONObject entry=entries.optJSONObject(j);if(entry==null)continue;String video=type.equals("youtube")?entry.optString("id"):"";
                        String spotifyId=type.equals("spotify")?entry.optString("uri"):"",deezerId=entry.optString("deezerId");int position=entry.optInt("playlistIndex",j+1);
                        if(!spotifyId.isEmpty()&&spotifySaved.containsKey(spotifyId)){app.library.link(spotifySaved.get(spotifyId),sourceId,position);continue;}
                        if(!deezerId.isEmpty()&&deezerSaved.containsKey(deezerId)){app.library.link(deezerSaved.get(deezerId),sourceId,position);continue;}
                        if(alternatives.containsKey(video)){app.library.link(alternatives.get(video),sourceId,position);continue;}
                        if(saved.contains(video)){app.library.link(LibraryStore.id("youtube:"+video),sourceId,position);continue;}
                        if(type.equals("youtube")&&(!video.matches("[A-Za-z0-9_-]{11}")||entry.optString("title").matches("\\[(Private|Deleted) video\\]")))continue;
                        JSONObject item=Json.object("key",sourceId+":"+j,"sourceId",sourceId,"type",type,"youtubeId",video,"spotifyId",spotifyId,"deezerId",deezerId,"deezerUrl",entry.optString("deezerUrl"),"title",entry.optString("title"),"artist",type.equals("spotify")?entry.optString("subtitle"):type.equals("deezer")?entry.optString("artist"):entry.optString("uploader"),"duration",type.equals("spotify")?entry.optDouble("duration",0)/1000:entry.optDouble("duration",0),"playlistIndex",position,"selected",type.equals("youtube"));
                        item=DownloadFailures.preserve(previous,new JSONArray().put(item)).getJSONObject(0);
                        if(!type.equals("youtube")&&item.optString("youtubeId").isEmpty()&&item.optString("skipReason").isEmpty()&&!matchingPaused){
                            publish(true,"checking",source.optString("name")+" · finding recording "+(j+1)+" / "+entries.length()+": "+item.optString("title"),j,entries.length(),-1);
                            try{
                                item=CatalogMatches.find(item,cache,System.currentTimeMillis(),query->{
                                    YoutubeDLRequest request=new YoutubeDLRequest(query);request.addOption("--flat-playlist");request.addOption("--dump-single-json");request.addOption("--socket-timeout","20");request.addOption("--retries","1");request.addOption("--playlist-end","3");
                                    JSONArray results=new JSONObject(executeForSource(sourceId,request).getOut()).optJSONArray("entries");return results==null?new JSONArray():results;
                                },()->cancelled||!connected(sourceId));app.library.setting("catalogRecordingMatches",cache);
                            }catch(Exception error){
                                if(cancelled||!connected(sourceId))break;
                                String detail=DownloadMessages.explain(Json.error(error));Json.put(item,"matchError",detail);errors.add(item.optString("title")+": recording search unavailable. "+detail);
                                if(DownloadFailures.pausesBatch(Json.error(error)))matchingPaused=true;
                            }
                        }
                        if(connected(sourceId))found.put(item);
                    }
                }catch(Exception error){if(cancelled)break;if(!connected(sourceId))continue;Json.put(source,"lastError",DownloadMessages.explain(Json.error(error)));app.library.updateConnectedSource(source);errors.add(source.optString("name")+": "+DownloadMessages.explain(Json.error(error)));}
            }
            if(cancelled){publish(false,"cancelled","Playlist check cancelled. Your previous list and saved music are kept.",0,0,-1);return;}
            for(int i=0;i<previous.length();i++){JSONObject entry=previous.getJSONObject(i);if(!checked.contains(entry.optString("sourceId")))found.put(entry);}
            savePreview(DownloadFailures.preserve(previous,found));
            int ready=0,skipped=0,unmatched=0;for(int i=0;i<preview.length();i++){JSONObject item=preview.getJSONObject(i);if(item.optString("skipReason").isEmpty()){ready++;if(item.optString("youtubeId").isEmpty())unmatched++;}else skipped++;}
            if(cancelled)publish(false,"cancelled","Playlist check cancelled. Your saved music is unchanged.",0,0,-1);
            else if(considered==0)publish(false,"ready","Add a YouTube, Spotify or Deezer playlist link to get started.",0,0,-1);
            else if(!errors.isEmpty())publish(false,"error",String.join(" · ",errors),0,ready,-1);
            else publish(false,"ready",preview.length()==0?"Everything from these playlists is already in your library.":(ready-unmatched)+" recordings ready to review"+(unmatched>0?" · "+unmatched+" need another search":"")+". Select songs before downloading."+(skipped>0?" · "+skipped+" previously skipped":""),0,ready,-1);
        }catch(Exception error){fail(error);throw error;}
    }
    private String reviewedKey="";private JSONArray reviewedChoices=new JSONArray();
    public JSONArray matches(JSONObject entry) throws Exception {
        synchronized(this){if(searching||progress.optBoolean("running")||DownloadService.active)throw new IOException("Wait for the current playlist update to finish first");searching=true;reviewedChoices=new JSONArray();}
        try{JSONObject original=null;for(int i=0;i<pending().length();i++){JSONObject item=preview.optJSONObject(i);if(item!=null&&item.optString("key").equals(entry.optString("key"))){original=Json.parse(item.toString());break;}}if(original==null)throw new IOException("The playlist changed. Reopen Downloads.");
        Json.put(original,"query",entry.optString("query"));entry=original;final String sourceId=entry.optString("sourceId");requireSource(sourceId);cancelled=false;
        JSONArray choices=new JSONArray();Set<String> seen=new HashSet<>();
        JSONArray cached=entry.optString("query").isBlank()?CatalogMatches.cached(entry,app.library.setting("catalogRecordingMatches"),System.currentTimeMillis()):null;
        if(cached!=null&&cached.length()>0){for(int i=0;i<cached.length();i++){JSONObject choice=Json.parse(cached.getJSONObject(i).toString());Json.put(choice,"musicVideo",RecordingFallback.musicVideo(choice));Json.put(choice,"safe",choice.optInt("score")>=98);choices.put(choice);}}
        else{network();init();for(String target:RecordingFallback.queries(entry)){
            YoutubeDLRequest req=new YoutubeDLRequest(target);req.addOption("--dump-single-json");req.addOption("--flat-playlist");req.addOption("--socket-timeout","20");req.addOption("--retries","1");
            JSONArray list=new JSONObject(executeForSource(sourceId,req).getOut()).optJSONArray("entries");if(list==null)continue;
            for(int i=0;i<list.length();i++){JSONObject c=list.optJSONObject(i);if(c!=null&&c.optString("id").matches("[A-Za-z0-9_-]{11}")&&!c.optString("id").equals(entry.optString("youtubeId"))&&!c.optBoolean("is_live")&&seen.add(c.optString("id"))){c.put("musicVideo",RecordingFallback.musicVideo(c));c.put("safe",RecordingFallback.matches(entry,c));choices.put(c);}}
        }}requireSource(sourceId);synchronized(this){reviewedKey=entry.optString("key");reviewedChoices=choices;}return choices;
        }finally{synchronized(this){searching=false;}}
    }
    public synchronized JSONObject selectMatch(String key,String video) throws Exception {
        if(searching||progress.optBoolean("running"))throw new IOException("Wait for the current playlist update to finish first");
        JSONObject choice=null;for(int i=0;i<reviewedChoices.length();i++)if(reviewedChoices.getJSONObject(i).optString("id").equals(video))choice=reviewedChoices.getJSONObject(i);
        if(!key.equals(reviewedKey)||choice==null)throw new IOException("Search again before choosing a recording.");
        for(int i=0;i<preview.length();i++){JSONObject item=preview.getJSONObject(i);if(!item.optString("key").equals(key))continue;
            requireSource(item.optString("sourceId"));
            if(!List.of("spotify","deezer").contains(item.optString("type"))&&!item.has("originalYoutubeId"))item.put("originalYoutubeId",item.optString("youtubeId"));
            CatalogMatches.apply(item,choice);item.put("youtubeId",video).put("selected",true).put("alternativeSelected",true).put("alternativeKind",RecordingFallback.musicVideo(choice)?"music-video":"upload");item.remove("skipReason");item.remove("failedVideoId");savePreview(preview);reviewedChoices=new JSONArray();return item;
        }throw new IOException("The playlist changed. Reopen Downloads.");
    }
    public void cancel(){cancelled=true;String source; synchronized(sourceGuard){source=activeSourceId;}stopSourceWork(source);}
    private synchronized void completed(JSONObject item,String trackId){
        if(!item.optString("deezerId").isEmpty()){JSONObject saved=app.library.track(trackId);if(saved.length()>0){Json.put(saved,"deezerId",item.optString("deezerId"));Json.put(saved,"deezerUrl",item.optString("deezerUrl"));Json.put(saved,"deezerTitle",item.optString("title"));Json.put(saved,"deezerArtist",item.optString("artist"));app.library.save(saved);}}
        JSONArray remaining=new JSONArray();for(int p=0;p<preview.length();p++){JSONObject entry=preview.optJSONObject(p);if(entry==null)continue;if(entry.optString("key").equals(item.optString("key"))||entry.optString("youtubeId").equals(item.optString("youtubeId"))){app.library.link(trackId,entry.optString("sourceId"),entry.optInt("playlistIndex"));}else remaining.put(entry);}savePreview(remaining);
    }
    private boolean readable(JSONObject track){try(InputStream input=app.getContentResolver().openInputStream(Uri.parse(track.optString("path")))){return input!=null;}catch(Exception ignored){return false;}}
    public void download(JSONArray selected) throws Exception {
        String format=app.library.setting("preferences").optString("downloadFormat","original");JSONObject destination=app.library.setting("downloadDestination");
        batch=new DownloadBatch();
        try{
            prepareTools();if(selected==null||selected.length()==0)throw new IOException("Select songs to download first.");
            if(!destination.optString("uri").isEmpty())DownloadDestination.folder(app,destination);
            batch.run(selected,()->cancelled,new DownloadBatch.Work(){
                public boolean include(JSONObject item){return connected(item.optString("sourceId"));}
                public void before() throws Exception {network();if(app.library.music.getUsableSpace()<512L*1024*1024)throw new IOException("Downloads paused: keep at least 512 MB free on your phone. Your finished songs are saved.");}
                public void download(JSONObject item) throws Exception {try{downloadOne(item,format,destination,selected.length());}catch(Exception error){if(!connected(item.optString("sourceId")))throw new DownloadBatch.SourceRemoved();throw error;}}
                public void saved(JSONObject item){publish(true,"downloading",item.optString("title")+" saved",batch.saved,selected.length(),100);}
                public void skipped(JSONObject item,String reason) throws Exception {
                    savePreview(DownloadFailures.mark(preview,item,reason,System.currentTimeMillis()));
                    publish(true,"downloading","Skipped "+item.optString("title")+" · continuing with the next song",batch.saved,selected.length(),100);
                }
            });
            publish(false,cancelled?"cancelled":"complete",cancelled?"Paused · "+batch.saved+" saved, "+batch.skipped+" skipped. Resume when you’re ready.":batch.summary(),batch.saved,selected.length(),100);
        }catch(Exception e){fail(e);throw e;}
    }
    private boolean alternative(JSONObject item,String format,JSONObject destination,int total) throws Exception {
        if(item.has("originalYoutubeId"))return false;
        publish(true,"downloading","Looking for another recording of "+item.optString("title")+"…",batch.saved,total,-1);
        Set<String> tried=new HashSet<>();
        for(String target:RecordingFallback.queries(item)){
            if(cancelled)throw new InterruptedIOException("Update cancelled");if(tried.size()>=3)break;
            boolean videoSearch=target.endsWith("official music video");int attemptLimit=videoSearch?3:2;if(tried.size()>=attemptLimit)continue;
            if(videoSearch)publish(true,"downloading","Looking for a music video of "+item.optString("title")+"…",batch.saved,total,-1);
            YoutubeDLRequest request=new YoutubeDLRequest(target);request.addOption("--flat-playlist");request.addOption("--dump-single-json");request.addOption("--socket-timeout","20");request.addOption("--retries","1");
            JSONArray choices=new JSONObject(executeForSource(item.optString("sourceId"),request).getOut()).optJSONArray("entries");if(choices==null)continue;
            for(int i=0;i<choices.length()&&!cancelled&&tried.size()<attemptLimit;i++){
                JSONObject choice=choices.optJSONObject(i);if(choice==null||!RecordingFallback.matches(item,choice)||!tried.add(choice.optString("id")))continue;
                JSONObject alternate=new JSONObject(item.toString());alternate.put("originalYoutubeId",item.optString("youtubeId")).put("youtubeId",choice.optString("id")).put("alternativeKind",RecordingFallback.musicVideo(choice)?"music-video":"upload");
                try{downloadOne(alternate,format,destination,total);return true;}catch(DownloadBatch.RecordingUnavailable ignored){}
            }
        }return false;
    }
    static void audioOptions(YoutubeDLRequest request,String format){
        // Prefer the separate audio stream. If only a combined clip exists,
        // extract its sound and discard the temporary video file.
        request.addOption("-f","bestaudio/best");request.addOption("-x");request.addOption("--no-keep-video");
        request.addOption("--audio-format",format.equals("compact")?"opus":"best");
        if(format.equals("compact"))request.addOption("--audio-quality","128K");
    }
    private void downloadOne(JSONObject item,String format,JSONObject destination,int total) throws Exception {
        if(cancelled)throw new InterruptedIOException("Update cancelled");requireSource(item.optString("sourceId"));
        String video=item.optString("youtubeId");if(!video.matches("[A-Za-z0-9_-]{11}"))throw new DownloadBatch.RecordingUnavailable("Choose a recording for this song first.");
            String title=item.optString("title");final int done=batch.saved;JSONObject existing=app.library.track(LibraryStore.id("youtube:"+video));if(existing.length()>0&&readable(existing)){app.library.link(existing.optString("id"),item.optString("sourceId"),item.optInt("playlistIndex"));if(item.has("originalYoutubeId")){Json.put(existing,"originalYoutubeId",item.optString("originalYoutubeId"));app.library.save(existing);}completed(item,existing.optString("id"));return;}publish(true,"downloading",title,done,total,-1);YoutubeDLRequest req=new YoutubeDLRequest("https://www.youtube.com/watch?v="+video);req.addOption("--ignore-config");req.addOption("--no-playlist");req.addOption("--check-formats");req.addOption("--extractor-retries","3");req.addOption("--fragment-retries","3");req.addOption("--continue");req.addOption("--no-overwrites");req.addOption("--socket-timeout","20");req.addOption("--retries","3");req.addOption("--download-archive",new File(app.library.music,"downloaded.txt").getAbsolutePath());req.addOption("--write-info-json");req.addOption("-o",new File(app.library.music,"%(id)s.%(ext)s").getAbsolutePath());
            audioOptions(req,format);
            try{beginSourceWork(item.optString("sourceId"));try{requireSource(item.optString("sourceId"));YoutubeDL.INSTANCE.execute(req,sourceProcessId(item.optString("sourceId")),(percent,eta,line)->{if(!connected(item.optString("sourceId")))stopSourceWork(item.optString("sourceId"));else publish(true,"downloading",title,done,total,percent);return kotlin.Unit.INSTANCE;});}finally{endSourceWork(item.optString("sourceId"));}requireSource(item.optString("sourceId"));}
            catch(YoutubeDLException e){requireSource(item.optString("sourceId"));if(cancelled)throw e;network();String raw=Json.error(e);if(DownloadFailures.pausesBatch(raw))throw e;if(RecordingFallback.unavailable(raw)&&alternative(item,format,destination,total))return;throw new DownloadBatch.RecordingUnavailable(DownloadMessages.explain(raw));}
            File[] files=app.library.music.listFiles((dir,name)->name.startsWith(video+".")&&LibraryStore.isAudio(name));if(files==null||files.length==0)throw new DownloadBatch.RecordingUnavailable("No usable audio file was returned. Try updating the downloader before retrying this song.");File file=files[0];JSONObject info=new JSONObject();File infoFile=new File(app.library.music,video+".info.json");if(infoFile.isFile())info=Json.parse(new String(java.nio.file.Files.readAllBytes(infoFile.toPath()),StandardCharsets.UTF_8));
            JSONObject supplied=Json.object("youtubeId",video,"spotifyId",item.optString("spotifyId"),"deezerId",item.optString("deezerId"),"deezerUrl",item.optString("deezerUrl"),"deezerTitle",item.optString("type").equals("deezer")?item.optString("title"):"","deezerArtist",item.optString("type").equals("deezer")?item.optString("artist"):"","title",info.optString("track",info.optString("title",title)),"artist",info.optString("artist",info.optString("uploader",item.optString("artist"))),"views",info.optLong("view_count"),"date",info.optString("release_date",info.optString("upload_date")),"downloaded",true,"sourceUrl","https://www.youtube.com/watch?v="+video);
            Json.put(supplied,"rawTitle",info.optString("title",title));Json.put(supplied,"channel",info.optString("channel",info.optString("uploader")));
            Json.put(supplied,"recordingArtists",info.optJSONArray("artists")!=null?info.optJSONArray("artists"):new JSONArray().put(info.optString("artist",info.optString("uploader",item.optString("artist")))));
            if(item.has("originalYoutubeId")){supplied.put("originalYoutubeId",item.optString("originalYoutubeId")).put("alternativeRecording",true).put("alternativeSelected",item.optBoolean("alternativeSelected")).put("alternativeKind",item.optString("alternativeKind","upload"));}
            GenreResearch.sourceLabels(supplied,info);
            JSONObject track;
            if(!destination.optString("uri").isEmpty()){
                publish(true,"saving","Saving "+title+" to "+destination.optString("name"),done,total,100);
                androidx.documentfile.provider.DocumentFile document=DownloadDestination.copy(app,destination,file,title,video,()->cancelled||!connected(item.optString("sourceId")));
                track=app.library.readAudio(document.getUri(),document.getName(),file.length(),document.lastModified(),item.optString("sourceId"),item.optInt("playlistIndex"),supplied);
                app.library.link(track.optString("id"),destination.optString("sourceId"),item.optInt("playlistIndex"));
                track=app.library.track(track.optString("id"));
                // Only discard our staging copy after the destination was read back and the library saved.
                file.delete();
            }else track=app.library.readAudio(Uri.fromFile(file),file.getName(),file.length(),file.lastModified(),item.optString("sourceId"),item.optInt("playlistIndex"),supplied);
            try{String thumbnail=info.optString("thumbnail");java.net.URI thumb=java.net.URI.create(thumbnail);if(Objects.toString(thumb.getHost(),"").endsWith(".ytimg.com")){Json.put(track,"artworkSource",thumbnail);app.library.save(track);app.library.cacheCover(track.optString("id"),Research.get(thumbnail,5_000_000));Json.put(track,"artwork",track.optString("id")+".jpg");app.library.save(track);}}catch(Exception ignored){}
            if(infoFile.isFile())infoFile.delete();completed(item,track.optString("id"));
    }
    public void updateEngine() throws Exception {try{network();init();tools.refresh(true,()->cancelled);publish(false,"complete","Downloader ready · yt-dlp "+app.library.setting("downloadTools").optString("version")+". Check playlists to reload the full lists, or retry your selected songs.",0,0,100);}catch(Exception e){fail(e);throw e;}}
}
