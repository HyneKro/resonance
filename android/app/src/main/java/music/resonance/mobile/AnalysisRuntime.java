package music.resonance.mobile;

import java.io.*;
import java.nio.charset.StandardCharsets;
import org.json.JSONObject;

/** The standalone analyzer needs the same shared libraries as the downloader. */
final class AnalysisRuntime {
    static final int REVISION=2;
    static String libraryPath(File noBackup,File nativeLibraries){
        File packages=new File(noBackup,"youtubedl-android/packages");
        return new File(packages,"python/usr/lib").getAbsolutePath()+File.pathSeparator+
            new File(packages,"ffmpeg/usr/lib").getAbsolutePath()+File.pathSeparator+
            new File(packages,"aria2c/usr/lib").getAbsolutePath()+File.pathSeparator+nativeLibraries.getAbsolutePath();
    }
    static String savedError(JSONObject error,String stamp){return error.optInt("engineRevision")==REVISION&&stamp.equals(error.optString("stamp"))?error.optString("message"):"";}
    static String failure(File log,int exitCode){
        String detail="";
        try(RandomAccessFile in=new RandomAccessFile(log,"r")){
            int size=(int)Math.min(2400,in.length());byte[] data=new byte[size];in.seek(in.length()-size);in.readFully(data);
            detail=new String(data,StandardCharsets.UTF_8).replaceAll("[\\p{Cntrl}&&[^\\n\\t]]","").trim();
        }catch(IOException ignored){}
        return "Measurement could not finish (engine "+exitCode+"). Playback is still available."+(detail.isEmpty()?"":"\n"+detail);
    }
}
