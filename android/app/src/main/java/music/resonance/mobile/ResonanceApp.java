package music.resonance.mobile;

import android.app.Application;
import android.os.Handler;
import android.os.Looper;
import java.util.concurrent.*;

public final class ResonanceApp extends Application {
    public static ResonanceApp instance;
    public LibraryStore library;
    public Research research;
    public Downloads downloads;
    public final ExecutorService io=Executors.newFixedThreadPool(3);
    public final ExecutorService bridge=Executors.newFixedThreadPool(2);
    public final Handler main=new Handler(Looper.getMainLooper());
    @Override public void onCreate(){super.onCreate();instance=this;library=new LibraryStore(this);research=new Research(this);downloads=new Downloads(this);}
    public <T> T onMain(Callable<T> action) throws Exception {
        if(Looper.myLooper()==Looper.getMainLooper())return action.call();
        FutureTask<T> task=new FutureTask<>(action);main.post(task);return task.get(12,TimeUnit.SECONDS);
    }
}
