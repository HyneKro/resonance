package music.resonance.mobile;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.database.Cursor;
import android.net.Uri;
import android.os.*;
import androidx.core.content.FileProvider;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

/** GitHub release downloads are owned by Android, so they survive screen-off and app recreation. */
final class AppUpdates {
    private final ResonanceApp app;
    private final DownloadManager manager;
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final AtomicBoolean refreshQueued=new AtomicBoolean(),checkQueued=new AtomicBoolean(),installQueued=new AtomicBoolean();
    private final AtomicInteger generation=new AtomicInteger();
    private volatile HttpURLConnection connection;
    private volatile JSONObject state;
    private JSONObject saved,release;
    private String failedVersion;
    private final String current;
    private final boolean compatible;
    private long downloadId;
    private final File readyFile;
    AppUpdates(ResonanceApp app){this.app=app;manager=app.getSystemService(DownloadManager.class);String installed="";try{installed=app.getPackageManager().getPackageInfo(app.getPackageName(),0).versionName;}catch(Exception ignored){}current=installed;
        compatible=Arrays.asList(Build.SUPPORTED_ABIS).contains("arm64-v8a");readyFile=new File(app.getCacheDir(),"app-updates/update.apk");
        saved=app.library.setting("appUpdates");failedVersion=saved.optString("failedVersion");state=Json.object("phase","idle","current",current,"canInstall",compatible,"autoCheck",saved.optBoolean("autoCheck",true),"autoDownload",saved.optBoolean("autoDownload",true),"checkedAt",saved.optLong("checkedAt"),"message","Updates come directly from GitHub Releases.");
        worker.execute(()->{try{release=AppRelease.restore(saved.optJSONObject("release"),current);downloadId=saved.optLong("downloadId");
            if(release==null){if(downloadId!=0)manager.remove(downloadId);downloadId=0;Files.deleteIfExists(readyFile.toPath());persist();}
            else{change("release",release);if(downloadId!=0)refresh();else if(UpdatePolicy.rejected(release,failedVersion))change("phase","error","message","This update could not be installed. Check for a newer release or download it again.");else if(readyFile.isFile()){change("phase","verifying","message","Checking the saved update…");verify(readyFile);ready();}else change("phase","available","message","Version "+release.optString("version")+" is available.");}
        }catch(Exception e){fail(e);}});
    }
    JSONObject snapshot(){refreshLater();return Json.parse(state.toString());}
    private void change(Object... pairs){JSONObject next=Json.parse(state.toString());for(int i=0;i<pairs.length;i+=2)Json.put(next,(String)pairs[i],pairs[i+1]);state=next;}
    private void persist(){saved=Json.object("autoCheck",state.optBoolean("autoCheck",true),"autoDownload",state.optBoolean("autoDownload",true),"checkedAt",state.optLong("checkedAt"),"release",release,"downloadId",downloadId,"failedVersion",failedVersion);app.library.setting("appUpdates",saved);}
    private void fail(Exception e){change("phase","error","message",Json.error(e));}
    void preferences(JSONObject values) throws Exception {worker.submit(()->{if(values.has("autoCheck"))change("autoCheck",values.optBoolean("autoCheck"));if(values.has("autoDownload"))change("autoDownload",values.optBoolean("autoDownload"));persist();}).get(30,TimeUnit.SECONDS);}
    void check(boolean automatic){if(!checkQueued.compareAndSet(false,true))return;int ticket=generation.get();worker.execute(()->{try{checkOnWorker(automatic,ticket);}finally{checkQueued.set(false);}});}
    private void checkOnWorker(boolean automatic,int ticket){
        if(ticket!=generation.get()||!UpdatePolicy.canCheck(state.optString("phase"),automatic,state.optBoolean("autoCheck",true),state.optLong("checkedAt"),System.currentTimeMillis(),release!=null,!failedVersion.isEmpty()))return;
        JSONObject before=Json.parse(state.toString());boolean prepared="ready".equals(before.optString("phase"));
        change("phase","checking","checkedAt",System.currentTimeMillis(),"message","Checking GitHub Releases…");persist();
        try{JSONArray all=new JSONArray();boolean complete=false;
        for(int page=1;page<=10;page++){if(ticket!=generation.get())return;JSONArray rows=fetch(page);for(int i=0;i<rows.length();i++)all.put(rows.get(i));if(rows.length()<100){complete=true;break;}}
        if(!complete)throw new IOException("The release list is too large. Open GitHub downloads to update manually.");if(ticket!=generation.get())return;
        JSONObject found=UpdatePolicy.newest(release,AppRelease.select(all,current));
        if(prepared&&found!=null&&found.optString("version").equals(release.optString("version"))){state=Json.put(before,"checkedAt",System.currentTimeMillis());persist();return;}
        release=found;
        if(UpdatePolicy.rejected(release,failedVersion)){change("release",release,"phase","error","message","No newer release is available yet. The failed update will not be retried automatically. You can check again or download it again.");persist();return;}
        change("release",release,"phase",release==null?"current":"available","message",release==null?"You have the latest version.":"Version "+release.optString("version")+" is available.");persist();
        if(release!=null&&compatible&&state.optBoolean("autoDownload",true))startDownload(true);
        }catch(Exception e){if(ticket==generation.get()){if(prepared&&release!=null&&release.optString("version").equals(before.optJSONObject("release").optString("version"))){state=Json.put(Json.put(before,"checkedAt",System.currentTimeMillis()),"message",Json.error(e)+" Your downloaded update is still available.");persist();}else fail(e);}}finally{connection=null;}
    }
    private JSONArray fetch(int page) throws Exception {
        HttpURLConnection c=(HttpURLConnection)new URL(AppRelease.API+"?per_page=100&page="+page).openConnection();connection=c;c.setConnectTimeout(12000);c.setReadTimeout(15000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","Resonance-Android-Updater");c.setRequestProperty("Accept","application/vnd.github+json");
        try{int code=c.getResponseCode();if(code!=200)throw new IOException(code==403||code==429?"GitHub’s update limit was reached. Try again later.":"GitHub updates are unavailable (HTTP "+code+"). Try again later.");try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] block=new byte[16384];int n,total=0;while((n=in.read(block))!=-1){if((total+=n)>4_000_000)throw new IOException("Update response is too large");out.write(block,0,n);}return new JSONArray(out.toString("UTF-8"));}}
        finally{c.disconnect();}
    }
    void download(){worker.execute(()->{try{startDownload(false);}catch(Exception e){fail(e);}});}
    private void startDownload(boolean automatic) throws Exception {
        if(!compatible||release==null||downloadId!=0||Set.of("ready","verifying","installing","checking").contains(state.optString("phase")))return;
        File directory=app.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);if(directory==null)throw new IOException("Download storage is not available.");File folder=new File(directory,"app-updates");if(!folder.isDirectory()&&!folder.mkdirs())throw new IOException("Could not create the update folder");File target=new File(folder,"download.apk");Files.deleteIfExists(target.toPath());
        if(folder.getUsableSpace()<release.optLong("bytes")*2+50_000_000L)throw new IOException("More free storage is needed for this update.");
        DownloadManager.Request request=new DownloadManager.Request(Uri.parse(release.optString("url"))).setTitle("Resonance "+release.optString("version")).setDescription("App update · install when you are ready").setMimeType("application/vnd.android.package-archive").setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE).setDestinationUri(Uri.fromFile(target)).setAllowedOverRoaming(false);
        if(automatic)request.setAllowedNetworkTypes(DownloadManager.Request.NETWORK_WIFI).setAllowedOverMetered(false);
        downloadId=manager.enqueue(request);persist();change("phase","downloading","received",0,"total",release.optLong("bytes"),"message",automatic?"Downloading on Wi-Fi; waiting if Wi-Fi is unavailable…":"Downloading the update…");
    }
    void refreshLater(){if(!refreshQueued.compareAndSet(false,true))return;worker.execute(()->{try{if(downloadId!=0)refresh();}catch(Exception e){fail(e);}finally{refreshQueued.set(false);}});}
    private void refresh() throws Exception {
        try(Cursor cursor=manager.query(new DownloadManager.Query().setFilterById(downloadId))){
            if(cursor==null||!cursor.moveToFirst()){downloadId=0;persist();throw new IOException("The update download was removed. Tap Download update to try again.");}
            int status=cursor.getInt(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_STATUS));long received=cursor.getLong(cursor.getColumnIndexOrThrow(DownloadManager.COLUMN_BYTES_DOWNLOADED_SO_FAR));
            if(received>release.optLong("bytes")){manager.remove(downloadId);downloadId=0;persist();throw new IOException("Update exceeds its expected size");}
            if(status==DownloadManager.STATUS_FAILED){manager.remove(downloadId);downloadId=0;persist();throw new IOException("Android could not finish downloading the update. Check your connection and free space, then retry.");}
            if(status!=DownloadManager.STATUS_SUCCESSFUL){change("phase","downloading","received",received,"total",release.optLong("bytes"),"message",status==DownloadManager.STATUS_PAUSED||status==DownloadManager.STATUS_PENDING?"Waiting for a connection to download the update…":"Downloading the update…");return;}
        }
        change("phase","verifying","message","Verifying the app and its signing certificate…");
        try{File parent=readyFile.getParentFile();if(!parent.isDirectory()&&!parent.mkdirs())throw new IOException("Could not prepare update storage");
            try(android.os.ParcelFileDescriptor fd=manager.openDownloadedFile(downloadId);InputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(fd);OutputStream out=new FileOutputStream(readyFile)){
                if(!release.optString("sha256").equals(FileCopies.transfer(in,out,()->false)))throw new IOException("Update checksum did not match. Download it again.");
            }
            verify(readyFile);manager.remove(downloadId);downloadId=0;failedVersion="";persist();ready();
        }catch(Exception e){manager.remove(downloadId);downloadId=0;Files.deleteIfExists(readyFile.toPath());persist();throw e;}
    }
    private void verify(File file) throws Exception {
        if(file.length()!=release.optLong("bytes"))throw new IOException("The update is incomplete. Download it again.");
        try(InputStream in=new FileInputStream(file)){if(!release.optString("sha256").equals(FileCopies.transfer(in,new OutputStream(){@Override public void write(int b){}@Override public void write(byte[] b,int off,int len){}},()->false)))throw new IOException("Update verification failed. Download it again.");}
        PackageManager pm=app.getPackageManager();PackageInfo installed=pm.getPackageInfo(app.getPackageName(),PackageManager.GET_SIGNING_CERTIFICATES),next=pm.getPackageArchiveInfo(file.getAbsolutePath(),PackageManager.GET_SIGNING_CERTIFICATES);
        if(next==null||!app.getPackageName().equals(next.packageName)||!release.optString("version").equals(next.versionName)||next.getLongVersionCode()<=installed.getLongVersionCode()||next.signingInfo==null||installed.signingInfo==null||!signatures(next).equals(signatures(installed)))throw new IOException("This APK is not a compatible signed Resonance update. Your current app is unchanged.");
    }
    private static Set<String> signatures(PackageInfo info){Set<String> result=new HashSet<>();for(Signature s:info.signingInfo.getApkContentsSigners())result.add(s.toCharsString());return result;}
    private void ready(){change("phase","ready","message","Update verified. Tap Install update when you are ready.");}
    void cancel(){if("installing".equals(state.optString("phase")))return;generation.incrementAndGet();HttpURLConnection c=connection;if(c!=null)c.disconnect();worker.execute(()->{if(downloadId!=0)manager.remove(downloadId);downloadId=0;persist();try{if(readyFile.isFile()&&!UpdatePolicy.rejected(release,failedVersion)){verify(readyFile);ready();return;}}catch(Exception ignored){}change("phase",release==null?"idle":"available","message","Update download cancelled.");});}
    void resumed(){worker.execute(()->{if("installing".equals(state.optString("phase")))ready();});check(true);}
    void install(Activity activity){if(!installQueued.compareAndSet(false,true))return;int ticket=generation.get();worker.execute(()->{String requested="";try{
        if(!"ready".equals(state.optString("phase")))return;
        requested=release.optString("version");checkOnWorker(false,ticket);
        if(ticket!=generation.get()||!"ready".equals(state.optString("phase"))||!requested.equals(release.optString("version")))return;
        change("phase","verifying","message","Checking the update before installation…");verify(readyFile);
        app.onMain(()->{if(activity.isFinishing()||activity.isDestroyed())throw new IOException("Open the app again to install the update.");
            if(!app.getPackageManager().canRequestPackageInstalls()){activity.startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+app.getPackageName())));change("phase","ready","message","Allow Resonance to install updates, return here, then tap Install update again.");}
            else{Uri uri=FileProvider.getUriForFile(app,app.getPackageName()+".updates",readyFile);change("phase","installing","message","Confirm the update in Android’s installer.");activity.startActivity(new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION));}return null;});
    }catch(Exception e){failedVersion=requested;fail(e);persist();checkOnWorker(false,generation.get());}finally{installQueued.set(false);}});}
}
