package music.resonance.mobile;

import androidx.media3.common.C;
import androidx.media3.common.Player;
import androidx.media3.common.Timeline;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.ShuffleOrder.DefaultShuffleOrder;
import java.util.*;
import org.json.JSONArray;

/** One native playback order for automatic transitions, transport controls and the queue UI. */
@androidx.annotation.OptIn(markerClass=androidx.media3.common.util.UnstableApi.class)
final class PlaybackQueue {
    static int[] shuffled(int count,int current,Random random){
        int[] order=new int[count];if(count==0)return order;
        current=Math.max(0,Math.min(current,count-1));order[0]=current;
        for(int i=0,j=1;i<count;i++)if(i!=current)order[j++]=i;
        // Keep the current song and its position; shuffle every other song exactly once.
        for(int i=count-1;i>1;i--){int j=1+random.nextInt(i),swap=order[i];order[i]=order[j];order[j]=swap;}
        // With three or more songs, enabling shuffle must not leave the same next song.
        if(count>2&&order[1]==(current+1)%count){int j=2+random.nextInt(count-2),swap=order[1];order[1]=order[j];order[j]=swap;}
        return order;
    }

    static void randomize(ExoPlayer player,Random random){
        player.setShuffleOrder(new DefaultShuffleOrder(shuffled(player.getMediaItemCount(),player.getCurrentMediaItemIndex(),random),random.nextLong()));
    }

    static void setShuffle(ExoPlayer player,boolean enabled,Random random){
        if(enabled&&!player.getShuffleModeEnabled()){
            randomize(player,random);
            // Enabling shuffle should progress through songs even after Repeat track was used.
            if(player.getRepeatMode()==Player.REPEAT_MODE_ONE)player.setRepeatMode(Player.REPEAT_MODE_ALL);
        }
        player.setShuffleModeEnabled(enabled);
    }

    static JSONArray order(Player player){
        JSONArray ids=new JSONArray();Timeline timeline=player.getCurrentTimeline();
        boolean shuffle=player.getShuffleModeEnabled();int index=timeline.getFirstWindowIndex(shuffle);
        for(int n=0;n<player.getMediaItemCount()&&index!=C.INDEX_UNSET;n++){
            ids.put(player.getMediaItemAt(index).mediaId);
            index=timeline.getNextWindowIndex(index,Player.REPEAT_MODE_OFF,shuffle);
        }
        return ids;
    }

    /** Validate saved IDs against the surviving library before restoring their order. */
    static int[] restore(JSONArray saved,JSONArray queue){
        if(saved==null||saved.length()!=queue.length())return null;
        Map<String,ArrayDeque<Integer>> indices=new HashMap<>();
        for(int i=0;i<queue.length();i++)indices.computeIfAbsent(queue.optString(i),key->new ArrayDeque<>()).add(i);
        int[] order=new int[saved.length()];
        for(int i=0;i<saved.length();i++){
            ArrayDeque<Integer> matches=indices.get(saved.optString(i));
            if(matches==null||matches.isEmpty())return null;order[i]=matches.removeFirst();
        }
        return order;
    }
}
