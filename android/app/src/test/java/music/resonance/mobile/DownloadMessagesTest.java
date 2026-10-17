package music.resonance.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class DownloadMessagesTest {
    @Test public void long403LogBecomesActionable(){String message=DownloadMessages.explain("WARNING: Your yt-dlp version (2025.11.12) is older than 90 days! WARNING: YouTube is forcing SABR streaming ERROR: unable to download video data: HTTP Error 403: Forbidden");assertTrue(message.contains("Update the downloader"));assertFalse(message.contains("SABR"));assertTrue(message.length()<220);}
    @Test public void incompleteScanKeepsItsUsefulCounts(){String message="Playlist scan incomplete: read 101 of 2532 entries. Your previous list was kept.";assertEquals(message,DownloadMessages.explain(message));}
    @Test public void accessRestrictionsAreNotPresentedAsTransient403(){assertTrue(DownloadMessages.explain("ERROR: Sign in to confirm your age").contains("sign-in or verification"));}
}
