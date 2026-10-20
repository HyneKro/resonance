package music.resonance.mobile;

import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Supplier;

/** A slow catalogue/analysis read must never make the media-session thread wait. */
final class PlaybackSnapshot<T> {
    private final Executor worker;
    private final AtomicBoolean pending=new AtomicBoolean();
    private volatile Entry<T> latest;
    private static final class Entry<T>{final String key;final T value;Entry(String key,T value){this.key=key;this.value=value;}}
    PlaybackSnapshot(Executor worker){this.worker=worker;}
    T get(String key){Entry<T> value=latest;return value!=null&&value.key.equals(key)?value.value:null;}
    void refresh(String key,Supplier<T> read){
        if(!pending.compareAndSet(false,true))return;
        try{worker.execute(()->{try{T value=read.get();latest=new Entry<>(key,value);}catch(RuntimeException ignored){/* Keep the last usable snapshot; the next refresh can retry. */}finally{pending.set(false);}});}
        catch(RuntimeException error){pending.set(false);throw error;}
    }
}
