package music.resonance.mobile;
import org.junit.Test;
import static org.junit.Assert.*;
public class LoudnessGateTest {
 @Test public void firstPlayWaitsThenResumesOnce(){LoudnessGate g=new LoudnessGate();assertTrue(g.request(true));assertTrue(g.waiting);assertTrue(g.ready());assertFalse(g.ready());assertFalse(g.request(false));}
 @Test public void pauseAndSelectionDiscardStaleResume(){LoudnessGate g=new LoudnessGate();g.request(true);g.cancel();assertFalse(g.ready());g.request(true);g.select();assertFalse(g.ready());assertFalse(g.waiting);}
 @Test public void originalLevelBypassLastsOnlyUntilTheNextSong(){LoudnessGate g=new LoudnessGate();g.request(true);assertTrue(g.original());assertFalse(g.request(true));g.select();assertTrue(g.request(true));}
}
