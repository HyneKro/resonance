package music.resonance.mobile;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import org.json.*;

/** User-selected text only. No audio decoding or I/O on the activity thread. */
final class LyricsFiles {
    static final int REQUEST=45;
    private final MainActivity activity;
    private CompletableFuture<JSONObject> pending;
    private String exportText;
    LyricsFiles(MainActivity activity){this.activity=activity;}
    JSONObject open(JSONObject data) throws Exception {
        CompletableFuture<JSONObject> task=new CompletableFuture<>();
        String text=data.has("text")?data.optString("text"):null;
        if(text!=null&&text.length()>256000)throw new IOException("Lyrics file is too large.");
        synchronized(this){if(pending!=null)throw new IOException("A lyrics file picker is already open.");pending=task;exportText=text;}
        ResonanceApp.instance.main.post(()->{
            try{
                Intent intent=new Intent(text==null?Intent.ACTION_OPEN_DOCUMENT:Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(text==null?"*/*":"application/json");
                if(text!=null)intent.putExtra(Intent.EXTRA_TITLE,"Resonance-lyrics.json");
                activity.startActivityForResult(intent,REQUEST);
            }catch(Exception e){task.completeExceptionally(e);}
        });
        try{return task.get(10,TimeUnit.MINUTES);}finally{synchronized(this){if(pending==task){pending=null;exportText=null;}}}
    }
    void result(int code,Intent intent){
        final CompletableFuture<JSONObject> task;final String text;
        synchronized(this){task=pending;text=exportText;}if(task==null)return;
        if(code!=Activity.RESULT_OK||intent==null||intent.getData()==null){task.complete(Json.object("cancelled",true));return;}
        Uri uri=intent.getData();
        ResonanceApp.instance.io.execute(()->{
            try{
                if(text!=null){try(OutputStream output=activity.getContentResolver().openOutputStream(uri,"wt")){if(output==null)throw new IOException("Cannot save lyrics here.");output.write(text.getBytes(StandardCharsets.UTF_8));}task.complete(Json.object("saved",true));}
                else{try(InputStream input=activity.getContentResolver().openInputStream(uri);ByteArrayOutputStream output=new ByteArrayOutputStream()){
                    if(input==null)throw new IOException("Cannot open this lyrics file.");byte[] buffer=new byte[8192];int n,total=0;
                    while((n=input.read(buffer))!=-1){if((total+=n)>256000)throw new IOException("Choose a lyrics file smaller than 256 KB.");output.write(buffer,0,n);}
                    task.complete(Json.object("text",output.toString(StandardCharsets.UTF_8.name())));
                }}
            }catch(Exception e){task.completeExceptionally(e);}
        });
    }
    synchronized void close(){if(pending!=null)pending.complete(Json.object("cancelled",true));}
}
