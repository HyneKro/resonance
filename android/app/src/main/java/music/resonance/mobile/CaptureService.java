package music.resonance.mobile;
import android.app.*;import android.content.*;import android.content.pm.ServiceInfo;import android.media.*;import android.media.projection.*;import android.os.*;

/** Analysis only: captured samples are never saved, sent over the network or played back. */
public final class CaptureService extends Service {
    public static volatile CaptureService instance;
    public static volatile String error="";
    public final SpectrumProcessor spectrum=new SpectrumProcessor();
    private MediaProjection projection;private AudioRecord recorder;private volatile boolean listening;
    @Override public void onCreate(){super.onCreate();NotificationManager n=getSystemService(NotificationManager.class);n.createNotificationChannel(new NotificationChannel("capture","Audio visualizer",NotificationManager.IMPORTANCE_LOW));PendingIntent stop=PendingIntent.getService(this,0,new Intent(this,CaptureService.class).setAction("stop"),PendingIntent.FLAG_IMMUTABLE);startForeground(21,new Notification.Builder(this,"capture").setSmallIcon(R.drawable.ic_resonance).setContentTitle("Resonance is listening to other apps").setContentText("Visualizing permitted audio. Nothing is recorded.").addAction(new Notification.Action.Builder(null,"Stop",stop).build()).setOngoing(true).build(),ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION);}
    @android.annotation.SuppressLint("MissingPermission")
    @Override public int onStartCommand(Intent intent,int flags,int id){if(intent==null||"stop".equals(intent.getAction())){stopSelf();return START_NOT_STICKY;}if(listening)return START_NOT_STICKY;error="";try{
        MediaProjectionManager manager=getSystemService(MediaProjectionManager.class);projection=manager.getMediaProjection(Activity.RESULT_OK,intent.getParcelableExtra("consent"));projection.registerCallback(new MediaProjection.Callback(){@Override public void onStop(){stopSelf();}},new Handler(Looper.getMainLooper()));
        AudioPlaybackCaptureConfiguration config=new AudioPlaybackCaptureConfiguration.Builder(projection).addMatchingUsage(AudioAttributes.USAGE_MEDIA).addMatchingUsage(AudioAttributes.USAGE_GAME).addMatchingUsage(AudioAttributes.USAGE_UNKNOWN).excludeUid(android.os.Process.myUid()).build();
        AudioFormat format=new AudioFormat.Builder().setSampleRate(48000).setEncoding(AudioFormat.ENCODING_PCM_16BIT).setChannelMask(AudioFormat.CHANNEL_IN_STEREO).build();int buffer=Math.max(16384,AudioRecord.getMinBufferSize(48000,AudioFormat.CHANNEL_IN_STEREO,AudioFormat.ENCODING_PCM_16BIT));recorder=new AudioRecord.Builder().setAudioFormat(format).setBufferSizeInBytes(buffer).setAudioPlaybackCaptureConfig(config).build();recorder.startRecording();instance=this;listening=true;spectrum.enabled=true;
        new Thread(()->{short[] pcm=new short[2048];while(listening){try{int n=recorder.read(pcm,0,pcm.length);if(n>0)spectrum.capture(pcm,n);else if(n<0)break;}catch(Exception e){break;}}},"ResonanceCapture").start();
    }catch(Exception e){error="Audio capture could not start. Try again and allow Android's capture request.";stopSelf();}return START_NOT_STICKY;}
    @Override public IBinder onBind(Intent intent){return null;}
    @Override public void onDestroy(){listening=false;instance=null;if(recorder!=null){try{recorder.stop();}catch(Exception ignored){}recorder.release();}if(projection!=null)projection.stop();super.onDestroy();}
}
