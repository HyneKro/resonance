package music.resonance.mobile;
import com.yausername.ffmpeg.FFmpeg;
import com.yausername.youtubedl_android.YoutubeDL;
import org.json.*;
import android.net.Uri;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

/** One low-priority analysis at a time. Only compact measurements survive. */
public final class SongAnalysis {
    private final ResonanceApp app;private final ExecutorService worker=Executors.newSingleThreadExecutor();private final Set<String> queued=new HashSet<>();private final LinkedList<String> urgent=new LinkedList<>(),background=new LinkedList<>();private volatile JSONObject job=Json.object("running",false);private volatile Process process;private boolean working,enabled,foreground;private String interrupted="";
    SongAnalysis(ResonanceApp app){this.app=app;}
    static String stamp(JSONObject t){return t.optString("path")+"|"+t.optLong("size")+"|"+t.optLong("modified")+"|"+t.optDouble("duration");}
    /** Cheap immutable snapshot for the status poll; never query the library here. */
    public JSONObject activity(){return job;}
    public JSONObject profile(String id){JSONObject t=app.library.track(id),p=app.library.setting("audioProfile:"+id);return p.optInt("version")==1&&stamp(t).equals(p.optString("stamp"))?p:new JSONObject();}
    public synchronized JSONObject status(String id){JSONObject p=profile(id);return Json.object("profile",p.length()==0?JSONObject.NULL:p,"edit",app.library.setting("playbackEdit:"+id),"job",jobStatus(job,queued.contains(id)),"error",AnalysisRuntime.savedError(app.library.setting("audioError:"+id),stamp(app.library.track(id))));}
    // Idle and completed jobs have no progress field. NaN cannot be sent as JSON,
    // and status is also read synchronously while restoring the player's queue.
    static JSONObject jobStatus(JSONObject job,boolean queued){double progress=job.optDouble("progress",0);return Json.object("running",queued,"id",job.optString("id"),"progress",Double.isFinite(progress)?Math.max(0,Math.min(1,progress)):0);}
    public JSONObject request(String id,boolean force){return request(id,force,false);}
    public synchronized JSONObject request(String id,boolean force,boolean priority){if(app.library.track(id).length()==0)throw new IllegalArgumentException("Track unavailable");if(!force&&(profile(id).length()>0||!status(id).optString("error").isEmpty()))return status(id);if(id.equals(job.optString("id"))){if(priority)foreground=true;return status(id);}if(queued.contains(id)&&!priority)return status(id);if(urgent.size()>=8){String removed=urgent.removeLast();queued.remove(removed);}app.library.setting("audioError:"+id,new JSONObject());queued.add(id);urgent.remove(id);if(priority)urgent.addFirst(id);else urgent.addLast(id);if(priority&&working&&process!=null){interrupted=job.optString("id");process.destroy();}start();return status(id);}
    public synchronized void setLeveling(boolean value){if(enabled==value&&(!value||working))return;enabled=value;background.clear();if(value){JSONArray tracks=app.library.tracks();for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t!=null&&t.optBoolean("available",true))background.add(t.optString("id"));}}else if(!foreground&&process!=null){interrupted=job.optString("id");process.destroy();}start();}
    private synchronized void start(){if(working)return;working=true;worker.execute(()->{
        try{while(true){String id;boolean priority;
            synchronized(this){priority=!urgent.isEmpty();id=priority?urgent.removeFirst():background.pollFirst();if(id==null)return;foreground=priority;}
            // Catalogue reads can take seconds across a large measured library.
            // Never hold the scheduler monitor while skipping those recordings.
            if(!priority&&(profile(id).length()>0||!status(id).optString("error").isEmpty()))continue;
            synchronized(this){queued.add(id);}analyze(id);
            try{Thread.sleep(200);}catch(InterruptedException e){Thread.currentThread().interrupt();return;}
        }}finally{synchronized(this){working=false;if(!urgent.isEmpty()||!background.isEmpty())start();}}
    });}
    public JSONObject progress(){return job;}
    public JSONObject coverage(){int total=0,ready=0,failed=0;JSONArray tracks=app.library.tracks();for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t==null||!t.optBoolean("available",true))continue;total++;if(profile(t.optString("id")).length()>0)ready++;else if(!status(t.optString("id")).optString("error").isEmpty())failed++;}return Json.object("total",total,"ready",ready,"failed",failed,"enabled",enabled,"running",working);}
    public JSONObject edit(String id,JSONObject data){JSONObject track=app.library.track(id);if(track.length()==0)throw new IllegalArgumentException("Track unavailable");app.library.setting("playbackEdit:"+id,SongProfile.range(data,track.optDouble("duration")));return status(id);}
    private void analyze(String id){File temporary=null,log=null;Process child=null;ScheduledExecutorService timer=Executors.newSingleThreadScheduledExecutor();android.os.Process.setThreadPriority(android.os.Process.THREAD_PRIORITY_BACKGROUND);JSONObject track=app.library.track(id);String stamp=stamp(track);job=Json.object("running",true,"id",id,"progress",0);
        try{YoutubeDL.INSTANCE.init(app);FFmpeg.INSTANCE.init(app);Uri uri=app.library.playbackUri(id,Uri.parse(track.optString("path")));String input;
            if("file".equals(uri.getScheme()))input=uri.getPath();else{temporary=File.createTempFile("song-analysis-",".audio",app.getCacheDir());long max=Math.min(512L*1024*1024,Math.max(0,app.getCacheDir().getUsableSpace()-64L*1024*1024));try(InputStream in=app.getContentResolver().openInputStream(uri);OutputStream out=new FileOutputStream(temporary)){if(in==null)throw new IOException("File unavailable");byte[] b=new byte[65536];int n;long size=0;while((n=in.read(b))!=-1){if((size+=n)>max)throw new IOException("Not enough temporary space to analyze this linked file");out.write(b,0,n);}}input=temporary.getAbsolutePath();}
            log=File.createTempFile("song-analysis-",".log",app.getCacheDir());ProcessBuilder builder=new ProcessBuilder(new File(app.getApplicationInfo().nativeLibraryDir,"libffmpeg.so").getAbsolutePath(),"-hide_banner","-nostdin","-nostats","-threads","1","-filter_threads","1","-i",input,"-vn","-map","0:a:0","-af",SongProfile.FILTER,"-f","null","-");builder.environment().put("LD_LIBRARY_PATH",AnalysisRuntime.libraryPath(app.getNoBackupFilesDir(),new File(app.getApplicationInfo().nativeLibraryDir)));builder.environment().put("TMPDIR",app.getCacheDir().getAbsolutePath());builder.redirectError(log);child=builder.start();process=child;final Process running=child;timer.schedule(running::destroyForcibly,Math.max(120,Math.min(900,(long)(track.optDouble("duration")*.5))),TimeUnit.SECONDS);SongProfile reader=new SongProfile(track.optDouble("duration"));
            try(BufferedReader lines=new BufferedReader(new InputStreamReader(child.getInputStream()))){String line;long last=0;while((line=lines.readLine())!=null){reader.line(line);long now=System.currentTimeMillis();if(now-last>1000){last=now;job=Json.object("running",true,"id",id,"progress",reader.progress(track.optDouble("duration")));}}}
            int exitCode=child.waitFor();if(exitCode!=0)throw new IOException(AnalysisRuntime.failure(log,exitCode));JSONObject profile=reader.finish();if(profile.optDouble("duration")<.1)throw new IOException("No decodable audio found");if(stamp.equals(stamp(app.library.track(id)))){Json.put(profile,"stamp",stamp);Json.put(profile,"savedAt",System.currentTimeMillis());app.library.setting("audioProfile:"+id,profile);app.library.setting("audioError:"+id,new JSONObject());}
        }catch(Exception e){synchronized(this){if(id.equals(interrupted)){if(enabled)background.addFirst(id);}else app.library.setting("audioError:"+id,Json.object("stamp",stamp,"engineRevision",AnalysisRuntime.REVISION,"message",e.getMessage()==null?"Analysis unavailable":e.getMessage()));}}
        finally{if(child!=null&&child.isAlive())child.destroyForcibly();process=null;timer.shutdownNow();if(temporary!=null)temporary.delete();if(log!=null)log.delete();synchronized(this){queued.remove(id);interrupted="";job=Json.object("running",!queued.isEmpty(),"id","","progress",0);}}
    }
}
