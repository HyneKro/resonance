package music.resonance.mobile;

import android.content.Context;
import android.net.Uri;
import androidx.documentfile.provider.DocumentFile;
import org.json.JSONObject;
import java.io.*;
import java.util.function.BooleanSupplier;

/** Creates a new document in the explicitly chosen tree; never overwrites an existing document. */
final class DownloadDestination {
    static DocumentFile folder(Context context,JSONObject destination) throws IOException {
        try {
            DocumentFile folder=DocumentFile.fromTreeUri(context,Uri.parse(destination.optString("uri")));
            if(folder==null||!folder.isDirectory()||!folder.canRead()||!folder.canWrite())throw new IOException("Choose the download folder again to allow saving music there.");
            return folder;
        } catch(SecurityException|IllegalArgumentException e){throw new IOException("Download folder access expired. Choose the folder again.",e);}
    }
    static DocumentFile copy(Context context,JSONObject destination,File source,String title,String video,BooleanSupplier cancelled) throws Exception {
        DocumentFile folder=folder(context,destination);
        String extension=source.getName().substring(source.getName().lastIndexOf('.')+1);
        String mime=extension.equals("m4a")?"audio/mp4":extension.equals("opus")||extension.equals("ogg")?"audio/ogg":extension.equals("mp3")?"audio/mpeg":"application/octet-stream";
        DocumentFile created=folder.createFile(mime,FileCopies.name(title,video,extension));
        if(created==null)throw new IOException("Android could not create a file in the download folder.");
        boolean complete=false;
        try {
            String checksum;
            try(InputStream in=new FileInputStream(source);OutputStream out=context.getContentResolver().openOutputStream(created.getUri(),"w")){
                if(out==null)throw new IOException("Download folder is not writable.");
                checksum=FileCopies.transfer(in,out,cancelled);
            }
            try(InputStream verify=context.getContentResolver().openInputStream(created.getUri())){
                if(verify==null||!checksum.equals(FileCopies.digest(verify,cancelled)))throw new IOException("Could not verify the saved song. The original download is kept for retry.");
            }
            complete=true;return created;
        }finally{if(!complete)created.delete();}
    }
}
