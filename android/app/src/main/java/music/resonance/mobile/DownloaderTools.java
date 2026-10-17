package music.resonance.mobile;

import com.yausername.youtubedl_android.*;
import com.yausername.ffmpeg.FFmpeg;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Keeps the private engine current without touching music or the download archive. */
final class DownloaderTools {
    static final String BUNDLED_VERSION="2026.08.19";
    static final String BUNDLED_SHA256="1fa6733c37ea6fb51c99ad8fe785e7b7e5f3246c9b980230329d4fb72ed8d4d6";
    private final ResonanceApp app;
    private boolean initialized;
    private String version="";
    DownloaderTools(ResonanceApp app){this.app=app;}
    private File executable(){return new File(app.getNoBackupFilesDir(),"youtubedl-android/yt-dlp/yt-dlp");}
    private String installedVersion() throws Exception {
        YoutubeDLRequest request=new YoutubeDLRequest(Collections.emptyList());request.addOption("--ignore-config");request.addOption("--version");
        String result=YoutubeDL.INSTANCE.execute(request,"resonance-tools",null).getOut().trim();
        if(!result.matches("[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}(?:[.a-zA-Z0-9_-]*)"))throw new IOException("Could not identify the playlist downloader");
        return result;
    }
    synchronized void initialize() throws Exception {
        if(initialized)return;YoutubeDL.INSTANCE.init(app);FFmpeg.INSTANCE.init(app);
        try{version=installedVersion();}catch(Exception ignored){version="";}
        if(version.compareTo(BUNDLED_VERSION)<0){
            File stage=new File(executable().getParentFile(),"bundled.next");
            try(InputStream in=app.getResources().openRawResource(R.raw.ytdlp);OutputStream out=new FileOutputStream(stage)){
                if(!BUNDLED_SHA256.equals(FileCopies.transfer(in,out,()->false)))throw new IOException("Bundled downloader integrity check failed");
            }
            install(stage,BUNDLED_VERSION);
        }
        if(!new File(app.getApplicationInfo().nativeLibraryDir,"libqjs.so").isFile())throw new IOException("The YouTube JavaScript runtime is missing. Reinstall this APK as an update.");
        initialized=true;JSONObject saved=app.library.setting("downloadTools");Json.put(saved,"version",version);Json.put(saved,"bundledVersion",BUNDLED_VERSION);app.library.setting("downloadTools",saved);
    }
    private void install(File stage,String expected) throws Exception {
        File target=executable(),backup=new File(target.getParentFile(),"yt-dlp.previous");boolean replaced=false,keepBackup=false;
        try{
            if(target.isFile())Files.copy(target.toPath(),backup.toPath(),StandardCopyOption.REPLACE_EXISTING);
            Files.move(stage.toPath(),target.toPath(),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);replaced=true;
            String actual=installedVersion();if(!actual.equals(expected))throw new IOException("Downloaded tool version did not match its release");version=actual;
        }catch(Exception e){if(replaced&&backup.isFile())try{Files.move(backup.toPath(),target.toPath(),StandardCopyOption.REPLACE_EXISTING);}catch(IOException restore){keepBackup=true;e.addSuppressed(restore);}throw e;}
        finally{Files.deleteIfExists(stage.toPath());if(!keepBackup)Files.deleteIfExists(backup.toPath());}
    }
    synchronized boolean refresh(boolean force,BooleanSupplier cancelled) throws Exception {
        initialize();JSONObject state=app.library.setting("downloadTools");long now=System.currentTimeMillis();
        if(!force&&now-state.optLong("checkedAt")<24*60*60*1000L)return false;
        try{
            checkCancelled(cancelled);JSONObject release=Research.json("https://api.github.com/repos/yt-dlp/yt-dlp/releases/latest");String latest=release.optString("tag_name");
            if(!latest.matches("[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}"))throw new IOException("Unexpected downloader release");
            boolean changed=latest.compareTo(version)>0;
            if(changed){
                JSONObject asset=null;JSONArray assets=release.getJSONArray("assets");for(int i=0;i<assets.length();i++)if("yt-dlp".equals(assets.getJSONObject(i).optString("name")))asset=assets.getJSONObject(i);
                if(asset==null)throw new IOException("The current release has no compatible download tool");
                String url=asset.getString("browser_download_url"),digest=asset.optString("digest");
                if(!url.equals("https://github.com/yt-dlp/yt-dlp/releases/download/"+latest+"/yt-dlp")||!digest.matches("sha256:[a-f0-9]{64}"))throw new IOException("The release could not be verified");
                File stage=new File(executable().getParentFile(),"update.next");
                try{download(url,stage,digest.substring(7),cancelled);checkCancelled(cancelled);install(stage,latest);}finally{Files.deleteIfExists(stage.toPath());}
            }
            app.library.setting("downloadTools",Json.object("version",version,"bundledVersion",BUNDLED_VERSION,"checkedAt",now,"updateWarning",""));return changed;
        }catch(Exception e){
            Json.put(state,"version",version);Json.put(state,"updateWarning",cancelled.getAsBoolean()?"Update cancelled":"Could not check for updates. Using verified yt-dlp "+version+".");app.library.setting("downloadTools",state);
            if(force||cancelled.getAsBoolean())throw e;return false;
        }
    }
    private static void checkCancelled(BooleanSupplier cancelled) throws InterruptedIOException {if(cancelled.getAsBoolean())throw new InterruptedIOException("Update cancelled");}
    private static void download(String address,File stage,String expected,BooleanSupplier cancelled) throws Exception {
        for(int redirects=0;redirects<5;redirects++){
            checkCancelled(cancelled);URL url=new URL(address);
            if(!"https".equals(url.getProtocol())||!Set.of("github.com","release-assets.githubusercontent.com","objects.githubusercontent.com").contains(url.getHost()))throw new IOException("Unexpected update download location");
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();connection.setConnectTimeout(12000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("User-Agent","ResonanceAndroid/0.1.2");
            try{
                int code=connection.getResponseCode();if(code>=300&&code<400){String location=connection.getHeaderField("Location");if(location==null)throw new IOException("Missing update redirect");address=new URL(url,location).toString();continue;}
                if(code!=200)throw new IOException("Update service returned HTTP "+code);
                try(InputStream raw=connection.getInputStream();InputStream bounded=new FilterInputStream(raw){long count;@Override public int read(byte[] b,int off,int len) throws IOException {int n=super.read(b,off,len);if(n>0&&(count+=n)>32*1024*1024)throw new IOException("Update is unexpectedly large");return n;}};OutputStream out=new FileOutputStream(stage)){
                    if(!expected.equals(FileCopies.transfer(bounded,out,cancelled)))throw new IOException("Downloader checksum mismatch; the existing version was kept");
                }return;
            }finally{connection.disconnect();}
        }throw new IOException("Too many redirects from the update service");
    }
}
