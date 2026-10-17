package music.resonance.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
public class FileCopiesTest {
    @Test public void copyPreservesBytesAndChecksum() throws Exception {
        byte[] bytes=new byte[190003];new Random(7).nextBytes(bytes);ByteArrayOutputStream out=new ByteArrayOutputStream();
        String written=FileCopies.transfer(new ByteArrayInputStream(bytes),out,()->false);
        assertArrayEquals(bytes,out.toByteArray());assertEquals(written,FileCopies.digest(new ByteArrayInputStream(out.toByteArray()),()->false));
        byte[] corrupt=out.toByteArray();corrupt[65536]^=1;assertNotEquals(written,FileCopies.digest(new ByteArrayInputStream(corrupt),()->false));
    }
    @Test public void cancelStopsCopyBeforeMoreChunksAreWritten() throws Exception {
        AtomicInteger polls=new AtomicInteger();ByteArrayOutputStream out=new ByteArrayOutputStream();
        try{FileCopies.transfer(new ByteArrayInputStream(new byte[200000]),out,()->polls.incrementAndGet()>1);fail("Cancellation should interrupt the copy");}catch(InterruptedIOException expected){assertEquals(65536,out.size());}
    }
    @Test public void writeFailuresPropagateWithoutClaimingSuccess() throws Exception {
        try{FileCopies.transfer(new ByteArrayInputStream(new byte[20]),new OutputStream(){public void write(int b) throws IOException{throw new IOException("full");}},()->false);fail("A full destination must fail");}catch(IOException expected){assertEquals("full",expected.getMessage());}
    }
    @Test public void safeFilenameKeepsYoutubeIdentityAndUnicode(){
        String name=FileCopies.name("../Björk / live: café?", "AbCdEf123_-", "OPUS");
        assertFalse(name.contains("/"));assertFalse(name.contains(":"));assertFalse(name.contains("?"));assertTrue(name.contains("Björk"));assertTrue(name.endsWith("[AbCdEf123_-].opus"));
        assertTrue(FileCopies.name("x".repeat(500),"AbCdEf123_-","m4a").length()<125);
        assertThrows(IllegalArgumentException.class,()->FileCopies.name("Song","../../bad","m4a"));
    }
}
