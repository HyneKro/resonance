package music.resonance.mobile;

import org.junit.*;
import org.junit.rules.TemporaryFolder;
import java.io.*;
import java.nio.file.Files;
import static org.junit.Assert.*;

public class LocalMusicFilesTest {
    @Rule public TemporaryFolder temporary=new TemporaryFolder();
    private File audio(File dir,String name) throws Exception {File f=new File(dir,name);Files.write(f.toPath(),new byte[]{1,2,3,4});return f;}
    @Test public void validFileSurvivesAnAppUpdateWithoutBeingMoved() throws Exception {
        File music=temporary.newFolder(),original=audio(music,"AbCdEf123_-.opus");
        assertEquals(original,LocalMusicFiles.resolve(music,original.toURI().toString(),original.getName(),"AbCdEf123_-",true));
        assertArrayEquals(new byte[]{1,2,3,4},Files.readAllBytes(original.toPath()));
    }
    @Test public void staleAppPathReusesTheSameSavedFile() throws Exception {
        File music=temporary.newFolder(),actual=audio(music,"AbCdEf123_-.opus"),old=new File(temporary.getRoot(),"old/files/Music/"+actual.getName());
        assertEquals(actual,LocalMusicFiles.resolve(music,old.toURI().toString(),actual.getName(),"AbCdEf123_-",true));
        assertFalse(old.exists());
    }
    @Test public void uniqueYoutubeIdentityRecoversRenamedContainer() throws Exception {
        File music=temporary.newFolder(),actual=audio(music,"AbCdEf123_-.opus");
        assertEquals(actual,LocalMusicFiles.resolve(music,"file:///missing/AbCdEf123_-.webm","AbCdEf123_-.webm","AbCdEf123_-",true));
    }
    @Test public void documentPermissionsAreNeverReplacedWithAnUnrelatedCopy() throws Exception {
        File music=temporary.newFolder();audio(music,"song.opus");
        assertNull(LocalMusicFiles.resolve(music,"content://provider/tree/music/song","song.opus","",true));
    }
    @Test public void importedFilesDoNotGetReboundByFilename() throws Exception {
        File music=temporary.newFolder();audio(music,"song.opus");
        File old=new File(temporary.getRoot(),"old/song.opus");
        assertEquals(old,LocalMusicFiles.resolve(music,old.toURI().toString(),"song.opus","",false));
    }
    @Test public void ambiguousIdentityAndEmptyDownloadsAreNotGuessed() throws Exception {
        File music=temporary.newFolder();audio(music,"AbCdEf123_-.opus");audio(music,"AbCdEf123_-.m4a");
        File old=new File(temporary.getRoot(),"missing.webm");
        assertEquals(old,LocalMusicFiles.resolve(music,old.toURI().toString(),"missing.webm","AbCdEf123_-",true));
        File empty=new File(music,"empty.opus");assertTrue(empty.createNewFile());assertFalse(LocalMusicFiles.readable(empty));
    }
    @Test public void recoveryCannotTraverseOutsideAppMusic() throws Exception {
        File music=temporary.newFolder("Music"),outside=audio(temporary.getRoot(),"outside.opus"),old=new File(music,"missing.opus");
        assertEquals(old,LocalMusicFiles.resolve(music,old.toURI().toString(),"../outside.opus","../outside",true));
        assertTrue(outside.isFile());
    }
}
