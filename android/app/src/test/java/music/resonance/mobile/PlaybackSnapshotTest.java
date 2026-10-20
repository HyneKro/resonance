package music.resonance.mobile;

import org.junit.Test;
import static org.junit.Assert.*;
import java.util.*;
import java.util.concurrent.*;

public class PlaybackSnapshotTest {
    @Test public void blockedAnalysisCannotBlockControlsOrFloodTheWorker() throws Exception {
        ExecutorService worker=Executors.newSingleThreadExecutor();CountDownLatch reading=new CountDownLatch(1),release=new CountDownLatch(1),done=new CountDownLatch(1);
        try{
            PlaybackSnapshot<String> cache=new PlaybackSnapshot<>(worker);
            cache.refresh("one",()->{reading.countDown();try{release.await();}catch(InterruptedException e){Thread.currentThread().interrupt();}return "profile";});
            assertTrue(reading.await(1,TimeUnit.SECONDS));
            for(int i=0;i<10000;i++){assertNull(cache.get("one"));cache.refresh("two",()->{fail("Must coalesce while the reader is blocked");return "";});}
            release.countDown();worker.execute(done::countDown);assertTrue(done.await(1,TimeUnit.SECONDS));
            assertEquals("profile",cache.get("one"));assertNull(cache.get("two"));
        }finally{release.countDown();worker.shutdownNow();}
    }
    @Test public void valuesAreReplacedAtomicallyAndFailuresCanRetry(){
        List<Runnable> tasks=new ArrayList<>();PlaybackSnapshot<String> cache=new PlaybackSnapshot<>(tasks::add);
        cache.refresh("one",()->"first");tasks.remove(0).run();cache.refresh("one",()->"second");assertEquals("first",cache.get("one"));tasks.remove(0).run();assertEquals("second",cache.get("one"));
        cache.refresh("two",()->{throw new IllegalStateException();});tasks.remove(0).run();
        cache.refresh("two",()->"recovered");tasks.remove(0).run();assertEquals("recovered",cache.get("two"));assertNull(cache.get("one"));
    }
}
