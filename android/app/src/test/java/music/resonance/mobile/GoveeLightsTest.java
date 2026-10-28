package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import java.nio.charset.StandardCharsets;
import static org.junit.Assert.*;
public class GoveeLightsTest {
    @Test public void privateAddressesOnly(){assertTrue(GoveeLights.privateIP("192.168.2.5"));assertTrue(GoveeLights.privateIP("172.31.2.5"));assertFalse(GoveeLights.privateIP("127.0.0.1"));assertFalse(GoveeLights.privateIP("8.8.8.8"));assertFalse(GoveeLights.privateIP("192.168.2.999"));}
    @Test public void clampsOptionsAndNeverRestoresEnabled(){JSONObject p=GoveeLights.options(Json.object("enabled",true,"brightness",9,"response",-2,"idle",3,"devices",new JSONArray().put(Json.object("id","bad"))));assertFalse(p.has("enabled"));assertEquals(1,p.optDouble("brightness"),0);assertEquals(0,p.optDouble("response"),0);assertEquals(0,p.optJSONArray("devices").length());}
    @Test public void discoveredAddressAndStatusAreBoundToSender()throws Exception {
        GoveeLights g=new GoveeLights(JSONObject::new,p->{});try{String id="00:11:22:33:44:55:66:77";
            g.receive(Json.object("msg",Json.object("cmd","scan","data",Json.object("device",id,"sku","H61D3","ip","8.8.8.8"))).toString().getBytes(StandardCharsets.UTF_8),"192.168.1.5");
            g.receive(Json.object("msg",Json.object("cmd","devStatus","data",Json.object("onOff",0,"brightness",70))).toString().getBytes(StandardCharsets.UTF_8),"192.168.1.5");
            JSONObject d=g.snapshot().optJSONArray("devices").optJSONObject(0);assertEquals("192.168.1.5",d.optString("ip"));assertFalse(d.optBoolean("on"));assertFalse(g.snapshot().optBoolean("enabled"));assertFalse(g.frame(new JSONArray()).optBoolean("enabled"));
            assertFalse(g.configure(Json.object("options",Json.object("devices",new JSONArray().put(Json.object("id",id,"selected",true))))).optBoolean("enabled"));
        }finally{g.close();}
    }
}
