package music.resonance.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class ArtworkRecoveryTest {
    private static final String ID="0123456789abcdef01234567";
    @Test public void missingCoverLoadsOnceAndBecomesReadableWithoutRestart() throws Exception {
        Path dir=Files.createTempDirectory("cover-recovery-");CountDownLatch started=new CountDownLatch(1),finish=new CountDownLatch(1);AtomicInteger calls=new AtomicInteger();
        try(ArtworkRecovery recovery=new ArtworkRecovery(dir.toFile(),id->{calls.incrementAndGet();started.countDown();finish.await();Files.write(dir.resolve(id+".jpg"),new byte[]{1,2,3});})){
            assertNull(recovery.open(ID+".jpg"));assertTrue(started.await(2,TimeUnit.SECONDS));
            assertNull(recovery.open(ID+".jpg"));assertNull(recovery.open("../../private.jpg"));assertNull(recovery.open(ID+".jpg?bad"));
            finish.countDown();long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(2);while(recovery.revision.get()==0&&System.nanoTime()<deadline)Thread.sleep(5);
            assertEquals(1,calls.get());assertEquals(1,recovery.revision.get());try(InputStream input=recovery.open(ID+".jpg")){assertNotNull(input);assertEquals(1,input.read());}
        }finally{finish.countDown();Files.deleteIfExists(dir.resolve(ID+".jpg"));Files.delete(dir);}
    }
    @Test public void unavailableSourcesAreThrottledAndCanBeRetried() throws Exception {
        Path dir=Files.createTempDirectory("cover-recovery-");AtomicInteger calls=new AtomicInteger();
        try(ArtworkRecovery recovery=new ArtworkRecovery(dir.toFile(),id->{calls.incrementAndGet();throw new IOException("offline");})){
            recovery.open(ID+".jpg");long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(2);while(calls.get()==0&&System.nanoTime()<deadline)Thread.sleep(5);
            Thread.sleep(40);for(int i=0;i<20;i++)recovery.open(ID+".jpg");assertEquals(1,calls.get());
            recovery.retry();recovery.open(ID+".jpg");deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(2);while(calls.get()<2&&System.nanoTime()<deadline)Thread.sleep(5);assertEquals(2,calls.get());
        }finally{Files.delete(dir);}
    }
    @Test public void olderYoutubeTracksRecoverWithoutSavedThumbnailAndUnsafeSourcesAreIgnored(){
        assertEquals("https://i.ytimg.com/vi/4FxOuRsfoqc/hqdefault.jpg",LibraryStore.coverSource(Json.object("youtubeId","4FxOuRsfoqc")));
        assertEquals("",LibraryStore.coverSource(Json.object("artworkSource","https://evil-ytimg.com/a")));
        assertEquals("",LibraryStore.coverSource(Json.object("artworkSource","file:///private/secret")));
        assertEquals("https://i.ytimg.com/vi/video/mqdefault.jpg",LibraryStore.coverSource(Json.object("artworkSource","https://i.ytimg.com/vi/video/mqdefault.jpg")));
    }
}
