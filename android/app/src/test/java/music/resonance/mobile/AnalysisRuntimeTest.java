package music.resonance.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
import java.io.*;
import java.nio.file.Files;
import org.json.JSONObject;

public class AnalysisRuntimeTest {
    @Test public void analyzerIncludesSharedDependenciesOutsideFfmpeg(){
        String path=AnalysisRuntime.libraryPath(new File("private"),new File("native"));
        assertTrue(path.contains(new File("private/youtubedl-android/packages/python/usr/lib").getAbsolutePath()));
        assertTrue(path.contains(new File("private/youtubedl-android/packages/ffmpeg/usr/lib").getAbsolutePath()));
        assertTrue(path.endsWith(new File("native").getAbsolutePath()));
    }
    @Test public void oldFailuresRetryButCurrentFailuresDoNotLoop(){
        JSONObject error=Json.object("stamp","same file","message","unavailable");
        assertEquals("",AnalysisRuntime.savedError(error,"same file"));
        Json.put(error,"engineRevision",AnalysisRuntime.REVISION);
        assertEquals("unavailable",AnalysisRuntime.savedError(error,"same file"));
        assertEquals("",AnalysisRuntime.savedError(error,"replaced file"));
    }
    @Test public void engineDiagnosticsAreBoundedAndKept() throws Exception {
        File log=File.createTempFile("analysis-engine-",".log");
        try{Files.write(log.toPath(),("x".repeat(10000)+"\nCANNOT LINK EXECUTABLE: libandroid-support.so missing\n").getBytes(java.nio.charset.StandardCharsets.UTF_8));
            String error=AnalysisRuntime.failure(log,1);assertTrue(error.contains("libandroid-support.so"));assertTrue(error.length()<2600);
        }finally{log.delete();}
    }
}
