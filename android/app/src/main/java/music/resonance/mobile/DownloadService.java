package music.resonance.mobile;

import android.app.*;
import android.content.Intent;
import android.os.*;
import org.json.*;

public final class DownloadService extends Service {
    private boolean busy;
    public static volatile boolean active;
    private PowerManager.WakeLock wake;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private final Runnable progress=new Runnable(){public void run(){if(!busy)return;getSystemService(NotificationManager.class).notify(20,notification(true));handler.postDelayed(this,1000);}};
    @Override public void onCreate(){super.onCreate();getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel("downloads","Playlist downloads",NotificationManager.IMPORTANCE_LOW));}
    private Notification notification(boolean ongoing){
        JSONObject job=ResonanceApp.instance.downloads.progress;
        Intent open=new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP).putExtra("openDownloads",true);
        Notification.Builder builder=new Notification.Builder(this,"downloads").setSmallIcon(R.drawable.ic_resonance).setContentTitle(ongoing?"Resonance · playlist update":"Resonance").setContentText(job.optString("message")).setStyle(new Notification.BigTextStyle().bigText(job.optString("message"))).setContentIntent(PendingIntent.getActivity(this,20,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).setOnlyAlertOnce(true).setOngoing(ongoing).setAutoCancel(!ongoing);
        if(ongoing){int percent=(int)job.optDouble("percent",-1);builder.setProgress(100,Math.max(0,percent),percent<0).addAction(new Notification.Action.Builder(null,"Cancel",PendingIntent.getService(this,21,new Intent(this,DownloadService.class).setAction("cancel"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)).build());}
        return builder.build();
    }
    @Override public int onStartCommand(Intent intent,int flags,int id){
        if(intent!=null&&"cancel".equals(intent.getAction())){ResonanceApp.instance.downloads.cancel();return START_NOT_STICKY;}
        if(busy)return START_NOT_STICKY;
        if(intent==null){stopSelf(id);return START_NOT_STICKY;}
        busy=true;active=true;startForeground(20,notification(true));
        wake=getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"Resonance:playlistUpdate");wake.acquire(6*60*60*1000L);
        JSONObject job=ResonanceApp.instance.library.setting("downloadJob");String kind=job.optString("kind");JSONObject data=job.optJSONObject("data")==null?new JSONObject():job.optJSONObject("data");long operation=intent.getLongExtra("operation",0);handler.post(progress);
        ResonanceApp.instance.io.execute(()->{
            Downloads downloads=ResonanceApp.instance.downloads;
            try{if(operation!=job.optLong("operation")||operation==0)throw new java.io.IOException("The update request expired. Please try again.");if("check".equals(kind))downloads.check(data.optString("sourceId"));else if("update".equals(kind))downloads.updateEngine();else downloads.download(DownloadSelection.resolve(data.optJSONArray("selected"),downloads.preview));}
            catch(Exception e){downloads.fail(e);}
            finally{handler.post(()->{busy=false;active=false;handler.removeCallbacks(progress);if(wake!=null&&wake.isHeld())wake.release();stopForeground(STOP_FOREGROUND_REMOVE);getSystemService(NotificationManager.class).notify(20,notification(false));stopSelf(id);});}
        });
        return START_NOT_STICKY;
    }
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onTimeout(int startId,int fgsType){ResonanceApp.instance.downloads.cancel();stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
    @Override public void onDestroy(){active=false;handler.removeCallbacksAndMessages(null);if(wake!=null&&wake.isHeld())wake.release();super.onDestroy();}
}
