package music.resonance.mobile;

import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.ShuffleOrder;
import java.lang.reflect.Proxy;
import java.util.*;
import org.json.JSONArray;
import org.junit.Test;
import static org.junit.Assert.*;

public class PlaybackQueueTest {
    @Test public void shuffledCyclesVisitEverySongExactlyOnceAndChangeTheNextSong(){
        for(int count:new int[]{0,1,2,3,12,2526})for(int seed=0;seed<30;seed++){
            int current=count==0?0:seed%count;int[] indices=PlaybackQueue.shuffled(count,current,new Random(seed));
            ShuffleOrder order=new ShuffleOrder.DefaultShuffleOrder(indices,seed);
            assertEquals(count,order.getLength());boolean[] seen=new boolean[count];int at=order.getFirstIndex();
            if(count>0)assertEquals(current,at);
            if(count>2)assertNotEquals((current+1)%count,order.getNextIndex(current));
            int previous=C.INDEX_UNSET;
            for(int n=0;n<count;n++){
                assertTrue(at>=0&&at<count);assertFalse(seen[at]);seen[at]=true;
                assertEquals(previous,order.getPreviousIndex(at));previous=at;at=order.getNextIndex(at);
            }
            assertEquals(C.INDEX_UNSET,at);assertEquals(previous,order.getLastIndex());
        }
    }

    @Test public void toggleInstallsTheOrderInThePlayerWithoutSeekingOrReplacingMusic(){
        Harness h=new Harness(12,4);PlaybackQueue.setShuffle(h.player,true,new Random(42));
        assertTrue(h.shuffle);assertEquals(4,h.order.getFirstIndex());assertNotEquals(5,h.order.getNextIndex(4));
        ShuffleOrder original=h.order;PlaybackQueue.setShuffle(h.player,true,new Random(43));assertSame(original,h.order);
        PlaybackQueue.setShuffle(h.player,false,new Random(44));assertFalse(h.shuffle);assertSame(original,h.order);
        // Harness rejects unexpected methods, including seek/setMediaItems/prepare/play/pause.
    }

    @Test public void shuffleExitsRepeatOneButDisablingDoesNotChangeRepeat(){
        Harness h=new Harness(4,0);h.repeat=Player.REPEAT_MODE_ONE;
        PlaybackQueue.setShuffle(h.player,true,new Random(42));assertEquals(Player.REPEAT_MODE_ALL,h.repeat);
        h.repeat=Player.REPEAT_MODE_ONE;PlaybackQueue.setShuffle(h.player,false,new Random(42));assertEquals(Player.REPEAT_MODE_ONE,h.repeat);
    }

    @Test public void newQueueGetsAnOrderOfExactlyItsOwnLength(){
        Harness h=new Harness(2526,108);PlaybackQueue.setShuffle(h.player,true,new Random(1));
        h.count=7;h.current=3;PlaybackQueue.randomize(h.player,new Random(2));
        assertEquals(7,h.order.getLength());assertEquals(3,h.order.getFirstIndex());assertTrue(h.shuffle);
    }

    @Test public void savedOrderRestoresAndRejectsMissingOrRepeatedTracks(){
        JSONArray queue=new JSONArray(List.of("a","b","c","d"));
        assertArrayEquals(new int[]{2,0,3,1},PlaybackQueue.restore(new JSONArray(List.of("c","a","d","b")),queue));
        assertNull(PlaybackQueue.restore(null,queue));
        assertNull(PlaybackQueue.restore(new JSONArray(List.of("c","a","d")),queue));
        assertNull(PlaybackQueue.restore(new JSONArray(List.of("c","a","x","b")),queue));
        assertNull(PlaybackQueue.restore(new JSONArray(List.of("c","a","c","b")),queue));
        assertArrayEquals(new int[]{0,2,1},PlaybackQueue.restore(new JSONArray(List.of("a","a","b")),new JSONArray(List.of("a","b","a"))));
    }

    private static final class Harness {
        int count,current,repeat=Player.REPEAT_MODE_ALL;boolean shuffle;ShuffleOrder order;
        final ExoPlayer player=(ExoPlayer)Proxy.newProxyInstance(ExoPlayer.class.getClassLoader(),new Class<?>[]{ExoPlayer.class},(proxy,method,args)->{
            switch(method.getName()){
                case "getMediaItemCount":return count;
                case "getCurrentMediaItemIndex":return current;
                case "getShuffleModeEnabled":return shuffle;
                case "getRepeatMode":return repeat;
                case "setRepeatMode":repeat=(int)args[0];return null;
                case "setShuffleModeEnabled":shuffle=(boolean)args[0];return null;
                case "setShuffleOrder":order=(ShuffleOrder)args[0];return null;
                default:throw new AssertionError("Unexpected player mutation/query: "+method.getName());
            }
        });
        Harness(int count,int current){this.count=count;this.current=current;}
    }
}
