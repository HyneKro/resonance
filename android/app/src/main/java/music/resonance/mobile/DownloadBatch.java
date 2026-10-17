package music.resonance.mobile;

import org.json.*;
import java.util.*;
import java.util.function.BooleanSupplier;

/** Only recording failures are recoverable; storage, cancellation and connection failures stop the job. */
final class DownloadBatch {
    static final class RecordingUnavailable extends Exception {
        RecordingUnavailable(String reason){super(reason);}
    }
    interface Work {
        void before() throws Exception;
        void download(JSONObject item) throws Exception;
        void saved(JSONObject item) throws Exception;
        void skipped(JSONObject item,String reason) throws Exception;
    }
    volatile int saved,skipped,processed;
    void run(JSONArray selected,BooleanSupplier cancelled,Work work) throws Exception {
        Map<String,String> failed=new HashMap<>();
        for(int i=0;i<selected.length()&&!cancelled.getAsBoolean();i++){
            work.before();if(cancelled.getAsBoolean())break;
            JSONObject item=selected.getJSONObject(i);String video=item.optString("youtubeId");
            try{
                if(failed.containsKey(video))throw new RecordingUnavailable(failed.get(video));
                work.download(item);
            }catch(RecordingUnavailable e){
                if(cancelled.getAsBoolean())break;
                failed.put(video,e.getMessage());skipped++;processed++;work.skipped(item,e.getMessage());continue;
            }
            saved++;processed++;work.saved(item);
        }
    }
    String summary(){return saved+" saved · "+skipped+" skipped. "+(skipped>0?"Unavailable songs were skipped automatically. You can retry them below.":"Your songs are ready in Library.");}
}
