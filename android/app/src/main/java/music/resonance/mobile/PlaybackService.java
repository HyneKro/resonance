package music.resonance.mobile;

import android.app.PendingIntent;
import android.content.*;
import android.os.*;
import androidx.media3.common.*;
import androidx.media3.exoplayer.*;
import androidx.media3.exoplayer.audio.*;
import androidx.media3.session.*;
import org.json.*;
import java.util.*;

@androidx.annotation.OptIn(markerClass=androidx.media3.common.util.UnstableApi.class)
public final class PlaybackService extends MediaSessionService {
    public static volatile PlaybackService instance;
    public ExoPlayer player;
    public final SpectrumProcessor spectrum=new SpectrumProcessor();
    public final LevelingProcessor leveling=new LevelingProcessor();
    private final SongProfile.TrackLevel trackLevel=new SongProfile.TrackLevel();
    private String analysisId="";private JSONObject songProfile=new JSONObject(),listeningEdit=new JSONObject(),listeningPrefs=new JSONObject();private long profileCheck;
    private final Runnable listening=new Runnable(){public void run(){updateListening();handler.postDelayed(this,150);}};
    private MediaSession session;
    private android.media.audiofx.Equalizer equalizer;
    private final Random shuffleRandom=new Random();
    private volatile long saveVersion;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private String countedId="",error="",errorCode="",errorDetails="";private double elapsed;private boolean counted,wasPlaying;private long accountAt=SystemClock.elapsedRealtime();
    private final Runnable checkpoint=new Runnable(){public void run(){save();handler.postDelayed(this,5000);}};
    @Override public void onCreate(){super.onCreate();instance=this;
        DefaultRenderersFactory renderers=new DefaultRenderersFactory(this){@Override protected AudioSink buildAudioSink(Context context,boolean floatOutput,boolean playbackParams){return new DefaultAudioSink.Builder(context).setAudioProcessors(new androidx.media3.common.audio.AudioProcessor[]{spectrum,leveling}).build();}};
        renderers.setEnableDecoderFallback(true);
        LibraryStore store=ResonanceApp.instance.library;
        androidx.media3.datasource.DataSource.Factory files=new androidx.media3.datasource.ResolvingDataSource.Factory(new androidx.media3.datasource.DefaultDataSource.Factory(this),spec->{
            if(spec.key==null||!spec.key.startsWith("resonance:"))return spec;
            return spec.withUri(store.playbackUri(spec.key.substring(10),spec.uri));
        });
        player=new ExoPlayer.Builder(this,renderers).setMediaSourceFactory(new androidx.media3.exoplayer.source.DefaultMediaSourceFactory(files)).setAudioAttributes(new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),true).setHandleAudioBecomingNoisy(true).setWakeMode(C.WAKE_MODE_LOCAL).build();
        player.setRepeatMode(Player.REPEAT_MODE_ALL);
        session=new MediaSession.Builder(this,player).setCallback(new MediaSession.Callback(){
            @Override public MediaSession.ConnectionResult onConnect(MediaSession session,MediaSession.ControllerInfo controller){
                return new MediaSession.ConnectionResult.AcceptedResultBuilder(session).setAvailableSessionCommands(MediaSession.ConnectionResult.DEFAULT_SESSION_COMMANDS.buildUpon().add(new SessionCommand("resonance.volumeDown",Bundle.EMPTY)).add(new SessionCommand("resonance.volumeUp",Bundle.EMPTY)).build()).build();
            }
            @Override public com.google.common.util.concurrent.ListenableFuture<SessionResult> onCustomCommand(MediaSession session,MediaSession.ControllerInfo controller,SessionCommand command,Bundle args){
                if(command.customAction.equals("resonance.volumeDown")||command.customAction.equals("resonance.volumeUp")){
                    getSystemService(android.media.AudioManager.class).adjustStreamVolume(android.media.AudioManager.STREAM_MUSIC,command.customAction.endsWith("Up")?android.media.AudioManager.ADJUST_RAISE:android.media.AudioManager.ADJUST_LOWER,0);
                    return com.google.common.util.concurrent.Futures.immediateFuture(new SessionResult(SessionResult.RESULT_SUCCESS));
                }
                return com.google.common.util.concurrent.Futures.immediateFuture(new SessionResult(SessionError.ERROR_NOT_SUPPORTED));
            }
            @Override public com.google.common.util.concurrent.ListenableFuture<MediaSession.MediaItemsWithStartPosition> onPlaybackResumption(MediaSession session,MediaSession.ControllerInfo controller){
                List<MediaItem> items=new ArrayList<>();for(int i=0;i<player.getMediaItemCount();i++)items.add(player.getMediaItemAt(i));
                if(items.isEmpty())return com.google.common.util.concurrent.Futures.immediateFailedFuture(new IllegalStateException("Choose music in Resonance first"));
                return com.google.common.util.concurrent.Futures.immediateFuture(new MediaSession.MediaItemsWithStartPosition(items,Math.max(0,player.getCurrentMediaItemIndex()),Math.max(0,player.getCurrentPosition())));
            }
        }).setMediaButtonPreferences(List.of(
            new CommandButton.Builder(CommandButton.ICON_VOLUME_DOWN).setDisplayName("Volume down").setSessionCommand(new SessionCommand("resonance.volumeDown",Bundle.EMPTY)).setSlots(CommandButton.SLOT_BACK_SECONDARY).build(),
            new CommandButton.Builder(CommandButton.ICON_VOLUME_UP).setDisplayName("Volume up").setSessionCommand(new SessionCommand("resonance.volumeUp",Bundle.EMPTY)).setSlots(CommandButton.SLOT_FORWARD_SECONDARY).build()
        )).setSessionActivity(PendingIntent.getActivity(this,0,new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT)).build();
        player.addListener(new Player.Listener(){
            @Override public void onAudioSessionIdChanged(int audioSessionId){if(equalizer!=null){equalizer.release();equalizer=null;}if(audioSessionId!=C.AUDIO_SESSION_ID_UNSET)try{JSONObject p=ResonanceApp.instance.library.setting("preferences");equalize(new JSONArray().put(p.optDouble("eqLow",0)).put(p.optDouble("eqMid",0)).put(p.optDouble("eqHigh",0)));}catch(Exception ignored){}}
            @Override public void onMediaItemTransition(MediaItem item,int reason){if(item==null)return;updateListening(true);account();clearError();elapsed=0;counted=false;countedId=item.mediaId;LibraryStore lib=ResonanceApp.instance.library;JSONObject history=lib.setting("history");JSONArray old=history.optJSONArray("items"),next=new JSONArray();if(old!=null)for(int i=Math.max(0,old.length()-199);i<old.length();i++)next.put(old.opt(i));next.put(Json.object("id",item.mediaId,"at",System.currentTimeMillis()));ResonanceApp.instance.io.execute(()->lib.setting("history",Json.object("items",next)));}
            @Override public void onIsPlayingChanged(boolean playing){account();}
            @Override public void onPlaybackStateChanged(int state){if(state==Player.STATE_READY)clearError();}
            @Override public void onPlayerError(PlaybackException e){
                MediaItem item=player.getCurrentMediaItem();boolean linked=item!=null&&item.localConfiguration!=null&&"content".equals(item.localConfiguration.uri.getScheme());
                errorCode=e.getErrorCodeName();error=PlaybackProblem.message(e.errorCode,linked);errorDetails=PlaybackProblem.detail(errorCode,e);
                JSONObject report=Json.object("id",item==null?"":item.mediaId,"error",error,"errorCode",errorCode,"errorDetails",errorDetails,"at",System.currentTimeMillis());
                ResonanceApp.instance.io.execute(()->ResonanceApp.instance.library.setting("lastPlaybackError",report));
            }
        });
        JSONObject saved=ResonanceApp.instance.library.setting("player");player.setVolume((float)Math.max(0,Math.min(1,saved.optDouble("volume",1))));player.setShuffleModeEnabled(saved.optBoolean("shuffle"));player.setRepeatMode(saved.optInt("repeat")==Player.REPEAT_MODE_ONE?Player.REPEAT_MODE_ONE:Player.REPEAT_MODE_ALL);JSONArray queue=saved.optJSONArray("queue");if(queue!=null){load(queue,saved.optInt("index"),saved.optLong("position"),false);if(player.getShuffleModeEnabled()){int[] order=PlaybackQueue.restore(saved.optJSONArray("playbackOrder"),state().optJSONArray("queue"));if(order!=null)player.setShuffleOrder(new androidx.media3.exoplayer.source.ShuffleOrder.DefaultShuffleOrder(order,shuffleRandom.nextLong()));save();}}handler.postDelayed(checkpoint,5000);handler.post(listening);
    }
    private void updateListening(){updateListening(false);}
    private void updateListening(boolean boundary){
        if(player==null||player.getCurrentMediaItem()==null)return;String id=player.getCurrentMediaItem().mediaId;long now=SystemClock.elapsedRealtime();
        boundary|=!id.equals(analysisId);analysisId=id;
        if(boundary||now-profileCheck>1500){profileCheck=now;ResonanceApp app=ResonanceApp.instance;songProfile=app.songAnalysis.profile(id);listeningEdit=app.library.setting("playbackEdit:"+id);listeningPrefs=app.library.setting("preferences");boolean enabled=listeningPrefs.optBoolean("leveling");if(boundary)leveling.selectTrack(trackLevel.select(songProfile,enabled));else leveling.setGain(trackLevel.update(songProfile,enabled));if(player.isPlaying()&&songProfile.length()==0&&(enabled||listeningPrefs.optBoolean("skipSilence")||listeningPrefs.optBoolean("autoDirection",true)&&!listeningPrefs.optBoolean("musicOnly")))try{app.songAnalysis.request(id,false);}catch(IllegalArgumentException ignored){}}
        if(!player.isPlaying()||player.getDuration()<=0)return;JSONObject range=listeningEdit.optBoolean("enabled")?listeningEdit:listeningPrefs.optBoolean("skipSilence")?songProfile.optJSONObject("trim"):null;if(range==null)return;
        long duration=player.getDuration(),start=Math.max(0,Math.min(duration-1000,(long)(range.optDouble("start")*1000))),end=Math.max(start+1000,Math.min(duration,(long)(range.optDouble("end",duration/1000d)*1000)));
        if(player.getCurrentPosition()<start-150)player.seekTo(start);else if(end<duration-100&&player.getCurrentPosition()>=end-50){if(player.getRepeatMode()==Player.REPEAT_MODE_ONE)player.seekTo(start);else if(player.hasNextMediaItem())player.seekToNextMediaItem();else player.seekTo(0,0);}
    }
    public void load(JSONArray ids,int index,long position,boolean autoplay){
        List<MediaItem> items=new ArrayList<>();String selected=ids.optString(Math.max(0,index));int actual=0;LibraryStore lib=ResonanceApp.instance.library;
        for(int i=0;i<ids.length();i++){JSONObject t=lib.track(ids.optString(i));if(t.length()==0)continue;if(t.optString("id").equals(selected))actual=items.size();MediaMetadata.Builder metadata=new MediaMetadata.Builder().setTitle(t.optString("title")).setArtist(t.optString("artist")).setAlbumTitle(t.optString("album"));java.io.File art=new java.io.File(lib.artwork,t.optString("artwork"));if(art.isFile())metadata.setArtworkUri(android.net.Uri.fromFile(art));items.add(new MediaItem.Builder().setMediaId(t.optString("id")).setUri(t.optString("path")).setCustomCacheKey("resonance:"+t.optString("id")).setMediaMetadata(metadata.build()).build());}
        if(items.isEmpty())return;clearError();player.setMediaItems(items,Math.min(actual,items.size()-1),Math.max(0,position));if(player.getShuffleModeEnabled())PlaybackQueue.randomize(player,shuffleRandom);player.prepare();player.setPlayWhenReady(autoplay);save();
    }
    public void shuffle(boolean enabled){PlaybackQueue.setShuffle(player,enabled,shuffleRandom);save();}
    public void playQueued(String id,long position){
        for(int i=0;i<player.getMediaItemCount();i++)if(player.getMediaItemAt(i).mediaId.equals(id)){clearError();player.seekTo(i,Math.max(0,position));resume();save();return;}
        throw new IllegalArgumentException("This song is no longer in the queue. Choose it in Library.");
    }
    private void clearError(){error=errorCode=errorDetails="";}
    public void resume(){clearError();if(player.getPlaybackState()==Player.STATE_IDLE&&player.getMediaItemCount()>0)player.prepare();player.play();}
    public void prepareAfterNavigation(){if(player.getPlaybackState()==Player.STATE_IDLE&&player.getMediaItemCount()>0){clearError();player.prepare();}}
    public JSONObject state(){JSONArray queue=new JSONArray();for(int i=0;i<player.getMediaItemCount();i++)queue.put(player.getMediaItemAt(i).mediaId);MediaItem item=player.getCurrentMediaItem();return Json.object("id",item==null?"":item.mediaId,"queue",queue,"playbackOrder",PlaybackQueue.order(player),"index",Math.max(0,player.getCurrentMediaItemIndex()),"position",player.getCurrentPosition(),"duration",Math.max(0,player.getDuration()),"playing",player.isPlaying(),"buffering",player.getPlaybackState()==Player.STATE_BUFFERING,"volume",player.getVolume(),"shuffle",player.getShuffleModeEnabled(),"repeat",player.getRepeatMode(),"error",error,"errorCode",errorCode,"errorDetails",errorDetails);}
    public void equalize(JSONArray values){
        ResonanceApp.instance.library.updatePreferences(Json.object("eqLow",values.optDouble(0,0),"eqMid",values.optDouble(1,0),"eqHigh",values.optDouble(2,0)));
        if(player.getAudioSessionId()==C.AUDIO_SESSION_ID_UNSET)return;
        if(equalizer==null)equalizer=new android.media.audiofx.Equalizer(0,player.getAudioSessionId());short[] range=equalizer.getBandLevelRange();boolean enabled=false;
        for(short band=0;band<equalizer.getNumberOfBands();band++){double hz=equalizer.getCenterFreq(band)/1000d;int index=hz<400?0:hz<2500?1:2;int gain=(int)Math.round(Math.max(-12,Math.min(6,values.optDouble(index)))*100);equalizer.setBandLevel(band,(short)Math.max(range[0],Math.min(range[1],gain)));enabled|=gain!=0;}equalizer.setEnabled(enabled);
    }
    private void save(){if(player==null)return;JSONObject snapshot=state();long version=++saveVersion;ResonanceApp.instance.io.execute(()->{
        LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){if(version==saveVersion)lib.setting("player",snapshot);}
    });account();}
    private void account(){long now=SystemClock.elapsedRealtime();double increment=wasPlaying?Math.max(0,Math.min(20,(now-accountAt)/1000d)):0;accountAt=now;wasPlaying=player.isPlaying();String id=countedId;if(increment<=0||id.isEmpty())return;elapsed+=increment;JSONObject t=ResonanceApp.instance.library.track(id);boolean qualify=!counted&&elapsed>=Math.min(30,Math.max(1,t.optDouble("duration",60)/2));if(qualify)counted=true;double position=player.getCurrentPosition()/1000d;ResonanceApp.instance.io.execute(()->{LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){JSONObject latest=lib.track(id);Json.put(latest,"listenedSeconds",latest.optDouble("listenedSeconds")+increment);Json.put(latest,"lastPlayed",System.currentTimeMillis());Json.put(latest,"position",position);if(qualify)Json.put(latest,"plays",latest.optInt("plays")+1);lib.save(latest);}});}
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo){return controllerInfo.isTrusted()||controllerInfo.getUid()==android.os.Process.myUid()?session:null;}
    @Override public void onTaskRemoved(Intent rootIntent){if(!isPlaybackOngoing())pauseAllPlayersAndStopSelf();}
    @Override public void onDestroy(){save();handler.removeCallbacksAndMessages(null);spectrum.enabled=false;if(equalizer!=null)equalizer.release();session.release();player.release();instance=null;super.onDestroy();}
}
