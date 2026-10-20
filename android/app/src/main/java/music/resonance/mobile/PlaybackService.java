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
    private final LoudnessGate levelGate=new LoudnessGate();private boolean internalLevelPause,hasStartedTrack;private String levelError="",prefetchedId="";
    private String analysisId="";private JSONObject songProfile=new JSONObject(),listeningEdit=new JSONObject(),listeningPrefs=new JSONObject();private long profileCheck;
    private final Runnable listening=new Runnable(){public void run(){updateListening();handler.postDelayed(this,150);}};
    private MediaSession session;
    private final java.util.concurrent.ExecutorService profileWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
    private final PlaybackSnapshot<JSONObject> profileSnapshot=new PlaybackSnapshot<>(profileWorker);
    private final Set<String> requestedAnalysis=new HashSet<>();
    private long queueRevision=System.currentTimeMillis();private Timeline queueTimeline;private boolean queueShuffle;private JSONArray queueIds=new JSONArray(),queueOrder=new JSONArray();
    private volatile boolean destroyed;private long queueEpoch;
    private void requestAnalysis(String id,boolean priority){
        String key=id+":"+priority;if(!requestedAnalysis.add(key))return;
        profileWorker.execute(()->{try{ResonanceApp.instance.songAnalysis.request(id,false,priority);}catch(RuntimeException ignored){}finally{if(!destroyed)handler.post(()->requestedAnalysis.remove(key));}});
    }
    private void refreshProfile(String id){
        profileSnapshot.refresh(id,()->{ResonanceApp app=ResonanceApp.instance;JSONObject status=app.songAnalysis.status(id);return Json.object("profile",status.optJSONObject("profile"),"edit",status.optJSONObject("edit"),"preferences",app.library.setting("preferences"),"error",status.optString("error"));});
    }
    private android.media.audiofx.Equalizer equalizer;
    private final Random shuffleRandom=new Random();
    private volatile long saveVersion,eqSaveVersion;private boolean restoringQueue;
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
            @Override public int onPlayerCommandRequest(MediaSession session,MediaSession.ControllerInfo controller,int command){if(command==Player.COMMAND_PLAY_PAUSE&&levelGate.waiting)pause();return SessionResult.RESULT_SUCCESS;}
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
            @Override public void onAudioSessionIdChanged(int audioSessionId){if(equalizer!=null){equalizer.release();equalizer=null;}if(audioSessionId!=C.AUDIO_SESSION_ID_UNSET)try{JSONObject p=listeningPrefs;equalize(new JSONArray().put(p.optDouble("eqLow",0)).put(p.optDouble("eqMid",0)).put(p.optDouble("eqHigh",0)));}catch(Exception ignored){}}
            @Override public void onMediaItemTransition(MediaItem item,int reason){if(item==null)return;updateListening(true);account();clearError();elapsed=0;counted=false;countedId=item.mediaId;ResonanceApp.instance.io.execute(()->{LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){JSONObject history=lib.setting("history");JSONArray old=history.optJSONArray("items"),next=new JSONArray();if(old!=null)for(int i=Math.max(0,old.length()-199);i<old.length();i++)next.put(old.opt(i));next.put(Json.object("id",item.mediaId,"at",System.currentTimeMillis()));lib.setting("history",Json.object("items",next));}});}
            @Override public void onIsPlayingChanged(boolean playing){if(playing)hasStartedTrack=true;account();}
            @Override public void onPlayWhenReadyChanged(boolean ready,int reason){if(ready)updateListening();else if(internalLevelPause)internalLevelPause=false;else levelGate.cancel();}
            @Override public void onPlaybackStateChanged(int state){if(state==Player.STATE_READY)clearError();}
            @Override public void onPlayerError(PlaybackException e){
                MediaItem item=player.getCurrentMediaItem();boolean linked=item!=null&&item.localConfiguration!=null&&"content".equals(item.localConfiguration.uri.getScheme());
                errorCode=e.getErrorCodeName();error=PlaybackProblem.message(e.errorCode,linked);errorDetails=PlaybackProblem.detail(errorCode,e);
                JSONObject report=Json.object("id",item==null?"":item.mediaId,"error",error,"errorCode",errorCode,"errorDetails",errorDetails,"at",System.currentTimeMillis());
                ResonanceApp.instance.io.execute(()->ResonanceApp.instance.library.setting("lastPlaybackError",report));
            }
        });
        listeningPrefs=ResonanceApp.instance.library.setting("preferences");JSONObject saved=ResonanceApp.instance.library.setting("player");player.setVolume((float)Math.max(0,Math.min(1,saved.optDouble("volume",1))));player.setShuffleModeEnabled(saved.optBoolean("shuffle"));player.setRepeatMode(saved.optInt("repeat")==Player.REPEAT_MODE_ONE?Player.REPEAT_MODE_ONE:Player.REPEAT_MODE_ALL);JSONArray queue=saved.optJSONArray("queue");if(queue!=null){restoringQueue=true;long epoch=queueEpoch;ResonanceApp.instance.io.execute(()->{try{List<MediaItem> items=prepareQueue(queue);handler.post(()->{if(destroyed||queueEpoch!=epoch)return;loadPrepared(items,queue.optString(saved.optInt("index")),saved.optLong("position"),false);if(player.getShuffleModeEnabled()){int[] order=PlaybackQueue.restore(saved.optJSONArray("playbackOrder"),state().optJSONArray("queue"));if(order!=null)player.setShuffleOrder(new androidx.media3.exoplayer.source.ShuffleOrder.DefaultShuffleOrder(order,shuffleRandom.nextLong()));save();}});}catch(RuntimeException failure){handler.post(()->{if(!destroyed&&queueEpoch==epoch){error="The saved queue could not be restored. Choose music in Library.";errorDetails=failure.toString();}});}});}handler.postDelayed(checkpoint,5000);handler.post(listening);
    }
    private void updateListening(){updateListening(false);}
    private void updateListening(boolean boundary){
        if(player==null||player.getCurrentMediaItem()==null)return;String id=player.getCurrentMediaItem().mediaId;long now=SystemClock.elapsedRealtime();
        boundary|=!id.equals(analysisId);analysisId=id;boolean resume=boundary&&levelGate.wantsPlayback();if(boundary){levelGate.select();hasStartedTrack=false;}
        if(boundary){songProfile=new JSONObject();listeningEdit=new JSONObject();levelError="";}
        boolean refreshDue=boundary||now-profileCheck>1500;if(refreshDue){profileCheck=now;refreshProfile(id);}
        JSONObject snapshot=profileSnapshot.get(id);
        if(snapshot!=null){songProfile=snapshot.optJSONObject("profile");if(songProfile==null)songProfile=new JSONObject();listeningEdit=snapshot.optJSONObject("edit");if(listeningEdit==null)listeningEdit=new JSONObject();JSONObject prefs=snapshot.optJSONObject("preferences");if(prefs!=null)listeningPrefs=prefs;levelError=snapshot.optString("error");}
        boolean enabled=listeningPrefs.optBoolean("leveling");
        if(boundary||!hasStartedTrack)leveling.selectTrack(trackLevel.select(levelGate.bypassed()?new JSONObject():songProfile,enabled));else leveling.setGain(trackLevel.update(songProfile,enabled));
        if(refreshDue&&player.isPlaying()&&songProfile.length()==0&&(enabled||listeningPrefs.optBoolean("skipSilence")||listeningPrefs.optBoolean("autoDirection",true)&&!listeningPrefs.optBoolean("musicOnly")))requestAnalysis(id,false);
        boolean missing=listeningPrefs.optBoolean("leveling")&&songProfile.length()==0&&!hasStartedTrack;
        if(levelGate.waiting&&!missing){leveling.selectTrack(trackLevel.select(songProfile,listeningPrefs.optBoolean("leveling")));if(levelGate.ready())player.play();}
        if((player.getPlayWhenReady()||resume)&&levelGate.request(missing)){leveling.selectTrack(0);if(player.getPlayWhenReady()){internalLevelPause=true;player.pause();}requestAnalysis(id,true);}
        else if(resume&&!missing)player.play();
        if(player.getNextMediaItemIndex()!=C.INDEX_UNSET&&listeningPrefs.optBoolean("leveling")){String upcoming=player.getMediaItemAt(player.getNextMediaItemIndex()).mediaId;if(!upcoming.equals(id)&&!upcoming.equals(prefetchedId)){requestAnalysis(upcoming,false);prefetchedId=upcoming;}}
        if(!player.isPlaying()||player.getDuration()<=0)return;JSONObject range=listeningEdit.optBoolean("enabled")?listeningEdit:listeningPrefs.optBoolean("skipSilence")?songProfile.optJSONObject("trim"):null;if(range==null)return;
        long duration=player.getDuration(),start=Math.max(0,Math.min(duration-1000,(long)(range.optDouble("start")*1000))),end=Math.max(start+1000,Math.min(duration,(long)(range.optDouble("end",duration/1000d)*1000)));
        if(player.getCurrentPosition()<start-150)player.seekTo(start);else if(end<duration-100&&player.getCurrentPosition()>=end-50){if(player.getRepeatMode()==Player.REPEAT_MODE_ONE)player.seekTo(start);else if(player.hasNextMediaItem())player.seekToNextMediaItem();else player.seekTo(0,0);}
    }
    public static List<MediaItem> prepareQueue(JSONArray ids){
        List<MediaItem> items=new ArrayList<>();LibraryStore lib=ResonanceApp.instance.library;
        for(int i=0;i<ids.length();i++){String id=ids.optString(i);JSONObject t=lib.track(id);if(t.length()==0)continue;
            MediaMetadata.Builder metadata=new MediaMetadata.Builder().setTitle(t.optString("title")).setArtist(t.optString("artist")).setAlbumTitle(t.optString("album"));
            java.io.File art=new java.io.File(lib.artwork,t.optString("artwork"));if(art.isFile())metadata.setArtworkUri(android.net.Uri.fromFile(art));
            items.add(new MediaItem.Builder().setMediaId(id).setUri(t.optString("path")).setCustomCacheKey("resonance:"+id).setMediaMetadata(metadata.build()).build());
        }return items;
    }
    public void loadPrepared(List<MediaItem> items,String selected,long position,boolean autoplay){
        ++queueEpoch;restoringQueue=false;if(items.isEmpty())return;int actual=0;for(int i=0;i<items.size();i++)if(items.get(i).mediaId.equals(selected)){actual=i;break;}
        clearError();player.setMediaItems(items,actual,Math.max(0,position));if(player.getShuffleModeEnabled())PlaybackQueue.randomize(player,shuffleRandom);player.prepare();if(autoplay)resume();else player.pause();save();
    }
    public void constellationQueue(List<MediaItem> prepared,String mode){
        ++queueEpoch;player.setShuffleModeEnabled(false);player.setRepeatMode(Player.REPEAT_MODE_ALL);
        if(mode.equals("now")||player.getMediaItemCount()==0){loadPrepared(prepared,"",0,mode.equals("now")||mode.equals("after"));return;}
        int next=player.getCurrentMediaItemIndex()+1;String current=player.getCurrentMediaItem().mediaId;
        if(mode.equals("next")||mode.equals("add")){Set<String> requested=new HashSet<>();for(MediaItem item:prepared)requested.add(item.mediaId);for(int i=player.getMediaItemCount()-1;i>=next;i--)if(requested.contains(player.getMediaItemAt(i).mediaId))player.removeMediaItem(i);}
        List<MediaItem> items=new ArrayList<>(prepared);if(mode.equals("after")&&!items.isEmpty()&&items.get(0).mediaId.equals(current))items.remove(0);
        // Mutate only upcoming items: keep the decoder, current position and play/pause state.
        if(mode.equals("after")&&next<player.getMediaItemCount())player.removeMediaItems(next,player.getMediaItemCount());
        player.addMediaItems(mode.equals("add")?player.getMediaItemCount():next,items);save();
    }
    public void shuffle(boolean enabled){PlaybackQueue.setShuffle(player,enabled,shuffleRandom);save();}
    public void playQueued(String id,long position){
        for(int i=0;i<player.getMediaItemCount();i++)if(player.getMediaItemAt(i).mediaId.equals(id)){clearError();player.seekTo(i,Math.max(0,position));resume();save();return;}
        throw new IllegalArgumentException("This song is no longer in the queue. Choose it in Library.");
    }
    private void clearError(){error=errorCode=errorDetails="";}
    public void resume(){clearError();if(player.getPlaybackState()==Player.STATE_IDLE&&player.getMediaItemCount()>0)player.prepare();updateListening();boolean missing=listeningPrefs.optBoolean("leveling")&&songProfile.length()==0&&!hasStartedTrack;if(levelGate.request(missing)){leveling.selectTrack(0);requestAnalysis(analysisId,true);}else player.play();}
    public void pause(){levelGate.cancel();player.pause();}
    public void playOriginal(){if(levelGate.original()){leveling.selectTrack(trackLevel.select(new JSONObject(),listeningPrefs.optBoolean("leveling")));player.play();}}
    public void prepareAfterNavigation(){if(player.getPlaybackState()==Player.STATE_IDLE&&player.getMediaItemCount()>0){clearError();player.prepare();}}
    public JSONObject state(){return state(-1);}
    public JSONObject state(long knownQueue){Timeline timeline=player.getCurrentTimeline();boolean shuffle=player.getShuffleModeEnabled();if(timeline!=queueTimeline||shuffle!=queueShuffle){queueTimeline=timeline;queueShuffle=shuffle;queueRevision++;queueIds=new JSONArray();for(int i=0;i<player.getMediaItemCount();i++)queueIds.put(player.getMediaItemAt(i).mediaId);queueOrder=PlaybackQueue.order(player);}JSONArray queue=queueIds;MediaItem item=player.getCurrentMediaItem();JSONObject result=Json.object("id",item==null?"":item.mediaId,"queueRevision",queueRevision,"index",Math.max(0,player.getCurrentMediaItemIndex()),"position",player.getCurrentPosition(),"duration",Math.max(0,player.getDuration()),"playing",player.isPlaying(),"buffering",player.getPlaybackState()==Player.STATE_BUFFERING,"levelPreparing",levelGate.waiting,"levelProgress",ResonanceApp.instance.songAnalysis.progress(),"levelError",levelError,"volume",player.getVolume(),"shuffle",player.getShuffleModeEnabled(),"repeat",player.getRepeatMode(),"error",error,"errorCode",errorCode,"errorDetails",errorDetails);if(knownQueue!=queueRevision){Json.put(result,"queue",queue);Json.put(result,"playbackOrder",queueOrder);}return result;}
    public void equalize(JSONArray values){
        long version=++eqSaveVersion;ResonanceApp.instance.io.execute(()->{LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){if(version==eqSaveVersion)lib.updatePreferences(Json.object("eqLow",values.optDouble(0,0),"eqMid",values.optDouble(1,0),"eqHigh",values.optDouble(2,0)));}});
        if(player.getAudioSessionId()==C.AUDIO_SESSION_ID_UNSET)return;
        if(equalizer==null)equalizer=new android.media.audiofx.Equalizer(0,player.getAudioSessionId());short[] range=equalizer.getBandLevelRange();boolean enabled=false;
        for(short band=0;band<equalizer.getNumberOfBands();band++){double hz=equalizer.getCenterFreq(band)/1000d;int index=hz<400?0:hz<2500?1:2;int gain=(int)Math.round(Math.max(-12,Math.min(6,values.optDouble(index)))*100);equalizer.setBandLevel(band,(short)Math.max(range[0],Math.min(range[1],gain)));enabled|=gain!=0;}equalizer.setEnabled(enabled);
    }
    private void save(){if(player==null||restoringQueue)return;JSONObject snapshot=state();long version=++saveVersion;ResonanceApp.instance.io.execute(()->{
        LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){if(version==saveVersion)lib.setting("player",snapshot);}
    });account();}
    private void account(){long now=SystemClock.elapsedRealtime();double increment=wasPlaying?Math.max(0,Math.min(20,(now-accountAt)/1000d)):0;accountAt=now;wasPlaying=player.isPlaying();String id=countedId;if(increment<=0||id.isEmpty())return;elapsed+=increment;boolean qualify=!counted&&elapsed>=Math.min(30,Math.max(1,(player.getDuration()>0?player.getDuration()/1000d:60)/2));if(qualify)counted=true;double position=player.getCurrentPosition()/1000d;ResonanceApp.instance.io.execute(()->{LibraryStore lib=ResonanceApp.instance.library;synchronized(lib){JSONObject latest=lib.track(id);Json.put(latest,"listenedSeconds",latest.optDouble("listenedSeconds",0)+increment);Json.put(latest,"lastPlayed",System.currentTimeMillis());Json.put(latest,"position",position);if(qualify)Json.put(latest,"plays",latest.optInt("plays")+1);lib.save(latest);}});}
    @Override public MediaSession onGetSession(MediaSession.ControllerInfo controllerInfo){return controllerInfo.isTrusted()||controllerInfo.getUid()==android.os.Process.myUid()?session:null;}
    @Override public void onTaskRemoved(Intent rootIntent){if(!isPlaybackOngoing())pauseAllPlayersAndStopSelf();}
    @Override public void onDestroy(){destroyed=true;save();profileWorker.shutdownNow();handler.removeCallbacksAndMessages(null);spectrum.enabled=false;if(equalizer!=null)equalizer.release();session.release();player.release();instance=null;super.onDestroy();}
}
