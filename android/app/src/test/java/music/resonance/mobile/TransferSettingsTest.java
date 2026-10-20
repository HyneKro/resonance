package music.resonance.mobile;
import org.json.*;
import org.junit.Test;
import static org.junit.Assert.*;

public class TransferSettingsTest {
    @Test public void lyricOffsetStampMatchesJavascriptAfterJsonRoundTrip() throws JSONException {
        JSONObject track=new JSONObject("{\"path\":\"content://music/one\",\"size\":500,\"modified\":1720000000000,\"duration\":180.0}");
        assertEquals("content://music/one|500|1720000000000|180",TransferSettings.lyricStamp(track));
        Json.put(track,"duration",180.25);
        assertEquals("content://music/one|500|1720000000000|180.25",TransferSettings.lyricStamp(track));
    }
    @Test public void missingStampFieldsStayEmptyAndMtimeIsAFallback() throws JSONException {
        assertEquals("|||",TransferSettings.lyricStamp(new JSONObject()));
        assertEquals("||12|",TransferSettings.lyricStamp(Json.object("modified",JSONObject.NULL,"mtime",12)));
    }
}
