package music.resonance.mobile;

import android.app.*;
import android.content.*;
import android.net.Uri;
import android.os.*;
import android.view.*;
import android.webkit.*;
import android.widget.Toast;
import androidx.webkit.*;
import androidx.media3.session.*;
import androidx.media3.common.Player;
import com.google.common.util.concurrent.ListenableFuture;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
    private static final String ORIGIN="https://appassets.androidplatform.net";
    private WebView web;private ListenableFuture<MediaController> controller;
    private CompletableFuture<JSONObject> picker;
    private boolean pickingDestination;
    private CompletableFuture<JSONObject> captureRequest;
    private final ResonanceApp app=ResonanceApp.instance;
    @Override public void onCreate(Bundle saved){super.onCreate(saved);
        setVolumeControlStream(android.media.AudioManager.STREAM_MUSIC);
        androidx.core.view.WindowCompat.setDecorFitsSystemWindows(getWindow(),false);
        android.widget.FrameLayout safeArea=new android.widget.FrameLayout(this);safeArea.setBackgroundColor(0xff100e18);
        web=new WebView(this);safeArea.addView(web,new android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(safeArea);web.setBackgroundColor(0xff100e18);
        // WebView padding does not constrain position:fixed HTML. Resize its parent content area instead.
        androidx.core.view.ViewCompat.setOnApplyWindowInsetsListener(safeArea,(view,insets)->{
            androidx.core.graphics.Insets bars=insets.getInsets(androidx.core.view.WindowInsetsCompat.Type.systemBars()|androidx.core.view.WindowInsetsCompat.Type.displayCutout()|androidx.core.view.WindowInsetsCompat.Type.mandatorySystemGestures()|androidx.core.view.WindowInsetsCompat.Type.ime());
            view.setPadding(bars.left,bars.top,bars.right,bars.bottom);return androidx.core.view.WindowInsetsCompat.CONSUMED;
        });androidx.core.view.ViewCompat.requestApplyInsets(safeArea);
        WebSettings settings=web.getSettings();settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setMediaPlaybackRequiresUserGesture(false);settings.setSupportMultipleWindows(false);CookieManager.getInstance().setAcceptCookie(false);
        WebViewAssetLoader assets=new WebViewAssetLoader.Builder().addPathHandler("/artwork/",path->{InputStream input=app.artworkRecovery.open(path);if(input==null)return missing();WebResourceResponse response=new WebResourceResponse("image/jpeg",null,input);response.setResponseHeaders(Map.of("Cache-Control","no-store"));return response;}).addPathHandler("/",path->{
            if(path.contains("..")||path.contains("\\"))return missing();String name=path.isEmpty()?"index.html":path;String mime=name.endsWith(".js")?"text/javascript":name.endsWith(".css")?"text/css":name.endsWith(".svg")?"image/svg+xml":name.endsWith(".png")?"image/png":name.endsWith(".webp")?"image/webp":name.endsWith(".txt")?"text/plain":"text/html";
            try{WebResourceResponse r=new WebResourceResponse(mime,"UTF-8",getAssets().open("web/"+name));r.setResponseHeaders(Map.of("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'; base-uri 'self'","X-Content-Type-Options","nosniff"));return r;}catch(IOException e){return missing();}
        }).build();
        web.setWebViewClient(new WebViewClient(){
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){if(!trusted(request.getUrl()))return missing();return assets.shouldInterceptRequest(request.getUrl());}
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){Uri u=request.getUrl();if(trusted(u))return false;if("https".equals(u.getScheme())&&Set.of("musicbrainz.org","www.youtube.com","music.youtube.com","open.spotify.com","lrclib.net","github.com").contains(u.getHost()))try{startActivity(new Intent(Intent.ACTION_VIEW,u));}catch(Exception ignored){}return true;}
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){view.destroy();new AlertDialog.Builder(MainActivity.this).setTitle("Visuals need a restart").setMessage("Your music keeps playing. Reopen the screen to continue.").setPositiveButton("Reopen",(d,w)->recreate()).show();return true;}
        });
        if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)){new AlertDialog.Builder(this).setMessage("Update Android System WebView to use Resonance.").setPositiveButton("Close",(d,w)->finish()).show();return;}
        WebViewCompat.addWebMessageListener(web,"ResonanceNative",Set.of(ORIGIN),(view,message,origin,main,reply)->{
            if(!main||!trusted(origin))return;String text=message.getData();if(text==null||text.length()>1_000_000)return;JSONObject request=Json.parse(text);String id=request.optString("id");
            ExecutorService executor=Set.of("researchGenres","research","search","lyricsSearch","syncMatch","updateDownloader","pickFolder","pickDestination","captureStart").contains(request.optString("action"))?app.io:app.bridge;
            executor.execute(()->{JSONObject result;try{result=Json.object("id",id,"value",handle(request.optString("action"),request.optJSONObject("data")==null?new JSONObject():request.optJSONObject("data")));}catch(Exception e){result=Json.object("id",id,"error",Json.error(e));}String response=result.toString();app.main.post(()->{if(!isDestroyed())reply.postMessage(response);});});
        });
        controller=new MediaController.Builder(this,new SessionToken(this,new ComponentName(this,PlaybackService.class))).buildAsync();
        web.loadUrl(ORIGIN+"/");
    }
    private static boolean trusted(Uri u){return "https".equals(u.getScheme())&&"appassets.androidplatform.net".equals(u.getHost())&&u.getPort()==-1;}
    private static WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",Map.of("Cache-Control","no-store"),new ByteArrayInputStream(new byte[0]));}
    private PlaybackService playback() throws Exception {controller.get(12,TimeUnit.SECONDS);PlaybackService s=PlaybackService.instance;if(s==null)throw new IOException("Player is still starting. Try again.");return s;}
    private Object handle(String action,JSONObject data) throws Exception {
        LibraryStore lib=app.library;
        if(Set.of("constellationQueue","analysis","visuals","state","play","pause","seek","next","previous","volume","shuffle","repeat","equalizer").contains(action))playback(); // Never await controller binding on Android's main thread.
        switch(action){
            case "appUpdate":{
                switch(data.optString("action")){
                    case "status":break;
                    case "check":app.updates.check(false);break;
                    case "download":app.updates.download();break;
                    case "cancel":app.updates.cancel();break;
                    case "preferences":app.updates.preferences(data.optJSONObject("preferences")==null?new JSONObject():data.optJSONObject("preferences"));break;
                    case "install":app.updates.install(this);break;
                    case "releases":app.onMain(()->{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(AppRelease.PAGE)));return null;});break;
                    default:throw new IOException("Unknown update action");
                }
                return app.updates.snapshot();
            }
            case "library":app.research.seedLocal();return Json.put(Json.put(lib.snapshot(),"openDownloads",getIntent().getBooleanExtra("openDownloads",false)),"displayHz",app.onMain(()->getWindowManager().getDefaultDisplay().getRefreshRate()));
            case "preferences":{JSONObject p=lib.updatePreferences(data);app.songAnalysis.setLeveling(p.optBoolean("leveling"));return p;}
            case "storage":return lib.storage();
            case "playbackDetails":case "copyPlaybackDetails":{
                JSONObject live=app.onMain(()->PlaybackService.instance==null?new JSONObject():PlaybackService.instance.state());
                JSONObject last=lib.setting("lastPlaybackError");String id=live.optString("id",last.optString("id"));JSONObject report=lib.audioDetails(id);
                Json.put(report,"error",live.optString("error"));Json.put(report,"errorCode",live.optString("errorCode"));Json.put(report,"errorDetails",live.optString("errorDetails"));
                Json.put(report,"device",Build.MANUFACTURER+" "+Build.MODEL+" · Android "+Build.VERSION.RELEASE);Json.put(report,"appVersion",getPackageManager().getPackageInfo(getPackageName(),0).versionName);
                if(action.equals("copyPlaybackDetails"))app.onMain(()->{getSystemService(android.content.ClipboardManager.class).setPrimaryClip(ClipData.newPlainText("Resonance playback details",report.toString(2)));return null;});
                return report;
            }
            case "retryArtwork":app.artworkRecovery.retry();return Json.object("ok",true);
            case "clearArtwork":lib.clearArtwork();app.artworkRecovery.retry();return Json.object("ok",true);
            case "scan":app.io.execute(lib::scan);return Json.object("ok",true);
            case "status":return Json.object("libraryRevision",lib.revision.get(),"artworkRevision",app.artworkRecovery.revision.get(),"scan",lib.scanResult,"downloads",app.downloads.progress,"previewRevision",app.downloads.previewRevision,"tools",lib.setting("downloadTools"));
            case "pickFolder":case "pickDestination":{
                CompletableFuture<JSONObject> task=new CompletableFuture<>();app.onMain(()->{if(picker!=null)throw new IOException("A folder picker is already open");picker=task;pickingDestination=action.equals("pickDestination");Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION|Intent.FLAG_GRANT_PREFIX_URI_PERMISSION|(pickingDestination?Intent.FLAG_GRANT_WRITE_URI_PERMISSION:0));startActivityForResult(i,42);return null;});return task.get(10,TimeUnit.MINUTES);
            }
            case "defaultDestination":lib.setting("downloadDestination",new JSONObject());return Json.object("ok",true);
            case "source":{String type=data.optString("type");if(!type.equals("youtube")&&!type.equals("spotify")&&!type.equals("deezer"))throw new IOException("Choose a local folder with the Android picker");Json.put(data,"url",Downloads.playlist(data.optString("url"),type));return lib.source(data);}
            case "disconnect":lib.disconnect(data.optString("id"));return Json.object("ok",true);
            case "edit":return lib.edit(data);
            case "playlist":return lib.savePlaylist(data);
            case "deletePlaylist":lib.deletePlaylist(data.optString("id"));return Json.object("ok",true);
            case "history":return lib.setting("history");
            case "loudnessStatus":return app.songAnalysis.coverage();
            case "playOriginal":return app.onMain(()->{PlaybackService s=playback();s.playOriginal();return s.state();});
            case "constellation":{
                JSONArray tracks=lib.tracks(),failed=new JSONArray();JSONObject profiles=new JSONObject();
                for(int i=0;i<tracks.length();i++){JSONObject t=tracks.optJSONObject(i);if(t==null||!t.optBoolean("available",true))continue;String id=t.optString("id");JSONObject summary=ConstellationData.summarize(app.songAnalysis.profile(id));if(summary!=null)Json.put(profiles,id,summary);else if(!app.songAnalysis.status(id).optString("error").isEmpty())failed.put(id);}
                return Json.object("profiles",profiles,"failed",failed,"saved",ConstellationData.clean(lib.setting("constellation"),ConstellationData.known(tracks)),"canPrepare",charging());
            }
            case "saveConstellation":lib.setting("constellation",ConstellationData.clean(data,ConstellationData.known(lib.tracks())));return Json.object("ok",true);
            case "prepareConstellation":if(!charging())throw new IOException("Connect a charger to prepare more sound data.");return app.songAnalysis.request(data.optString("id"),false,false);
            case "constellationQueue":{
                String mode=data.optString("mode");if(!Set.of("now","after","next","add").contains(mode))throw new IOException("Choose how to queue this journey.");
                JSONArray ids=ConstellationData.queueIds(data.optJSONArray("ids"),ConstellationData.available(lib.tracks()));
                if(ids.length()==0||data.optJSONArray("ids")==null||ids.length()!=data.optJSONArray("ids").length())throw new IOException("Some songs are unavailable. Reopen Constellation to refresh the library.");
                if(mode.equals("now"))stopService(new Intent(this,CaptureService.class));
                return app.onMain(()->{PlaybackService s=playback();if(mode.equals("after")&&s.player.getMediaItemCount()==0)stopService(new Intent(this,CaptureService.class));s.constellationQueue(ids,mode);if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},44);return Json.put(s.state(),"capturing",CaptureService.instance!=null);});
            }
            case "songProfile":return app.songAnalysis.status(data.optString("id"));
            case "analyzeSong":return app.songAnalysis.request(data.optString("id"),data.optBoolean("force"),data.optBoolean("priority"));
            case "listeningEdit":return app.songAnalysis.edit(data.optString("id"),data);
            case "researchGenres":return app.research.genres(data.optString("id"));
            case "research":return app.research.discover(data.optString("id"),data.optBoolean("force"));
            case "search":{String id=data.optString("id");JSONObject original=lib.track(id),query=Json.parse(original.toString());for(String field:List.of("artist","title"))if(data.has(field))Json.put(query,field,data.optString(field));JSONArray candidates=app.research.search(query);lib.setting("recordingSearch:"+id,Json.object("candidates",candidates,"stamp",MetadataEdits.snapshot(original)));return candidates;}
            case "recordingApply":{String id=data.optString("id");JSONObject saved=lib.setting("recordingSearch:"+id);if(saved.optJSONObject("stamp")==null||!MetadataEdits.snapshot(lib.track(id)).toString().equals(saved.optJSONObject("stamp").toString()))throw new IOException("Details changed. Search again.");JSONObject candidate=saved.getJSONArray("candidates").getJSONObject(data.getInt("index")),patch=MetadataEdits.choose(candidate,data.optJSONArray("fields"));Json.put(patch,"id",id);return lib.edit(patch);}
            case "metadataUndo":return lib.undoMetadata(data.optString("id"));
            case "lyricsSearch":return app.research.lyricsSearch(lib.track(data.optString("id")));
            case "syncCheck":return startDownloadJob("check",data);
            case "syncPreview":return app.downloads.preview;
            case "syncMatch":return app.downloads.matches(data);
            case "syncChooseMatch":return app.downloads.selectMatch(data.optString("key"),data.optString("videoId"));
            case "syncDownload":return startDownloadJob("download",data);
            case "syncCancel":app.downloads.cancel();return Json.object("ok",true);
            case "updateDownloader":return startDownloadJob("update",data);
            case "captureStart":{CompletableFuture<JSONObject> request=new CompletableFuture<>();app.onMain(()->{if(captureRequest!=null)throw new IOException("Audio capture consent is already open");captureRequest=request;if(checkSelfPermission(android.Manifest.permission.RECORD_AUDIO)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.RECORD_AUDIO},45);else requestCapture();return null;});return request.get(10,TimeUnit.MINUTES);}
            case "captureStop":CaptureService.error="";stopService(new Intent(this,CaptureService.class));return Json.object("ok",true);
            case "analysis":return CaptureService.instance!=null?CaptureService.instance.spectrum.snapshot():playback().spectrum.snapshot();
            case "visuals":playback().spectrum.enabled=data.optBoolean("enabled");if(CaptureService.instance!=null)CaptureService.instance.spectrum.enabled=data.optBoolean("enabled");return Json.object("ok",true);
            case "state":return app.onMain(()->Json.put(Json.put(playback().state(),"capturing",CaptureService.instance!=null),"captureError",CaptureService.error));
            case "play":stopService(new Intent(this,CaptureService.class));return app.onMain(()->{PlaybackService s=playback();JSONArray ids=data.optJSONArray("queue");if(ids!=null)s.load(ids,data.optInt("index"),data.optLong("position"),true);else if(data.has("id"))s.playQueued(data.optString("id"),data.optLong("position"));else s.resume();if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},44);return s.state();});
            case "pause":return app.onMain(()->{PlaybackService s=playback();s.pause();return s.state();});
            case "seek":return app.onMain(()->{PlaybackService s=playback();s.player.seekTo(Math.max(0,data.optLong("position")));return s.state();});
            case "next":return app.onMain(()->{PlaybackService s=playback();if(s.player.hasNextMediaItem())s.player.seekToNextMediaItem();else s.player.seekTo(0,0);s.prepareAfterNavigation();return s.state();});
            case "previous":return app.onMain(()->{PlaybackService s=playback();if(s.player.getCurrentPosition()>3000)s.player.seekTo(0);else if(s.player.hasPreviousMediaItem())s.player.seekToPreviousMediaItem();s.prepareAfterNavigation();return s.state();});
            case "volume":return app.onMain(()->{PlaybackService s=playback();s.player.setVolume(Math.max(0,Math.min(1,(float)data.optDouble("value",1))));return s.state();});
            case "shuffle":return app.onMain(()->{PlaybackService s=playback();s.shuffle(data.has("value")?data.optBoolean("value"):!s.player.getShuffleModeEnabled());return s.state();});
            case "equalizer":return app.onMain(()->{playback().equalize(data.getJSONArray("values"));return Json.object("ok",true);});
            case "repeat":return app.onMain(()->{PlaybackService s=playback();s.player.setRepeatMode(data.optBoolean("one")?Player.REPEAT_MODE_ONE:Player.REPEAT_MODE_ALL);return s.state();});
            case "backgroundSettings":return app.onMain(()->{startActivity(new Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS,Uri.parse("package:"+getPackageName())));return Json.object("ok",true);});
            case "notificationSettings":return app.onMain(()->{startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName()));return Json.object("ok",true);});
            default:throw new IOException("Unknown action: "+action);
        }
    }
    private boolean charging(){Intent battery=registerReceiver(null,new IntentFilter(Intent.ACTION_BATTERY_CHANGED));return battery!=null&&battery.getIntExtra(BatteryManager.EXTRA_PLUGGED,0)!=0;}
    private JSONObject startDownloadJob(String kind,JSONObject data) throws Exception {
        app.downloads.begin(kind);try{libJob(kind,data);app.onMain(()->{if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=android.content.pm.PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},44);startForegroundService(new Intent(this,DownloadService.class).putExtra("operation",app.downloads.progress.optLong("operation")));return null;});}catch(Exception e){app.downloads.fail(e);throw e;}return app.downloads.progress;
    }
    private void libJob(String kind,JSONObject data){app.library.setting("downloadJob",Json.object("operation",app.downloads.progress.optLong("operation"),"kind",kind,"data",data));}
    @Override protected void onActivityResult(int request,int result,Intent intent){super.onActivityResult(request,result,intent);if(request==43){finishCapture(result,intent);return;}if(request!=42||picker==null)return;CompletableFuture<JSONObject> task=picker;picker=null;boolean destination=pickingDestination;if(result!=RESULT_OK||intent==null||intent.getData()==null){task.complete(Json.object("cancelled",true));return;}app.io.execute(()->{try{Uri uri=intent.getData();int flags=intent.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);if(destination&&(flags&Intent.FLAG_GRANT_WRITE_URI_PERMISSION)==0)throw new IOException("Choose a folder that allows saving files");getContentResolver().takePersistableUriPermission(uri,destination?(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION):Intent.FLAG_GRANT_READ_URI_PERMISSION);androidx.documentfile.provider.DocumentFile tree=androidx.documentfile.provider.DocumentFile.fromTreeUri(this,uri);if(tree==null||!tree.canRead()||(destination&&!tree.canWrite()))throw new IOException("This folder is not accessible. Please choose another one.");JSONObject source=app.library.source(Json.object("type","folder","name",tree.getName(),"uri",uri.toString()));if(destination)app.library.setting("downloadDestination",Json.object("uri",uri.toString(),"name",tree.getName(),"sourceId",source.optString("id")));task.complete(source);app.library.scan();}catch(Exception e){task.completeExceptionally(e);}});}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);if(intent.getBooleanExtra("openDownloads",false)&&web!=null)web.evaluateJavascript("window.mobileShowDownloads?.()",null);}
    private void requestCapture(){startActivityForResult(getSystemService(android.media.projection.MediaProjectionManager.class).createScreenCaptureIntent(),43);}
    private void finishCapture(int result,Intent consent){CompletableFuture<JSONObject> pending=captureRequest;captureRequest=null;if(pending==null)return;if(result!=RESULT_OK||consent==null){pending.complete(Json.object("cancelled",true));return;}if(PlaybackService.instance!=null)PlaybackService.instance.pause();startForegroundService(new Intent(this,CaptureService.class).putExtra("consent",consent));pending.complete(Json.object("started",true));}
    @Override public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==45&&captureRequest!=null){if(grants.length>0&&grants[0]==android.content.pm.PackageManager.PERMISSION_GRANTED)requestCapture();else{captureRequest.complete(Json.object("cancelled",true));captureRequest=null;}}}
    @Override protected void onPause(){super.onPause();if(web!=null){web.evaluateJavascript("window.mobileActive?.(false)",null);web.onPause();}if(PlaybackService.instance!=null)PlaybackService.instance.spectrum.enabled=false;if(CaptureService.instance!=null)CaptureService.instance.spectrum.enabled=false;}
    @Override protected void onResume(){super.onResume();if(web!=null){web.onResume();web.evaluateJavascript("window.mobileActive?.(true)",null);}}
    @Override public void onBackPressed(){web.evaluateJavascript("window.mobileBack?.()",result->{if(!"true".equals(result))moveTaskToBack(true);});}
    @Override protected void onDestroy(){if(controller!=null)MediaController.releaseFuture(controller);if(picker!=null)picker.complete(Json.object("cancelled",true));if(captureRequest!=null)captureRequest.complete(Json.object("cancelled",true));if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}


