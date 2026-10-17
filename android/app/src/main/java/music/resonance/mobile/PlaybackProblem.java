package music.resonance.mobile;

import androidx.media3.common.PlaybackException;
import java.util.*;

/** Keeps a codec/output failure distinct from a missing document permission. */
final class PlaybackProblem {
    static String message(int code, boolean linkedFolder) {
        switch(code){
            case PlaybackException.ERROR_CODE_IO_FILE_NOT_FOUND:
                return linkedFolder?"This song’s file is missing. Reconnect its folder, then try again.":"This download’s audio file could not be found. Open Playback details to check its saved location.";
            case PlaybackException.ERROR_CODE_IO_NO_PERMISSION:
                return linkedFolder?"Access to this music folder has expired. Choose the folder again.":"Android could not read this saved download. Open Playback details to check the file.";
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED:
            case PlaybackException.ERROR_CODE_PARSING_CONTAINER_UNSUPPORTED:
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_UNSUPPORTED:
            case PlaybackException.ERROR_CODE_DECODING_FORMAT_EXCEEDS_CAPABILITIES:
                return "This audio file could not be read as a supported recording. Open Playback details to check its format.";
            case PlaybackException.ERROR_CODE_DECODER_INIT_FAILED:
            case PlaybackException.ERROR_CODE_DECODING_FAILED:
                return "The phone’s audio decoder could not play this song. Try again; Playback details has the exact error.";
            case PlaybackException.ERROR_CODE_AUDIO_TRACK_INIT_FAILED:
            case PlaybackException.ERROR_CODE_AUDIO_TRACK_WRITE_FAILED:
                return "The audio output could not start. Reconnect your headphones or try the phone speaker, then retry.";
            default:return "Playback stopped. Try again, or open Playback details to see the cause.";
        }
    }
    static String detail(String code,Throwable error) {
        StringBuilder text=new StringBuilder(code);Set<Throwable> seen=Collections.newSetFromMap(new IdentityHashMap<>());
        for(Throwable cause=error;cause!=null&&seen.add(cause)&&seen.size()<=6;cause=cause.getCause()){
            text.append('\n').append(cause.getClass().getSimpleName()).append(": ").append(Objects.toString(cause.getMessage(),"No message"));
            if(text.length()>6000)break;
        }
        return text.substring(0,Math.min(6000,text.length()));
    }
}
