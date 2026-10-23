package music.resonance.mobile;

import org.json.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Only recording failures are recoverable; storage, cancellation and connection failures stop the job. */
final class DownloadBatch {
    static final class RecordingUnavailable extends Exception {
        RecordingUnavailable(String reason){super(reason);}
    }
    static final class SourceRemoved extends Exception {SourceRemoved(){super("Playlist removed. Its pending songs were cleared.");}}
    interface Work {
        default boolean include(JSONObject item){return true;}
        void before() throws Exception;
        void download(JSONObject item) throws Exception;
        void saved(JSONObject item) throws Exception;
        void skipped(JSONObject item,String reason) throws Exception;
    }
    volatile int saved,skipped,processed,removed;
    void run(JSONArray selected,BooleanSupplier cancelled,Work work) throws Exception {
        Map<String,String> failed=new HashMap<>();
        for(int i=0;i<selected.length()&&!cancelled.getAsBoolean();i++){
            JSONObject item=selected.getJSONObject(i);String video=item.optString("youtubeId");
            if(!work.include(item)){removed++;processed++;continue;}
            work.before();if(cancelled.getAsBoolean())break;
            if(!work.include(item)){removed++;processed++;continue;}
            try{
                if(failed.containsKey(video))throw new RecordingUnavailable(failed.get(video));
                work.download(item);
            }catch(SourceRemoved e){removed++;processed++;continue;
            }catch(RecordingUnavailable e){
                if(cancelled.getAsBoolean())break;
                failed.put(video,e.getMessage());skipped++;processed++;work.skipped(item,e.getMessage());continue;
            }
            saved++;processed++;work.saved(item);
        }
    }
    String summary(){return saved+" saved · "+skipped+" skipped"+(removed>0?" · "+removed+" removed":"")+". "+(skipped>0?"Unavailable songs were skipped automatically. You can retry them below.":saved>0?"Your songs are ready in Library.":"No songs were saved.");}
}
