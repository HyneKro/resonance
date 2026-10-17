package music.resonance.mobile;

import androidx.media3.common.PlaybackException;
import org.junit.Test;
import static org.junit.Assert.*;

public class PlaybackProblemTest {
    @Test public void appStorageErrorsNeverAskForFolderPermission(){
        for(int code:new int[]{PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND,PlaybackException.ERROR_CODE_IO_NO_PERMISSION,PlaybackException.ERROR_CODE_DECODER_INIT_FAILED,PlaybackException.ERROR_CODE_DECODING_FAILED,PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED}){
            String text=PlaybackProblem.message(code,false).toLowerCase();assertFalse(text.contains("reconnect its folder"));assertFalse(text.contains("choose the folder"));
        }
    }
    @Test public void linkedFolderAccessHasAnActionableExplanation(){
        assertTrue(PlaybackProblem.message(PlaybackException.ERROR_CODE_IO_NO_PERMISSION,true).contains("Choose the folder again"));
    }
    @Test public void decoderAndAudioOutputRemainDistinct(){
        assertTrue(PlaybackProblem.message(PlaybackException.ERROR_CODE_DECODER_INIT_FAILED,false).contains("decoder"));
        assertTrue(PlaybackProblem.message(PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED,false).contains("output"));
    }
    @Test public void exactFailureAndNestedCauseAreRetained(){
        Exception root=new Exception("decoder rejected Opus"),wrapper=new Exception("Renderer error",root);
        String details=PlaybackProblem.detail("ERROR_CODE_DECODER_INIT_FAILED",wrapper);
        assertTrue(details.contains("ERROR_CODE_DECODER_INIT_FAILED"));assertTrue(details.contains("Renderer error"));assertTrue(details.contains("decoder rejected Opus"));
    }
    @Test public void diagnosticSizeIsBounded(){assertTrue(PlaybackProblem.detail("FAIL",new Exception("x".repeat(20000))).length()<=6000);}
}
