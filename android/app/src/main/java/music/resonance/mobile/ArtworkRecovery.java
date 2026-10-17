package music.resonance.mobile;

import java.io.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

/** Recover only requested covers, off WebView's request threads, within the cache budget. */
final class ArtworkRecovery implements AutoCloseable {
    interface Loader { void load(String id) throws Exception; }
    private final File directory;private final Loader loader;
    private final ThreadPoolExecutor worker=new ThreadPoolExecutor(2,2,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(64));
    private final Set<String> pending=new HashSet<>();
    private final Map<String,Long> failed=new LinkedHashMap<>();
    final AtomicLong revision=new AtomicLong();
    ArtworkRecovery(File directory,Loader loader){this.directory=directory;this.loader=loader;worker.allowCoreThreadTimeOut(true);}
    synchronized InputStream open(String name){
        if(!name.matches("[a-f0-9]{24}\\.jpg"))return null;
        File file=new File(directory,name);
        try{InputStream input=new FileInputStream(file);file.setLastModified(System.currentTimeMillis());return input;}catch(IOException ignored){}
        if(pending.contains(name)||System.currentTimeMillis()-failed.getOrDefault(name,0L)<300_000)return null;
        pending.add(name);
        try{worker.execute(()->{
            boolean success=false;
            try{loader.load(name.substring(0,24));success=file.isFile()&&file.length()>0;}catch(Exception ignored){}
            synchronized(this){pending.remove(name);if(success){failed.remove(name);revision.incrementAndGet();}else{failed.put(name,System.currentTimeMillis());while(failed.size()>512)failed.remove(failed.keySet().iterator().next());}}
        });}catch(RejectedExecutionException e){pending.remove(name);}
        return null;
    }
    synchronized void retry(){failed.clear();revision.incrementAndGet();}
    public void close(){worker.shutdownNow();}
}
