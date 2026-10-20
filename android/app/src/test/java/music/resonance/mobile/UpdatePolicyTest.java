package music.resonance.mobile;
import org.junit.Test;
import org.json.JSONObject;
import static org.junit.Assert.*;
public class UpdatePolicyTest {
    @Test public void readyPackagesDoNotDisableChecks(){
        assertTrue(UpdatePolicy.canCheck("ready",false,false,1000,1001,true,false));
        assertTrue(UpdatePolicy.canCheck("ready",true,true,1000,1000+31*60000L,true,false));
        assertFalse(UpdatePolicy.canCheck("ready",true,true,1000,1001,true,false));
        assertFalse(UpdatePolicy.canCheck("ready",true,false,0,Long.MAX_VALUE,true,false));
    }
    @Test public void recoveryChecksAreBoundedAndActiveInstallationIsProtected(){
        assertTrue(UpdatePolicy.canCheck("error",true,true,0,6*60000L,true,true));
        assertFalse(UpdatePolicy.canCheck("error",true,true,0,1000,true,true));
        for(String phase:new String[]{"downloading","verifying","installing"})
            assertFalse(UpdatePolicy.canCheck(phase,false,true,0,Long.MAX_VALUE,true,false));
    }
    @Test public void newerReleasesSupersedeFailedPackagesWithoutDowngrades(){
        JSONObject old=Json.object("version","0.23.0-preview"),next=Json.object("version","0.23.1-preview");
        assertSame(next,UpdatePolicy.newest(old,next));assertSame(next,UpdatePolicy.newest(next,old));
        assertSame(next,UpdatePolicy.newest(next,null));
        assertTrue(UpdatePolicy.rejected(old,"0.23.0-preview"));assertFalse(UpdatePolicy.rejected(next,"0.23.0-preview"));
        assertFalse(UpdatePolicy.rejected(null,"0.23.0-preview"));
    }
}
