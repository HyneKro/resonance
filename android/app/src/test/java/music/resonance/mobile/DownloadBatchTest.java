package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import static org.junit.Assert.*;

public class DownloadBatchTest {
    @Test public void eachSavedSongIsPublishedBeforeTheNextTransferStarts() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work(){
            public void download(JSONObject item) throws Exception {
                if(item.optString("title").equals("second")){assertEquals(List.of("first"),saved);assertEquals(1,batch.saved);assertEquals(1,batch.processed);}
                super.download(item);
            }
        };
        batch.run(songs("first","second"),()->false,work);assertEquals(List.of("first","second"),work.saved);
    }
    private JSONArray songs(String... names){JSONArray a=new JSONArray();for(String name:names)a.put(Json.object("youtubeId",name,"title",name));return a;}
    private static class Work implements DownloadBatch.Work {
        final List<String> attempted=new ArrayList<>(),saved=new ArrayList<>(),skipped=new ArrayList<>();
        public void before() throws Exception {}
        public void download(JSONObject item) throws Exception {attempted.add(item.getString("title"));if(item.getString("title").startsWith("bad"))throw new DownloadBatch.RecordingUnavailable("Private video");}
        public void saved(JSONObject item){saved.add(item.optString("title"));}
        public void skipped(JSONObject item,String reason) throws Exception {skipped.add(item.optString("title"));}
    }
    @Test public void failedMiddleSongDoesNotBlockLaterSongs() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work();batch.run(songs("first","bad","last"),()->false,work);
        assertEquals(List.of("first","last"),work.saved);assertEquals(List.of("bad"),work.skipped);assertEquals(2,batch.saved);assertEquals(1,batch.skipped);assertEquals(3,batch.processed);
    }
    @Test public void multipleFailuresStillReachLastSong() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work();batch.run(songs("bad1","bad2","last"),()->false,work);assertEquals(List.of("last"),work.saved);assertEquals(2,batch.skipped);
    }
    @Test public void duplicateUnavailableRecordingIsNotRequestedAgain() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work();batch.run(songs("bad","bad","last"),()->false,work);assertEquals(List.of("bad","last"),work.attempted);assertEquals(2,batch.skipped);
    }
    @Test public void storageFailurePausesAndDoesNotMarkSongUnavailable() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work(){public void download(JSONObject item) throws Exception {if(item.optString("title").equals("disk"))throw new IOException("No space left");super.download(item);}};
        assertThrows(IOException.class,()->batch.run(songs("first","disk","last"),()->false,work));assertEquals(List.of("first"),work.saved);assertEquals(0,batch.skipped);assertEquals(1,batch.processed);
    }
    @Test public void OfflinePreflightDoesNotAttemptOrSkipTheRest() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work(){int checks;public void before() throws Exception {if(++checks==2)throw new IOException("Offline");}};
        assertThrows(IOException.class,()->batch.run(songs("first","next","last"),()->false,work));assertEquals(List.of("first"),work.attempted);assertEquals(0,batch.skipped);
    }
    @Test public void cancellationDuringFailedAttemptDoesNotRecordFailure() throws Exception {
        AtomicBoolean cancel=new AtomicBoolean();DownloadBatch batch=new DownloadBatch();Work work=new Work(){public void download(JSONObject item) throws Exception {cancel.set(true);throw new DownloadBatch.RecordingUnavailable("interrupted");}};
        batch.run(songs("first","last"),cancel::get,work);assertEquals(0,batch.skipped);assertEquals(0,batch.processed);
    }
    @Test public void allUnavailableDoesNotClaimSongsAreReady() throws Exception {
        DownloadBatch batch=new DownloadBatch();batch.run(songs("bad1","bad2"),()->false,new Work());assertTrue(batch.summary().startsWith("0 saved · 2 skipped"));assertFalse(batch.summary().contains("ready in Library"));
    }
    @Test public void failureToPersistSkippedEntryStopsSafely() throws Exception {
        Work work=new Work(){public void skipped(JSONObject item,String reason) throws Exception {throw new IOException("Database full");}};
        assertThrows(IOException.class,()->new DownloadBatch().run(songs("bad","last"),()->false,work));assertEquals(List.of("bad"),work.attempted);
    }
    @Test public void removedSourceDoesNotRunPreflightOrBlockOtherDownloads() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work(){public boolean include(JSONObject item){return !item.optString("title").equals("gone");}public void before(){}};
        batch.run(songs("gone","kept","gone"),()->false,work);assertEquals(List.of("kept"),work.attempted);assertEquals(1,batch.saved);assertEquals(2,batch.removed);assertEquals(3,batch.processed);assertEquals(0,batch.skipped);
    }
    @Test public void sourceRemovedDuringTransferContinuesOtherPlaylist() throws Exception {
        DownloadBatch batch=new DownloadBatch();Work work=new Work(){public void download(JSONObject item) throws Exception {if(item.optString("title").equals("gone"))throw new DownloadBatch.SourceRemoved();super.download(item);}};
        batch.run(songs("gone","kept"),()->false,work);assertEquals(List.of("kept"),work.saved);assertEquals(1,batch.removed);assertEquals(1,batch.saved);assertEquals(0,batch.skipped);
    }
    @Test public void removalDuringPreflightPreventsTransfer() throws Exception {
        AtomicBoolean removed=new AtomicBoolean();DownloadBatch batch=new DownloadBatch();Work work=new Work(){public boolean include(JSONObject item){return !removed.get();}public void before(){removed.set(true);}};
        batch.run(songs("gone"),()->false,work);assertTrue(work.attempted.isEmpty());assertEquals(1,batch.removed);assertFalse(batch.summary().contains("ready in Library"));
    }
}
