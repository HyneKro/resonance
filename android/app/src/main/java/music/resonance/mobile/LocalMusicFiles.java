package music.resonance.mobile;

import java.io.*;
import java.net.URI;
import java.util.*;

/** Resolves only app-owned downloads. Linked document URIs always keep their granted location. */
final class LocalMusicFiles {
    static File resolve(File music, String storedUri, String fileName, String videoId, boolean downloaded) {
        File stored=file(storedUri);
        if(readable(stored))return stored;
        if(!downloaded||storedUri.startsWith("content:"))return stored;
        try {
            File root=music.getCanonicalFile();
            File named=child(root,fileName);
            if(readable(named))return named;
            if(!videoId.matches("[A-Za-z0-9_-]{11}"))return stored;
            File[] candidates=root.listFiles(f->f.getName().matches(java.util.regex.Pattern.quote(videoId)+"\\.(?:opus|m4a|webm|ogg|mp3|aac|flac|wav)")&&readable(f));
            // A unique identity match is safe; ambiguous alternatives need a deliberate choice.
            if(candidates!=null&&candidates.length==1&&root.equals(candidates[0].getCanonicalFile().getParentFile()))return candidates[0];
        }catch(IOException ignored){}
        return stored;
    }
    static File file(String uri) {
        try {if(uri.startsWith("file:"))return new File(URI.create(uri));if(new File(uri).isAbsolute())return new File(uri);}catch(IllegalArgumentException ignored){}
        return null;
    }
    private static File child(File root,String name) throws IOException {
        if(name.isEmpty()||name.contains("/")||name.contains("\\"))return null;
        File child=new File(root,name).getCanonicalFile();return root.equals(child.getParentFile())?child:null;
    }
    static boolean readable(File file){return file!=null&&file.isFile()&&file.canRead()&&file.length()>0;}
}
